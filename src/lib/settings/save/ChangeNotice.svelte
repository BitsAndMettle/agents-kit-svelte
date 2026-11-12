<!--
	@component
	The inline result of an instant change or a finished action: a bold lead, a detail line, Undo,
	an optional second action and Dismiss. Undo is owned by a token: once the app's current token
	differs, this notice can no longer undo, says why, and cannot reverse a newer change. It never
	hides itself. Without JavaScript, Undo posts `intent=undo` and `token` to `undoAction`.
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

<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Undo2 } from '@lucide/svelte';
	import { cn } from '../../ui/cn';
	import type { UiTone } from '../../ui/styles';
	import { isThenable } from '../../core/promise';
	import { Alert } from '../../primitives/display';
	import { Button } from '../../primitives/actions';
	import { getSettingsDraft } from '../shared/context';
	import { actionButtonProps } from '../shared/recipes';
	import type { SettingsAction, SettingsHandler, SettingsResult } from '../shared/types';
	import { isSuperseded } from './helpers';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'hidden'> {
		/** What happened, in bold ("Reduce motion turned on"). */
		lead: string | Snippet;
		/** A line of detail under the lead. */
		detail?: string;
		/** Colour of the notice. Default `success`. */
		tone?: UiTone;
		/** The token of the change this notice can undo (an `InstantSetting.undoToken`, or your own). */
		undoToken?: string | number;
		/** The token that owns the undo point now. When it differs (or is `null`: nothing to undo), Undo is unavailable. */
		currentToken?: string | number | null;
		/** Undoes the change, given `undoToken`. A promise makes Undo load; `{ error }` or a rejection shows a failure. */
		onUndo?: SettingsHandler<[string | number | undefined]>;
		/** Where Undo posts without JavaScript: `intent=undo`, `token` and `hidden`. Inside a SettingsForm (no nested forms) only `onUndo` works. */
		undoAction?: string;
		/** Extra values for that post, rendered as hidden inputs. */
		hidden?: Record<string, string>;
		/** A second action (a link, a callback or a form intent), e.g. "Reset to default". */
		secondary?: SettingsAction;
		/** Shows a dismiss button that calls this. The notice does not remove itself: stop rendering it. */
		onDismiss?: () => void;
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

	let undoing = $state(false);
	let didUndo = $state(false);
	let failure = $state<string | null>(null);
	let secondaryBusy = $state(false);

	const superseded = $derived(isSuperseded(undoToken, currentToken));
	const finished = $derived(undone || didUndo);
	const canPost = $derived(undoAction !== undefined && !insideForm);
	const offersUndo = $derived(!finished && (onUndo !== undefined || canPost));
	const status = $derived(undoing ? text.undoing : finished ? text.undone : '');
	const secondaryProps = $derived(secondary ? actionButtonProps(secondary, secondaryReasonId) : undefined);

	async function undo(event: Event): Promise<void> {
		if (!onUndo) return;
		event.preventDefault();
		if (undoing || superseded || finished) return;
		failure = null;
		undoing = true;
		// Let a cleared failure reach the page first, so the same failure is announced again.
		await tick();
		let result: void | SettingsResult;
		try {
			const outcome = onUndo(undoToken);
			result = isThenable(outcome) ? await outcome : outcome;
		} catch {
			result = { error: text.undoFailed };
		}
		undoing = false;
		const message = result && (result.error || Object.values(result.errors ?? {}).find(Boolean) || result.conflict?.message);
		if (message || (result && result.conflict)) failure = message || text.undoFailed;
		else didUndo = true;
	}

	async function runSecondary(): Promise<void> {
		const select = secondary?.onSelect;
		if (!select || secondaryBusy) return;
		const outcome = select();
		if (!isThenable(outcome)) return;
		secondaryBusy = true;
		try {
			await outcome;
		} catch {
			failure = text.actionFailed;
		} finally {
			secondaryBusy = false;
		}
	}
</script>

{#snippet undoButton()}
	<Button
		type={canPost ? 'submit' : 'button'}
		size="sm"
		loading={undoing}
		softDisabled={superseded}
		aria-describedby={superseded ? reasonId : undefined}
		onclick={onUndo && !canPost ? undo : undefined}
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
		<Button {...secondaryProps} size="sm" variant={secondary.tone ? secondaryProps.variant : 'ghost'} loading={secondaryBusy} onclick={secondary.onSelect ? runSecondary : undefined}>{secondary.label}</Button>
	{/if}
{/snippet}

<div {...rest} data-placement={placement} class={cn('min-w-0', placement === 'sticky' && 'sticky bottom-3 z-10', className)}>
	<Alert {tone} live="polite" {onDismiss} dismissLabel={text.dismiss} actions={offersUndo || secondary ? actions : undefined} class={placement === 'sticky' ? 'ak-shadow-soft' : undefined}>
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
