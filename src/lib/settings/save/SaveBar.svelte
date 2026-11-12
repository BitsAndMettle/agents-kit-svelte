<!--
	@component
	The face of the staged model: how many changes are unsaved, what they are (from → to, a few,
	then "+N more"), an optional impact line, Discard (a native reset) and Save (a native submit).
	It shows a failed save, a conflict with a way to review it, and a saved notice. It reads the
	surrounding SettingsForm's draft, works without JavaScript (always shown, Save always enabled),
	and returns focus to the last edited control when its buttons go away.
-->
<script lang="ts" module>
	/** Every word SaveBar shows or announces. */
	export interface SaveBarLabels {
		/** "2 unsaved changes". */
		unsaved: (count: number) => string;
		/** Footer text while nothing is unsaved. */
		idle: string;
		save: string;
		discard: string;
		/** Announced while saving. */
		saving: string;
		/** Shown and announced after a save (a result's `notice` wins). */
		saved: string;
		/** Shown when a save failed without a message of its own. */
		error: string;
		/** Shown when a save came back with field errors only. */
		fieldErrors: string;
		/** Stands in for an empty new value in the summary. */
		empty: string;
		/** Shown on a stale save (a conflict's `message` wins). */
		conflict: string;
		/** The conflict's review action. */
		review: string;
		/** "+2 more" after the listed changes. */
		more: (count: number) => string;
		/** Names the list of changes. */
		summary: string;
		/** Spoken between a change's saved and new value. */
		from: string;
		to: string;
	}

	export type SaveBarLayout = 'footer' | 'sticky' | 'floating';
</script>

