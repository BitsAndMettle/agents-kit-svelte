<!--
	@component
	The inline result of an instant change or a finished action: a bold lead, a detail line, Undo,
	an optional second action and Dismiss. Undo is owned by a token: once the app's current token
	differs, this notice can no longer undo, says why, and cannot reverse a newer change. It never
	hides itself. Without JavaScript, Undo posts `intent=undo` and `token` to `undoAction`. A lock
	covering it (a SettingsPage scope or SettingsSection lock) disables Undo and the second action,
	describes them with the lock's reason, and never calls `onUndo` or `onSelect` then.
-->
<script lang="ts" module>
	/** Every word ChangeNotice shows or announces. */
	export interface ChangeNoticeLabels {
		undo: string;
		/** Announced while an undo runs. */
		undoing: string;
		/** Shown after an undo succeeded. */
		undone: string;
		/** Shown when an undo failed without a message of its own. */
		undoFailed: string;
		/** Why Undo is unavailable once a newer change owns the undo point. */
		superseded: string;
		/** Shown when the second action fails without a message of its own. */
		actionFailed: string;
		dismiss: string;
	}
</script>

<script lang="ts" generics="Token extends string | number = string | number">
	import { tick, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Undo2 } from '@lucide/svelte';
	import { cn } from '../../ui/cn';
	import type { UiTone } from '../../ui/styles';
	import { isThenable } from '../../core/promise';
	import { Alert } from '../../primitives/display';
	import { Button } from '../../primitives/actions';
	import { getSettingsDraft, getSettingsScope } from '../shared/context';
	import { ReadyGate } from '../shared/ready.svelte';
	import { nextFocusAfterRemoval, restoreFocus } from '../shared/focus';
	import { lockAttrs } from '../shared/lock';
	import { actionButtonProps } from '../shared/recipes';
	import type { SettingsAction, SettingsHandler } from '../shared/types';
	import { readResult } from '../shared/undo';
	import { isSuperseded } from './helpers';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'hidden'> {
		/** What happened, in bold ("Reduce motion turned on"). */
		lead: string | Snippet;
		/** A line of detail under the lead. */
		detail?: string;
		/** Colour of the notice. Default `success`. */
		tone?: UiTone;
		/** The token of the change this notice can undo (an `InstantSetting.undoToken`, or your own). */
		undoToken?: Token;
		/** The token that owns the undo point now. When it differs (or is `null`: nothing to undo), Undo is unavailable. */
		currentToken?: Token | null;
		/** Undoes the change, given `undoToken`. A promise makes Undo load; `{ error }`, `{ errors }`, `{ conflict }` or a rejection shows a failure. */
		onUndo?: SettingsHandler<[Token | undefined]>;
		/** Where Undo posts without JavaScript: `intent=undo`, `token` and `hidden`. Inside a SettingsForm (no nested forms) only `onUndo` works. */
		undoAction?: string;
		/** Extra values for that post, rendered as hidden inputs. */
		hidden?: Record<string, string>;
		/** A second action (a link, a callback or a form intent), e.g. "Reset to default". An `onSelect` that returns (or resolves to) `{ error }` shows that failure. */
		secondary?: SettingsAction;
		/** Shows a dismiss button that calls this. The notice does not remove itself: stop rendering it. */
		onDismiss?: () => void;
		/**
		 * Where focus goes once Dismiss removed the notice. Default: the next notice beside it, else
		 * the nearest control before it, else the one after it, preferring ones in its own page pane (a SettingsLayout page, else `main`) over a rail beside it.
		 */
		refocus?: () => HTMLElement | string | null | undefined;
		/** `inline` sits where it is; `sticky` sticks to the bottom of the scrolling area. */
		placement?: 'inline' | 'sticky';
		/** Set when the app already undid the change (for example after a native post came back). */
		undone?: boolean;
		labels?: Partial<ChangeNoticeLabels>;
		class?: string;
	}

	let {
		lead,
		detail,
		tone = 'success',
		undoToken,
		currentToken,
		onUndo,
		undoAction,
		hidden,
		secondary,
		onDismiss,
		refocus,
		placement = 'inline',
		undone = false,
		labels,
		class: className = '',
		...rest
	}: Props = $props();

	const text = $derived<ChangeNoticeLabels>({
		undo: 'Undo',
		undoing: 'Undoing…',
		undone: 'Undone. The change was reversed.',
		undoFailed: "Couldn't undo. Nothing changed.",
		superseded: 'A newer change replaced this one, so it can no longer be undone here.',
		actionFailed: 'That did not work. Try again.',
		dismiss: 'Dismiss',
		...labels
	});

	const id = $props.id();
	const reasonId = `${id}-superseded`;
	const secondaryReasonId = `${id}-secondary`;

	/** Inside a SettingsForm the notice must not render a form of its own. */
	const insideForm = getSettingsDraft() !== undefined;
	/** A lock covering the notice: Undo and the second action are off, described by its reason. */
	const scope = getSettingsScope();
	const lock = $derived(scope?.lock);
	const locked = $derived(lockAttrs(lock?.lock, lock?.reasonId));
	/** Undo without a post, and a callback action, only work once the page is ready. */
	const ready = new ReadyGate(() => scope?.ready());

	let root = $state<HTMLDivElement | null>(null);
	let undoing = $state(false);
	let didUndo = $state(false);
	let failure = $state<string | null>(null);
	let secondaryBusy = $state(false);

	// An undo in flight or done may itself move the app's undo point: that is not a newer change.
	const superseded = $derived(!undoing && !didUndo && !undone && isSuperseded(undoToken, currentToken));
	const finished = $derived(undone || didUndo);
	const canPost = $derived(undoAction !== undefined && !insideForm);
	const offersUndo = $derived(!finished && (onUndo !== undefined || canPost));
	const status = $derived(undoing ? text.undoing : finished ? text.undone : '');
	const secondaryProps = $derived(secondary ? actionButtonProps(secondary, secondaryReasonId, { ready: ready.current }) : undefined);

	/** The failure a callback reported, as one sentence (`fallback` when it gave no text); undefined on success. */
	function failureOf(result: unknown, fallback: string): string | undefined {
		const outcome = readResult(result);
		return outcome.ok ? undefined : (outcome.error ?? fallback);
	}

	async function undo(event: Event): Promise<void> {
		if (!onUndo) return;
		event.preventDefault();
		if (lock || undoing || superseded || finished) return;
		const startedInside = root?.contains(document.activeElement) ?? false;
		failure = null;
		undoing = true;
		// Let a cleared failure reach the page first, so the same failure is announced again.
		await tick();
		let message: string | undefined;
		try {
			const outcome = onUndo(undoToken);
			message = failureOf(isThenable(outcome) ? await outcome : outcome, text.undoFailed);
		} catch {
			message = text.undoFailed;
		}
		undoing = false;
		if (message) {
			failure = message;
			return;
		}
		didUndo = true;
		await tick();
		// Undo is gone now (the app may already have removed it): keep focus on the notice, which says it was undone.
		const active = document.activeElement;
		if (startedInside && root?.isConnected && (!active || active === document.body)) root.focus();
	}

	/** Focusable controls, in page order, for where focus goes once the notice is gone. */
	const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

	async function dismiss(): Promise<void> {
		const node = root;
		const hadFocus = node?.contains(document.activeElement) ?? false;
		const parent = node?.parentElement ?? null;
		const index = parent && node ? Array.prototype.indexOf.call(parent.children, node) : -1;
		/** The nearest control before and after the notice: in its own page pane first, then anywhere. */
		const near = { before: null as HTMLElement | null, after: null as HTMLElement | null };
		const inPane = { before: null as HTMLElement | null, after: null as HTMLElement | null };
		if (hadFocus && node) {
			// The settings page beside a rail (SettingsLayout), else the page's main region: a control
			// outside it (the rail's search or links) is used only when the pane has none.
			const pane = node.closest('[data-settings-page], main, [role="main"]');
			for (const candidate of document.querySelectorAll<HTMLElement>(FOCUSABLE)) {
				if (node.contains(candidate) || candidate.checkVisibility?.({ visibilityProperty: true }) === false) continue;
				const side = candidate.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING ? 'before' : 'after';
				for (const found of pane && !pane.contains(candidate) ? [near] : [near, inPane]) {
					if (side === 'before') found.before = candidate;
					else found.after ??= candidate;
				}
			}
		}
		onDismiss?.();
		if (!hadFocus) return;
		await tick();
		const active = document.activeElement;
		if (node?.isConnected || (active && active !== document.body)) return;
		restoreFocus(refocus?.(), parent?.isConnected ? nextFocusAfterRemoval(parent, index) : null, inPane.before, inPane.after, near.before, near.after);
	}

	async function runSecondary(): Promise<void> {
		const select = secondary?.onSelect;
		if (!select || secondaryBusy || lock) return;
		failure = null;
		let message: string | undefined;
		try {
			const outcome = select();
			if (isThenable(outcome)) {
				secondaryBusy = true;
				// Let a cleared failure reach the page first, so the same failure is announced again.
				await tick();
				message = failureOf(await outcome, text.actionFailed);
			} else message = failureOf(outcome, text.actionFailed);
		} catch {
			message = text.actionFailed;
		} finally {
			secondaryBusy = false;
		}
		if (message) failure = message;
	}
