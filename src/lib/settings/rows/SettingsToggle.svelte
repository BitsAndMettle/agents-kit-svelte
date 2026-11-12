<script lang="ts" module>
	/** Words of a SettingsToggle. */
	export interface SettingsToggleLabels {
		/** State text and change-summary word for on. */
		on: string;
		/** State text and change-summary word for off. */
		off: string;
		/** The no-JavaScript submit button. */
		apply: string;
		saving: string;
		saved: string;
		/** Shown after a failed change, which has already been reverted. */
		failed: string;
		retry: string;
		undo: string;
		/** Shown after Undo has gone through. */
		undone: string;
	}
</script>

<script lang="ts">
	import { tick, untrack, type Snippet } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { Button } from '../../primitives/actions';
	import { Switch } from '../../primitives/form';
	import type { FieldControlAttrs } from '../../primitives/form/field';
	import { cn } from '../../ui/cn';
	import { getSettingsDraft, getSettingsScope } from '../shared/context';
	import { isDev } from '../shared/env';
	import { restoreFocus } from '../shared/focus';
	import { InstantSetting } from '../shared/instant.svelte';
	import { pickLock } from '../shared/lock';
	import { ReadyGate } from '../shared/ready.svelte';
	import type { SettingLock, SettingsHandler } from '../shared/types';
	import { flippedByPerson, focusLost } from './helpers';
	import type { LockReasonLabels } from './LockReason.svelte';
	import SettingsRow from './SettingsRow.svelte';

	export interface Props extends Omit<HTMLInputAttributes, 'class' | 'children' | 'type' | 'checked' | 'defaultChecked' | 'value' | 'role' | 'size' | 'hidden'> {
		/** Names the setting; the switch's one label. */
		label: string;
		/** Help text under the label; describes the switch. */
		description?: string | Snippet;
		/** On or off: the saved value. Bindable; it only ever takes saved values, never an optimistic one. */
		checked?: boolean;
		/** Starting state when `checked` is not given. Inside a SettingsForm, what Discard restores. */
		defaultChecked?: boolean;
		/** Form name. It posts `false` (hidden) then `true` when on: read it with `readBoolean`. */
		name?: string;
		/** Instant mode: called with the new state. Return `{error}` or reject to revert; a promise shows Saving until it settles. Ignored inside a SettingsForm. */
		onCommit?: SettingsHandler<[boolean]>;
		/** Called with the state to go back to when the person chooses Undo. Default: `onCommit`. */
		onUndo?: SettingsHandler<[boolean]>;
		/** Offer Undo after a change. Default true. */
		undoable?: boolean;
		/** No-JavaScript path: the toggle renders its own `<form method="post">` to this URL with an Apply button (hidden once the page is interactive and `onCommit` is set). A switch flipped before the page was interactive is committed through `onCommit` once it is. Dropped inside a SettingsForm. */
		action?: string;
		/** Extra hidden fields for that form (an id, a revision). */
		hidden?: Record<string, string>;
		/** Shows "On"/"Off" beside the switch (or your words). In forced-colors mode the state text always shows, since the switch's thumb can't be seen there. */
		stateText?: boolean | { on: string; off: string };
		/** Locks the toggle. A `badge` ("Always on") replaces the switch on screen; a disabled switch stays for assistive technology. */
		lock?: SettingLock;
		/** Id of a reason shown elsewhere that describes this toggle's own `lock`. A stronger section or page lock is described by its own reason. */
		reasonId?: string;
		/** Request flow for the toggle's own lock reason. */
		onRequest?: SettingsHandler<[]>;
		/** No-JavaScript path for that request: LockReason's `requestAction`. */
		requestAction?: string;
		/** An icon before the label. */
		leading?: Snippet;
		/** Overrides readiness (default: true once mounted). Before it, an instant toggle with no `action` and no form is disabled, since nothing could happen. */
		ready?: boolean;
		/** The `<input>`. Bindable. */
		ref?: HTMLInputElement | null;
		labels?: Partial<SettingsToggleLabels>;
		lockLabels?: Partial<LockReasonLabels>;
		/** Classes for the row (`<li>`). Attributes go on the `<input>`. */
		class?: string;
	}

	let {
		label,
		description,
		checked = $bindable(),
		defaultChecked,
		name,
		onCommit,
		onUndo,
		undoable = true,
		action,
		hidden,
		stateText = false,
		lock,
		reasonId,
		onRequest,
		requestAction,
		leading,
		ready,
		ref = $bindable(null),
		labels = {},
		lockLabels,
		id,
		disabled,
		class: className = '',
		...rest
	}: Props = $props();

	const draft = getSettingsDraft();
	const scope = getSettingsScope();
	const gate = new ReadyGate(() => ready ?? (scope ? scope.ready() : undefined));

	const words = $derived<SettingsToggleLabels>({
		on: 'On',
		off: 'Off',
		apply: 'Apply',
		saving: 'Saving…',
		saved: 'Saved',
		failed: "Couldn't save. Changed back.",
		retry: 'Retry',
		undo: 'Undo',
		undone: 'Changed back',
		...labels
	});
	/** The row draws the label, so the Switch gets none: drop its label column and gap, or the switch ends short of every other control's right edge. */
	const SWITCH_ONLY = 'grid-cols-[auto] gap-x-0';
	const stateWords = $derived(typeof stateText === 'object' ? stateText : { on: words.on, off: words.off });

	/** The value the toggle starts from: the saved value. */
	const start = untrack(() => checked ?? defaultChecked ?? false);

	if (draft && isDev() && untrack(() => onCommit)) {
		console.warn(`SettingsToggle "${untrack(() => label)}": onCommit is ignored inside a SettingsForm; the form saves it.`);
	}

	const instant = draft
		? undefined
		: new InstantSetting<boolean>({
				value: () => checked ?? defaultChecked ?? false,
				commit: () => onCommit,
				undo: () => onUndo,
				undoable: () => undoable
			});

	// Mirror only saved values into the bindable prop, never the optimistic one.
	$effect(() => {
		if (!instant) return;
		const saved = instant.committed;
		untrack(() => {
			if (checked !== undefined && checked !== saved) checked = saved;
		});
	});

	// A switch flipped before hydration (the no-JS form makes it live early) keeps its new state in
	// the DOM, but nothing saw the change: commit it once, as soon as the input is bound. Only a
	// person's flip counts. On the instant switch `autocomplete="off"` stops the browser restoring an
	// old state on Back or reload, and `flippedByPerson` checks the browser saw a real activation, so
	// restored state never reaches `onCommit` with nobody touching the page. A staged switch keeps the
	// browser's restore, like every other control in a SettingsForm: nothing commits until Save.
	let reconciled = false;
	$effect(() => {
		const node = ref;
		if (reconciled || !node || !instant) return;
		reconciled = true;
		untrack(() => {
			if (node.checked === instant.current) return;
			if (flippedByPerson(node)) change(node.checked);
			else node.checked = instant.current;
		});
	});

	const effectiveLock = $derived(pickLock(lock, scope?.lock?.lock));
	const locked = $derived(Boolean(effectiveLock));
	const current = $derived(instant ? instant.current : start);
	const ownForm = $derived(!draft && action !== undefined && !locked);
	const notReady = $derived(!draft && action === undefined && !gate.current);
	const showApply = $derived(ownForm && !(gate.current && onCommit));

	let undoing = $state(false);
	/** Without onCommit a change only applies here (the Apply post saves it), so no saving state is shown. */
	const committing = $derived(Boolean(instant && onCommit));
	const status = $derived(committing ? instant?.status : undefined);
	const errorText = $derived(committing && instant?.status === 'error' ? (instant.error ?? words.failed) : undefined);
	const statusText = $derived(undoing && status === 'saved' ? words.undone : undefined);

	function change(next: boolean): void {
		if (!instant) return;
		undoing = false;
		void instant.set(next);
	}

	/** Undo and Retry leave the page once used: when focus went with them, it moves to the switch. */
	async function keepFocus(button: HTMLElement): Promise<void> {
		await tick();
		if (!button.isConnected && focusLost()) restoreFocus(ref);
	}

	async function undo(event: MouseEvent): Promise<void> {
		if (!instant) return;
		const button = event.currentTarget as HTMLElement;
		undoing = true;
		const pending = instant.undo();
		void keepFocus(button);
		const done = await pending;
		if (!done) undoing = false;
		void keepFocus(button);
	}

	async function retry(event: MouseEvent): Promise<void> {
		if (!instant) return;
		const button = event.currentTarget as HTMLElement;
		const pending = instant.retry();
		void keepFocus(button);
		await pending;
		void keepFocus(button);
	}

	function submit(event: SubmitEvent): void {
		// With a handler the change is already committed; the native post is the no-JS path only.
		// Apply is hidden then, but the app may still submit the form (requestSubmit, a stray Enter).
		if (onCommit && gate.current) event.preventDefault();
	}