<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { CircleCheck, OctagonAlert, TriangleAlert } from '@lucide/svelte';
	import { cn } from '../../ui/cn';
	import { Button } from '../../primitives/actions';
	import { getSettingsDraft } from '../shared/context';
	import { restoreFocus } from '../shared/focus';
	import { ReadyGate } from '../shared/ready.svelte';
	import type { SettingsDraft } from '../shared/staged.svelte';
	import type { SettingsChange } from '../shared/types';
	import { summarizeChanges } from './helpers';
	import { getSaveBarPresence } from './presence.svelte';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		/**
		 * `footer` sits in a section's footer strip and always shows; `sticky` sticks to the bottom
		 * of the scrolling page; `floating` floats over the page at `--ak-settings-bar-offset`
		 * (default 1rem) from the bottom. Sticky and floating hide while nothing is unsaved.
		 */
		layout?: SaveBarLayout;
		/** The unsaved changes. Default: the surrounding SettingsForm's. */
		changes?: SettingsChange[];
		/** What saving will do, shown while there are unsaved changes ("Applies to 6 members"). */
		impact?: string | Snippet;
		/** Keep a sticky or floating bar visible while nothing is unsaved (Save disabled). */
		showIdle?: boolean;
		/** How many changes to list before "+N more". Default 3. */
		summaryMax?: number;
		/** Id of the form, when the bar is rendered outside it. */
		form?: string;
		/** The draft, when the bar is outside the SettingsForm (default: the surrounding one). */
		controller?: SettingsDraft;
		/** Where the conflict's Review action goes (a link). A conflict's own `reviewHref` wins. */
		reviewHref?: string;
		/** Called by the conflict's Review action. */
		onReviewConflict?: () => void;
		/** Where focus goes when the bar's buttons go away. Default: the last edited control. */
		refocus?: () => HTMLElement | null;
		labels?: Partial<SaveBarLabels>;
		class?: string;
	}

	let {
		layout = 'sticky',
		changes,
		impact,
		showIdle = false,
		summaryMax = 3,
		form,
		controller,
		reviewHref,
		onReviewConflict,
		refocus,
		labels,
		class: className = '',
		...rest
	}: Props = $props();

	const text = $derived<SaveBarLabels>({
		unsaved: (n) => (n === 1 ? '1 unsaved change' : `${n} unsaved changes`),
		idle: 'No unsaved changes',
		save: 'Save',
		discard: 'Discard',
		saving: 'Saving…',
		saved: 'Changes saved.',
		error: "Couldn't save. Your changes are still here.",
		fieldErrors: 'Some settings need a fix before they can be saved.',
		empty: 'empty',
		conflict: 'Someone else saved these settings while you were editing. Your changes are kept.',
		review: 'Review changes',
		more: (n) => `+${n} more`,
		summary: 'Unsaved changes',
		from: 'from',
		to: 'to',
		...labels
	});

	const contextDraft = getSettingsDraft();
	const draft = $derived(controller ?? contextDraft);
	// Inside a SettingsForm, the bar shows the form's outcome, so the form does not repeat it.
	// (An explicit controller means the bar is outside the form, which keeps its own outcome.)
	if (untrack(() => !controller)) getSaveBarPresence()?.join();

	const ready = new ReadyGate();
	const list = $derived(changes ?? draft?.changes ?? []);
	const count = $derived(list.length);
	const status = $derived(draft?.status ?? 'idle');
	const pending = $derived(status === 'pending');
	const conflict = $derived(status === 'conflict' ? draft?.conflict : undefined);
	const error = $derived(
		status === 'error' ? (draft?.error ?? (Object.values(draft?.result?.errors ?? {}).some(Boolean) ? text.fieldErrors : text.error)) : undefined
	);
	const summary = $derived(summarizeChanges(list, summaryMax));
	const review = $derived(conflict?.reviewHref ?? reviewHref);

	/** A save just finished: show it for a moment on a bar that would otherwise hide. */
	let flash = $state(false);
	$effect(() => {
		if (status !== 'saved') return;
		untrack(() => (flash = true));
		const timer = setTimeout(() => (flash = false), 2500);
		return () => clearTimeout(timer);
	});

	const visible = $derived(
		!ready.current || layout === 'footer' || showIdle || count > 0 || pending || status === 'error' || status === 'conflict' || (status === 'saved' && flash)
	);
	/** Before hydration nothing is known about the draft, so Save stays enabled for the native post. */
	const canSave = $derived(!ready.current || count > 0 || status === 'error' || status === 'conflict');
	const canDiscard = $derived(!ready.current || count > 0);

	const announcement = $derived(pending ? text.saving : status === 'saved' ? (draft?.notice ?? text.saved) : '');

	// Focus: while it is inside the bar and the bar's buttons go away (saved, discarded,
	// disabled), return it to where the person was editing.
	let root = $state<HTMLDivElement | null>(null);
	let hadFocus = false;
	function onfocusin(): void {
		hadFocus = true;
	}
	function onfocusout(event: FocusEvent): void {
		const next = event.relatedTarget;
		// No related target: the focused button was disabled or removed. Keep watching.
		if (next instanceof Node && !root?.contains(next)) hadFocus = false;
	}
	function giveFocusBack(): void {
		if (!hadFocus) return;
		const active = document.activeElement as (HTMLElement & { disabled?: boolean }) | null;
		const lost = !active || active === document.body || !active.isConnected || Boolean(active.disabled);
		if (!lost) return;
		hadFocus = false;
		restoreFocus(refocus?.(), draft?.lastEdited());
	}
	$effect(() => {
		void visible;
		void canSave;
		void canDiscard;
		void pending;
		// After the DOM update: a focused button that was just disabled or removed has lost focus.
		queueMicrotask(giveFocusBack);
	});
	$effect(() => () => {
		const inside = root?.contains(document.activeElement);
		if (inside) hadFocus = true;
		queueMicrotask(giveFocusBack);
	});

	const LAYOUT: Record<SaveBarLayout, string> = {
		footer: 'border-t border-canvas-border bg-card-bg px-4 py-2.5',
		sticky: 'sticky bottom-3 z-10 mt-4 rounded-card border border-card-border bg-card-bg px-4 py-3 ak-shadow-soft',
		floating:
			'fixed inset-x-0 bottom-[var(--ak-settings-bar-offset,1rem)] z-40 mx-auto w-[min(44rem,calc(100%-2rem))] rounded-card border border-card-border bg-card-bg px-4 py-3 ak-shadow-soft'
	};