</script>

{#snippet undoButton()}
	<Button
		type={canPost ? 'submit' : 'button'}
		size="sm"
		loading={undoing}
		softDisabled={superseded || (!canPost && !ready.current)}
		aria-describedby={superseded ? reasonId : undefined}
		onclick={onUndo && !canPost ? undo : undefined}
		{...locked}
	>
		{#snippet leading()}<Undo2 aria-hidden="true" />{/snippet}
		{text.undo}
	</Button>
{/snippet}

{#snippet actions()}
	{#if offersUndo}
		{#if canPost}
			<form method="post" action={undoAction} onsubmit={onUndo ? undo : undefined} class="contents">
				<input type="hidden" name="intent" value="undo" />
				{#if undoToken !== undefined}<input type="hidden" name="token" value={String(undoToken)} />{/if}
				{#each Object.entries(hidden ?? {}) as [name, value] (name)}
					<input type="hidden" {name} {value} />
				{/each}
				{@render undoButton()}
			</form>
		{:else}
			{@render undoButton()}
		{/if}
	{/if}
	{#if secondary && secondaryProps}
		<Button {...secondaryProps} size="sm" variant={secondary.tone ? secondaryProps.variant : 'ghost'} loading={secondaryBusy} onclick={secondary.onSelect ? runSecondary : undefined} {...locked}>{secondary.label}</Button>
	{/if}
{/snippet}

<!-- Takes focus (tabindex -1) when Undo goes away under it. -->
<div {...rest} bind:this={root} tabindex="-1" data-placement={placement} class={cn('min-w-0 rounded-card focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40', placement === 'sticky' && 'sticky bottom-3 z-10', className)}>
	<Alert {tone} live="polite" onDismiss={onDismiss ? dismiss : undefined} dismissLabel={text.dismiss} actions={offersUndo || secondary ? actions : undefined} class={placement === 'sticky' ? 'ak-shadow-soft' : undefined}>
		<p class="m-0 font-semibold text-fg-main">
			{#if typeof lead === 'string'}{lead}{:else}{@render lead()}{/if}
		</p>
		{#if detail}<p class="m-0 mt-0.5 text-fg-main/80">{detail}</p>{/if}
		<!-- Inside the notice's polite live region, so a change of state is announced. -->
		<p class="m-0 text-xs font-medium text-fg-main">{status}</p>
		{#if failure}
			<p role="alert" class="m-0 mt-1 text-xs font-medium text-status-danger">{failure}</p>
		{/if}
		{#if superseded && offersUndo}
			<p id={reasonId} class="m-0 mt-1 text-xs text-fg-light">{text.superseded}</p>
		{/if}
		{#if secondary?.unavailable}
			<p id={secondaryReasonId} class="m-0 mt-1 text-xs text-fg-light">{secondary.unavailable}</p>
		{/if}
	</Alert>
</div>
