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
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { Button } from '../../primitives/actions';
	import { Badge } from '../../primitives/display';
	import { Switch } from '../../primitives/form';
	import type { FieldControlAttrs } from '../../primitives/form/field';
	import { cn } from '../../ui/cn';
	import { getSettingsDraft, getSettingsScope } from '../shared/context';
	import { InstantSetting } from '../shared/instant.svelte';
	import { pickLock } from '../shared/lock';
	import { ReadyGate } from '../shared/ready.svelte';
	import type { SettingLock, SettingsHandler } from '../shared/types';
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
		/** No-JavaScript path: the toggle renders its own `<form method="post">` to this URL with an Apply button (hidden once the page is interactive and `onCommit` is set). Dropped inside a SettingsForm. */
		action?: string;
		/** Extra hidden fields for that form (an id, a revision). */
		hidden?: Record<string, string>;
		/** Shows "On"/"Off" beside the switch (or your words). */
		stateText?: boolean | { on: string; off: string };
		/** Locks the toggle. A `badge` ("Always on") replaces the switch. */
		lock?: SettingLock;
		/** Id of a reason shown elsewhere that describes this toggle. */
		reasonId?: string;
		/** Request flow for the toggle's own lock reason. */
		onRequest?: SettingsHandler<[]>;
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
	const stateWords = $derived(typeof stateText === 'object' ? stateText : { on: words.on, off: words.off });

	/** The value the toggle starts from: the saved value. */
	const start = untrack(() => checked ?? defaultChecked ?? false);

	if (draft && import.meta.env?.DEV && untrack(() => onCommit)) {
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

	const effectiveLock = $derived(pickLock(lock, scope?.lock?.lock));
	const locked = $derived(Boolean(effectiveLock));
	const alwaysBadge = $derived(effectiveLock?.badge);
	/** The row shows the reason; the badge is drawn here so the switch stays in the page for assistive technology. */
	const rowLock = $derived(lock && lock.badge ? { ...lock, badge: undefined } : lock);
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

	async function undo(): Promise<void> {
		if (!instant) return;
		undoing = true;
		const done = await instant.undo();
		if (!done) undoing = false;
	}

	function submit(event: SubmitEvent): void {
		// With a handler the change is already committed; the native post is the no-JS path only.
		if (onCommit && gate.current) event.preventDefault();
	}
</script>

{#snippet switchControl()}
	<span class="group/toggle inline-flex items-center gap-2">
		{#if stateText}
			<span aria-hidden="true" class="min-w-[2ch] text-right text-xs text-fg-light">
				<span class="hidden group-has-[input:checked]/toggle:inline">{stateWords.on}</span><span class="group-has-[input:checked]/toggle:hidden">{stateWords.off}</span>
			</span>
		{/if}
		{#if draft}
			<Switch {...rest} bind:ref {name} value="true" defaultChecked={start} disabled={disabled || undefined} />
		{:else}
			<Switch {...rest} bind:ref {name} value="true" checked={current} disabled={disabled || notReady || undefined} onCheckedChange={change} />
		{/if}
	</span>
{/snippet}

{#snippet control(attrs: FieldControlAttrs)}
	{#if alwaysBadge}
		<input {...rest} {...attrs} bind:this={ref} type="checkbox" role="switch" checked={current} disabled class="sr-only" />
		<Badge tone="neutral" variant="outline" size="lg" aria-hidden="true">{alwaysBadge}</Badge>
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
		<Button size="xs" variant="secondary" onclick={() => instant.retry()}>{words.retry}<span class="sr-only"> {label}</span></Button>
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
	lock={rowLock}
	{reasonId}
	{onRequest}
	{lockLabels}
	{status}
	error={errorText}
	{statusText}
	labels={{ saving: words.saving, saved: words.saved }}
	class={cn('min-w-0', className)}
/>