</script>

{#snippet changeLine(change: SettingsChange)}
	<span class="font-medium text-fg-main">{change.label}</span>
	{#if change.from !== undefined}
		<span class="text-fg-light"><span class="sr-only">{` ${text.from} `}</span>{change.from}</span>
		<span aria-hidden="true" class="text-fg-light">→</span>
	{/if}
	<span class="text-fg-main"><span class="sr-only">{`${text.to} `}</span>{#if change.to}{change.to}{:else}<em>{text.empty}</em>{/if}</span>
{/snippet}

<div {...rest} bind:this={root} {onfocusin} {onfocusout} data-layout={layout} data-status={status} class={cn('flex min-w-0 flex-col gap-2.5 text-[13px] leading-5', LAYOUT[layout], !visible && 'contents', className)}>
	<p role="status" class="sr-only">{announcement}</p>
	{#if visible}
		{#if conflict}
			<div role="alert" data-form-error tabindex="-1" class="flex items-start gap-2.5 rounded-control border border-status-warning/30 bg-status-warning-subtle px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40">
				<TriangleAlert aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-status-warning" />
				<div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
					<p class="m-0 min-w-0 flex-1 basis-56 text-fg-main">{conflict.message ?? text.conflict}</p>
					{#if review !== undefined}
						<Button size="sm" href={review} onclick={() => onReviewConflict?.()}>{text.review}</Button>
					{:else if onReviewConflict}
						<Button size="sm" onclick={() => onReviewConflict?.()}>{text.review}</Button>
					{/if}
				</div>
			</div>
		{:else if error}
			<div role="alert" data-form-error tabindex="-1" class="flex items-start gap-2.5 rounded-control border border-status-danger/30 bg-status-danger-subtle px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40">
				<OctagonAlert aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-status-danger" />
				<p class="m-0 min-w-0 flex-1 text-fg-main">{error}</p>
			</div>
		{/if}

		<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
			<div class="min-w-0 flex-1 basis-48">
				{#if count > 0}
					<p class="m-0 flex items-center gap-2 font-medium text-fg-main">
						<span aria-hidden="true" class="size-2 shrink-0 rounded-full bg-accent-primary"></span>
						{text.unsaved(count)}
					</p>
					<ul role="list" aria-label={text.summary} class="m-0 mt-0.5 flex list-none flex-wrap gap-x-3 gap-y-0.5 p-0 pl-4 text-xs text-fg-light @max-lg/settings:hidden">
						{#each summary.shown as change (change.name)}
							<li class="max-w-full truncate">{@render changeLine(change)}</li>
						{/each}
						{#if summary.more > 0}
							<li class="font-medium">{text.more(summary.more)}</li>
						{/if}
					</ul>
					{#if impact}
						<p class="m-0 mt-0.5 pl-4 text-xs text-fg-light">
							{#if typeof impact === 'string'}{impact}{:else}{@render impact()}{/if}
						</p>
					{/if}
				{:else if status === 'saved'}
					<p class="m-0 flex items-center gap-2 font-medium text-fg-main">
						<CircleCheck aria-hidden="true" class="size-4 shrink-0 text-status-success" />
						{draft?.notice ?? text.saved}
					</p>
				{:else if ready.current}
					<p class="m-0 text-fg-light">{text.idle}</p>
				{/if}
			</div>
			<div class="ml-auto flex shrink-0 items-center gap-2">
				<Button type="reset" variant="ghost" {form} disabled={!canDiscard || pending} onclick={() => draft?.clear()}>{text.discard}</Button>
				<Button type="submit" variant="primary" {form} loading={pending} disabled={!canSave}>{text.save}</Button>
			</div>
		</div>
	{/if}
</div>
