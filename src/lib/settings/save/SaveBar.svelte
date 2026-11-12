<!--
	@component
	The face of the staged model: how many changes are unsaved, what they are (from → to, a few,
	then "+N more"), an optional impact line, Discard (a native reset) and Save (a native submit).
	It shows a failed save, a conflict with a way to review it, and a saved notice. It reads the
	surrounding SettingsForm's draft, works without JavaScript (always shown, Save always enabled),
	and returns focus to the last edited control (else the first unsaved or editable field) when its
	buttons go away. While a sticky or floating bar shows, its scroller keeps that much room at the
	bottom (`scroll-padding-bottom`, from `--ak-settings-bar-space`), so a focused field is never
	hidden under it.
-->
<script lang="ts" module>
	import { ScrollRoom } from './helpers';

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

	/** Room kept per scroller for the bars covering it (several bars can share one page). */
	const ROOMS = new WeakMap<HTMLElement, ScrollRoom>();
	/** The CSS variable a covered scroller gets: the room its tallest covering bar needs. */
	const BAR_SPACE = '--ak-settings-bar-space';

	/** The nearest ancestor that scrolls vertically, else the page's scroller. */
	function scrollerOf(node: HTMLElement): HTMLElement {
		for (let el = node.parentElement; el; el = el.parentElement) {
			if (el === document.body || el === document.documentElement) break;
			if (/(auto|scroll|overlay)/.test(getComputedStyle(el).overflowY)) return el;
		}
		return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
	}

	/** Where a scroller's visible area ends, in viewport coordinates. */
	function scrollerBottom(scroller: HTMLElement): number {
		return scroller === document.scrollingElement || scroller === document.documentElement ? window.innerHeight : scroller.getBoundingClientRect().bottom;
	}
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
		/** Where focus goes when the bar's buttons go away. Default: the last edited control, else the first unsaved field, else the first field. */
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
		const host = hostForm();
		if (restoreFocus(refocus?.(), draft?.lastEdited(), ...changedControls(host), ...stagedControls(host))) return;
		// Nothing to edit is left (a conflict review that took the last edited control with it): the form itself.
		if (host && !host.hasAttribute('tabindex')) host.setAttribute('tabindex', '-1');
		restoreFocus(host);
	}

	/** The form the bar saves: its `form` id, else the form around it. */
	function hostForm(): HTMLFormElement | null {
		const byId = form ? document.getElementById(form) : null;
		return byId instanceof HTMLFormElement ? byId : (root?.closest('form') ?? null);
	}

	/** The controls of the fields that are still unsaved, in change order (a radio group: its checked radio). */
	function changedControls(host: HTMLFormElement | null): HTMLElement[] {
		if (!host) return [];
		const out: HTMLElement[] = [];
		for (const change of list) {
			const named = host.elements.namedItem(change.name);
			if (named instanceof RadioNodeList) {
				const nodes = Array.from(named) as HTMLInputElement[];
				const pick = nodes.find((node) => node.checked) ?? nodes[0];
				if (pick) out.push(pick);
			} else if (named instanceof HTMLElement) out.push(named);
		}
		return out;
	}

	/** The form's named value controls outside the bar, in page order. */
	function stagedControls(host: HTMLFormElement | null): HTMLElement[] {
		if (!host) return [];
		return Array.from(host.elements).filter(
			(el): el is HTMLElement =>
				el instanceof HTMLElement && el.matches('input:not([type="hidden"]), select, textarea') && Boolean((el as HTMLInputElement).name) && !(root?.contains(el) ?? false)
		);
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

	// A sticky or floating bar covers the bottom of its scroller. While it shows, keep that much
	// room as the scroller's `scroll-padding-bottom`, so moving focus never parks a field under it.
	$effect(() => {
		if (!root || !visible || layout === 'footer') return;
		const bar = root;
		const scroller = scrollerOf(bar);
		const room = ROOMS.get(scroller) ?? new ScrollRoom();
		ROOMS.set(scroller, room);
		const key = Symbol('save-bar');
		const before = { padding: scroller.style.scrollPaddingBottom, space: scroller.style.getPropertyValue(BAR_SPACE) };
		const apply = (px: number) => {
			scroller.style.setProperty(BAR_SPACE, `${px}px`);
			scroller.style.scrollPaddingBottom = `var(${BAR_SPACE})`;
		};
		const measure = () => {
			// A stuck bar sits its `bottom` inset above the scroller's padding; a floating one is always where it shows.
			const offset =
				layout === 'sticky'
					? (parseFloat(getComputedStyle(bar).bottom) || 0) + (parseFloat(getComputedStyle(scroller).paddingBottom) || 0)
					: Math.max(0, scrollerBottom(scroller) - bar.getBoundingClientRect().bottom);
			// Breathing room above the bar, so the focus ring shows too.
			apply(room.set(key, Math.ceil(bar.offsetHeight + offset + 8)));
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(bar);
		return () => {
			observer.disconnect();
			const left = room.set(key, undefined);
			if (!room.empty) return apply(left);
			scroller.style.scrollPaddingBottom = before.padding;
			if (before.space) scroller.style.setProperty(BAR_SPACE, before.space);
			else scroller.style.removeProperty(BAR_SPACE);
		};
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
