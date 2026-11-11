<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Ban, Check, Clock, Undo2 } from '@lucide/svelte';
	import { badgeClass, pillClass } from '../ui/styles';
	import { relativeTime } from '../agents-ui/fleet';
	import type { ActionOutcome, ActionRun, ActionTarget } from '../types';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children'> {
		/** What was done, as a short verb phrase: "Re-offered", "Parked", "Merge". */
		action: string;
		/** What it was done to. With `href` the label is a link. */
		target: ActionTarget;
		outcome: ActionOutcome;
		/** Why, especially for a refusal. */
		reason?: string;
		/** Who did it: "Operator", "You". */
		actor?: string;
		/** When it happened (ISO 8601), shown relative to `now`. */
		at?: string;
		/** The time `at` is measured against: an ISO string, a timestamp or a Date. Defaults to the current time. */
		now?: string | number | Date;
		/** The run that proposed the action. */
		run?: ActionRun;
		/** Tighter padding and no reason line break, for rows in an inbox. */
		compact?: boolean;
		/** Called when the person presses the target label. Without `href` the label is a button when this is set. */
		onOpenTarget?: (target: ActionTarget) => void;
		/** Called when the person presses the run. The run is only a button when this is set. */
		onOpenRun?: (run: ActionRun) => void;
		/** Called when the person presses Undo. The button only shows while the outcome is `done`. */
		onUndo?: (target: ActionTarget) => void;
		class?: string;
	}

	let { action, target, outcome, reason, actor, at, now, run, compact = false, onOpenTarget, onOpenRun, onUndo, class: className = '', ...rest }: Props = $props();

	const OUTCOME = {
		done: { text: 'Done', box: 'border-card-border bg-card-bg', icon: 'bg-status-success-subtle text-status-success', label: 'text-status-success' },
		refused: { text: 'Refused', box: 'border-status-danger/40 bg-status-danger-subtle', icon: 'bg-status-danger text-white', label: 'text-status-danger' },
		pending: { text: 'Pending', box: 'border-card-border bg-card-bg', icon: 'bg-status-warning-subtle text-status-warning', label: 'text-status-warning' },
		undone: { text: 'Undone', box: 'border-card-border bg-canvas-primary', icon: 'bg-canvas-secondary text-fg-light', label: 'text-fg-light' }
	} satisfies Record<ActionOutcome, { text: string; box: string; icon: string; label: string }>;

	let o = $derived(OUTCOME[outcome]);
	let when = $derived(at ? relativeTime(at, now ?? Date.now()) : '');
	const RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary';
	const LINK = cn('rounded-[4px] font-medium text-fg-main underline decoration-fg-light/40 underline-offset-2 hover:decoration-fg-main', RING);
</script>

<article {...rest} class={cn('flex items-start gap-2.5 rounded-soft border text-sm', compact ? 'p-2.5' : 'p-3', o.box, className)}>
	<span class={cn('mt-px inline-flex size-6 shrink-0 items-center justify-center rounded-full [&_svg]:size-3.5', o.icon)} aria-hidden="true">
		{#if outcome === 'done'}<Check />{:else if outcome === 'refused'}<Ban />{:else if outcome === 'undone'}<Undo2 />{:else}<Clock />{/if}
	</span>

	<div class="min-w-0 flex-1">
		<p class="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-fg-main">
			<span class="sr-only">{o.text}: </span>
			{#if outcome !== 'done'}<span class={cn(badgeClass('neutral'), 'bg-transparent px-0 font-semibold uppercase tracking-wide', o.label)} aria-hidden="true">{o.text}</span>{/if}
			<span class={cn('font-semibold', outcome === 'refused' && 'text-status-danger')}>{action}</span>
			{#if target.href}
				<a href={target.href} class={cn(LINK, 'break-words')} onclick={() => onOpenTarget?.(target)}>{target.label}</a>
			{:else if onOpenTarget}
				<button type="button" class={cn(LINK, 'text-left break-words')} onclick={() => onOpenTarget(target)}>{target.label}</button>
			{:else}
				<span class="break-words">{target.label}</span>
			{/if}
		</p>

		{#if actor || when || run}
			<p class="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-fg-light">
				{#if actor}<span>{actor}</span>{/if}
				{#if actor && when}<span aria-hidden="true">·</span>{/if}
				{#if when}<span>{when}</span>{/if}
				{#if run}
					{#if actor || when}<span aria-hidden="true">·</span>{/if}
					<span>proposed by
						{#if onOpenRun}
							<button type="button" class={cn('rounded-[4px] font-medium text-fg-main hover:underline', RING)} onclick={() => onOpenRun(run)}>{run.label}</button>
						{:else}
							<span class="font-medium text-fg-main">{run.label}</span>
						{/if}
					</span>
				{/if}
			</p>
		{/if}

		{#if reason}
			<p class={cn('mt-1 text-xs', outcome === 'refused' ? 'text-fg-main' : 'text-fg-light', compact && 'line-clamp-2')}>
				{#if outcome === 'refused'}<span class="font-medium">Why:&nbsp;</span>{/if}{reason}
			</p>
		{/if}
	</div>

	{#if onUndo && outcome === 'done'}
		<button type="button" class={cn(pillClass('secondary', 'xs'), RING)} onclick={() => onUndo(target)}>
			<Undo2 aria-hidden="true" /> Undo<span class="sr-only"> {action} {target.label}</span>
		</button>
	{/if}
</article>