</script>

{#snippet switchControl()}
	<span class="group/toggle inline-flex items-center gap-2">
		<!-- Forced colors paint the thumb like the track, so on and off look alike: the state text then always shows. -->
		<span aria-hidden="true" data-state-text class={cn('min-w-[2ch] text-right text-xs text-fg-light', !stateText && 'hidden forced-colors:inline')}>
			<span class="hidden group-has-[input:checked]/toggle:inline">{stateWords.on}</span><span class="group-has-[input:checked]/toggle:hidden">{stateWords.off}</span>
		</span>
		{#if draft}
			<Switch {...rest} bind:ref {name} value="true" defaultChecked={start} disabled={disabled || undefined} class={SWITCH_ONLY} />
		{:else}
			<Switch autocomplete="off" {...rest} bind:ref {name} value="true" checked={current} disabled={disabled || notReady || undefined} onCheckedChange={change} class={SWITCH_ONLY} />
		{/if}
	</span>
{/snippet}

{#snippet control(attrs: FieldControlAttrs)}
	{#if effectiveLock?.badge}
		<!-- A badge ("Always on") stands in for the switch: the row hides this disabled input visually and draws the badge, so assistive technology still meets the switch and its state. -->
		<input {...rest} {...attrs} bind:this={ref} type="checkbox" role="switch" checked={current} disabled autocomplete="off" />
	{:else if ownForm}
		<form method="post" {action} onsubmit={submit} class="flex items-center gap-2">
			{#each Object.entries(hidden ?? {}) as [key, value] (key)}<input type="hidden" name={key} {value} />{/each}
			{#if name}<input type="hidden" {name} value="false" />{/if}
			{@render switchControl()}
			{#if showApply}<Button type="submit" size="xs" variant="secondary">{words.apply}</Button>{/if}
		</form>
	{:else}
		{#if draft && name}<input type="hidden" {name} value="false" disabled={locked || disabled || undefined} />{/if}
		{@render switchControl()}
	{/if}
{/snippet}

{#snippet feedback()}
	{#if instant && status === 'error'}
		<Button size="xs" variant="secondary" onclick={retry}>{words.retry}<span class="sr-only"> {label}</span></Button>
	{:else if committing && instant?.canUndo && !locked}
		<Button size="xs" variant="ghost" onclick={undo}>{words.undo}<span class="sr-only"> {label}</span></Button>
	{/if}
{/snippet}

<SettingsRow
	{label}
	{description}
	{leading}
	name={draft ? name : undefined}
	format={(raw) => (raw && raw !== 'false' ? stateWords.on : stateWords.off)}
	controlId={id ?? undefined}
	layout="inline"
	{control}
	{feedback}
	{lock}
	{reasonId}
	{onRequest}
	{requestAction}
	{lockLabels}
	{status}
	error={errorText}
	{statusText}
	statusWords={[words.undone]}
	labels={{ saving: words.saving, saved: words.saved }}
	class={cn('min-w-0', className)}
/>
