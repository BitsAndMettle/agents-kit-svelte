<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { flip } from 'svelte/animate';
	import { onMount } from 'svelte';
	import { CircleAlert, Flag, Rocket, Siren } from '@lucide/svelte';
	import { motionDuration, rise } from '../state/motion.svelte';
	import { formatDay, niceStep } from './scale';
	import type { TimelineItem, TimelineMilestone } from './types';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		/** The cards (or other work) to plot, each with its planned and actual window in days. */
		items: TimelineItem[];
		/** Releases, deadlines and incidents to mark along the top. */
		milestones?: TimelineMilestone[];
		/** Today, in days from the start. Running work is drawn up to here. */
		today: number;
		/** ISO date of day 0, so the axis shows dates instead of day numbers. */
		start?: string;
		title?: string;
		/** Called when the person clicks a row. */
		onSelectItem?: (item: TimelineItem) => void;
		/** Called when the person clicks a milestone. */
		onSelectMilestone?: (milestone: TimelineMilestone) => void;
		class?: string;
	}

	let { items, milestones = [], today, start, title, onSelectItem, onSelectMilestone, class: className = '', ...rest }: Props = $props();

	let showPlan = $state(true);
	let sortBy = $state<'plan' | 'slip'>('plan');
	let hover = $state<string | null>(null);
	let hoverMilestone = $state<string | null>(null);
	let shown = $state(false);
	onMount(() => {
		const id = requestAnimationFrame(() => (shown = true));
		return () => cancelAnimationFrame(id);
	});

	/** Where each item is expected to finish: its actual end, its forecast, or its plan pushed past today. */
	function expectedEnd(item: TimelineItem): number {
		if (item.actual?.[1] !== undefined) return item.actual[1];
		if (item.forecast !== undefined) return item.forecast;
		const [p0, p1] = item.planned;
		if (item.actual) return Math.max(p1, today);
		if (today > p0) return Math.max(p1, today + (p1 - p0));
		return p1;
	}
	function slip(item: TimelineItem): number {
		return Math.round(expectedEnd(item) - item.planned[1]);
	}

	let domainEnd = $derived(
		Math.ceil(Math.max(today, ...items.flatMap((i) => [i.planned[1], expectedEnd(i)]), ...milestones.map((m) => m.t)) + 1)
	);
	let step = $derived(Math.max(1, niceStep(domainEnd, 7)));
	let axis = $derived(Array.from({ length: Math.floor(domainEnd / step) + 1 }, (_, i) => i * step));
	let rows = $derived(sortBy === 'slip' ? [...items].sort((a, b) => slip(b) - slip(a)) : items);
	let plannedShip = $derived(Math.max(0, ...items.map((i) => i.planned[1])));
	let forecastShip = $derived(Math.max(0, ...items.map(expectedEnd)));
	let totalSlip = $derived(Math.round(forecastShip - plannedShip));

	function pct(day: number): string {
		return `${(Math.max(0, Math.min(domainEnd, day)) / domainEnd) * 100}%`;
	}
	function span(a: number, b: number): string {
		return `${(Math.max(0, b - a) / domainEnd) * 100}%`;
	}

	const BAR: Record<TimelineItem['status'], string> = {
		planned: 'bg-canvas-border',
		running: 'bg-accent-primary',
		done: 'bg-status-success',
		failed: 'bg-status-danger',
		blocked: 'bg-status-warning'
	};
	const MILESTONE_ICON = { release: Rocket, deadline: Flag, incident: Siren } as const;
	const MILESTONE_TONE = { release: 'text-status-success', deadline: 'text-fg-main', incident: 'text-status-danger' } as const;
</script>

<div {...rest} class={cn('rounded-card border border-card-border bg-card-bg p-4 ak-shadow-btn', className)}>
	<header class="mb-3 flex flex-wrap items-start justify-between gap-3">
		<div>
			{#if title}<h3 class="text-sm font-semibold text-fg-main">{title}</h3>{/if}
			<p class="mt-0.5 text-[12px] text-fg-light">
				Planned to ship {formatDay(plannedShip, start)} · forecast
				<span class="font-medium text-fg-main">{formatDay(forecastShip, start)}</span>
				{#key totalSlip}
					<span
						class={cn('ml-1 inline-block rounded-full px-1.5 py-px text-[11px] font-medium', totalSlip > 0 ? 'bg-status-warning-subtle text-status-warning' : 'bg-status-success-subtle text-status-success')}
						in:rise={{ y: 4, duration: 180 }}
					>{totalSlip > 0 ? `${totalSlip}d late` : totalSlip < 0 ? `${-totalSlip}d early` : 'on time'}</span>
				{/key}
			</p>
		</div>
		<div class="flex items-center gap-2 text-[11px]">
			<button
				type="button"
				aria-pressed={showPlan}
				onclick={() => (showPlan = !showPlan)}
				class="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-fg-light transition-colors hover:bg-canvas-secondary hover:text-fg-main"
			>
				<span class={cn('relative h-3.5 w-6 rounded-full transition-colors duration-200', showPlan ? 'bg-accent-primary' : 'bg-canvas-border')}>
					<span class={cn('absolute top-0.5 left-0.5 size-2.5 rounded-full bg-card-bg shadow-soft-sm transition-transform duration-200', showPlan && 'translate-x-2.5')}></span>
				</span>
				Plan
			</button>
			<div class="flex items-center gap-0.5 rounded-full bg-canvas-secondary p-0.5" role="group" aria-label="Sort rows">
				{#each [['plan', 'By plan'], ['slip', 'By slip']] as [key, label] (key)}
					<button
						type="button"
						aria-pressed={sortBy === key}
						onclick={() => (sortBy = key as 'plan' | 'slip')}
						class={cn('rounded-full px-2 py-0.5 transition-colors', sortBy === key ? 'bg-card-bg text-fg-main ak-shadow-btn' : 'text-fg-light hover:text-fg-main')}
					>{label}</button>
				{/each}
			</div>
		</div>
	</header>

	<div class="grid grid-cols-[minmax(7rem,11rem)_minmax(0,1fr)_3rem] gap-x-3">
		<!-- Axis -->
		<div></div>
		<div class="relative h-8">
			{#each axis as d (d)}
				<span class="absolute bottom-0 -translate-x-1/2 text-[10px] whitespace-nowrap text-fg-light tabular-nums" style:left={pct(d)}>{formatDay(d, start)}</span>
			{/each}
			{#each milestones as m (m.id)}
				{@const Icon = MILESTONE_ICON[m.kind ?? 'deadline']}
				<button
					type="button"
					aria-label="{m.label}, {formatDay(m.t, start)}"
					class={cn('absolute top-0 z-10 grid size-5 -translate-x-1/2 place-items-center rounded-full border border-card-border bg-card-bg shadow-soft-sm transition-transform duration-200 hover:scale-125 focus-visible:scale-125 focus-visible:outline-none', MILESTONE_TONE[m.kind ?? 'deadline'])}
					style:left={pct(m.t)}
					onpointerenter={() => (hoverMilestone = m.id)}
					onpointerleave={() => (hoverMilestone = null)}
					onfocus={() => (hoverMilestone = m.id)}
					onblur={() => (hoverMilestone = null)}
					onclick={() => onSelectMilestone?.(m)}
				>
					<Icon class="size-3" aria-hidden="true" />
				</button>
				{#if hoverMilestone === m.id}
					<span
						class="pointer-events-none absolute -top-7 z-20 -translate-x-1/2 rounded-chip border border-card-border bg-card-bg px-2 py-1 text-[11px] whitespace-nowrap text-fg-main shadow-soft"
						style:left={pct(m.t)}
						in:rise={{ y: 3, duration: 120 }}
					>{m.label} · {formatDay(m.t, start)}</span>
				{/if}
			{/each}
		</div>
		<div></div>

		<!-- Rows -->
		<div class="relative col-span-3 grid grid-cols-subgrid">
			<!-- Grid lines, milestones and today, under the rows -->
			<div class="pointer-events-none absolute inset-y-0 col-start-2 w-full" aria-hidden="true">
				{#each axis as d (d)}
					<span class="absolute inset-y-0 border-l border-dashed border-canvas-border" style:left={pct(d)}></span>
				{/each}
				{#each milestones as m (m.id)}
					<span class={cn('absolute inset-y-0 border-l transition-opacity duration-200', MILESTONE_TONE[m.kind ?? 'deadline'], hoverMilestone === m.id ? 'border-current opacity-100' : 'border-current opacity-25')} style:left={pct(m.t)}></span>
				{/each}
				<span class="absolute -top-2 bottom-0 border-l-2 border-accent-primary" style:left={pct(today)}>
					<span class="absolute -top-1 -left-[5px] size-2 rounded-full bg-accent-primary"></span>
				</span>
			</div>

			{#each rows as item, i (item.id)}
				{@const s = slip(item)}
				{@const end = expectedEnd(item)}
				<button
					type="button"
					aria-label="{item.label}: {item.status}{s > 0 ? `, ${s} days late` : ''}"
					class={cn(
						'group/row col-span-3 grid grid-cols-subgrid items-center rounded-control py-1.5 text-left transition-opacity duration-200 focus-visible:ring-2 focus-visible:ring-accent-primary/40 focus-visible:outline-none',
						hover && hover !== item.id && 'opacity-45',
						onSelectItem ? 'cursor-pointer' : 'cursor-default'
					)}
					onpointerenter={() => (hover = item.id)}
					onpointerleave={() => (hover = null)}
					onfocus={() => (hover = item.id)}
					onblur={() => (hover = null)}
					onclick={() => onSelectItem?.(item)}
					animate:flip={{ duration: motionDuration(320) }}
				>
					<span class="min-w-0 pl-1">
						<span class="block truncate text-[13px] text-fg-main group-hover/row:underline group-hover/row:decoration-card-border group-hover/row:underline-offset-4">{item.label}</span>
						{#if item.detail}<span class="block truncate font-mono text-[10px] text-fg-light">{item.detail}</span>{/if}
					</span>

					<span class="relative h-5">
						<!-- Plan: a ghost bar behind the actual one -->
						<span
							class={cn('absolute inset-y-0 rounded-full border border-dashed border-fg-light/50 transition-opacity duration-300', showPlan ? 'opacity-100' : 'opacity-0')}
							style:left={pct(item.planned[0])}
							style:width={span(item.planned[0], item.planned[1])}
						></span>
						{#if item.actual}
							{@const a0 = item.actual[0]}
							{@const a1 = item.actual[1] ?? today}
							<span
								class={cn('absolute inset-y-1 origin-left rounded-full transition-transform duration-700 ease-out', BAR[item.status])}
								style:left={pct(a0)}
								style:width={span(a0, a1)}
								style:transform="scaleX({shown ? 1 : 0})"
								style:transition-delay="{i * 70}ms"
							>
								{#if item.status === 'running'}<span class="ak-timeline-pulse absolute top-1/2 right-0 size-2.5 translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-primary"></span>{/if}
							</span>
							{#if item.actual[1] === undefined && end > a1}
								<span
									class={cn('ak-timeline-forecast absolute inset-y-1 rounded-r-full transition-opacity duration-500', shown ? 'opacity-100' : 'opacity-0')}
									style:left={pct(a1)}
									style:width={span(a1, end)}
									style:transition-delay="{i * 70 + 500}ms"
									title="Forecast to finish {formatDay(end, start)}"
								></span>
							{/if}
						{:else if end > item.planned[1]}
							<!-- Not started and already pushed out by today -->
							<span class="ak-timeline-forecast absolute inset-y-1 rounded-full opacity-70" style:left={pct(today)} style:width={span(today, end)}></span>
						{/if}
						{#if item.status === 'failed' || item.status === 'blocked'}
							<CircleAlert class={cn('absolute top-1/2 size-3.5 -translate-y-1/2', item.status === 'failed' ? 'text-status-danger' : 'text-status-warning')} style="left: calc({pct(item.actual?.[1] ?? today)} + 6px)" aria-hidden="true" />
						{/if}
					</span>

					<span class="pr-1 text-right text-[11px] tabular-nums">
						{#if s > 0}
							<span class="font-medium text-status-warning">+{s}d</span>
						{:else if item.status === 'done'}
							<span class="text-status-success">{s < 0 ? `${s}d` : 'on time'}</span>
						{:else}
							<span class="text-fg-light">{formatDay(end, start)}</span>
						{/if}
					</span>
				</button>
			{/each}
		</div>
	</div>

	<footer class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-fg-light">
		<span class="inline-flex items-center gap-1.5"><span class="h-2 w-4 rounded-full border border-dashed border-fg-light/60"></span>Plan</span>
		<span class="inline-flex items-center gap-1.5"><span class="h-2 w-4 rounded-full bg-status-success"></span>Done</span>
		<span class="inline-flex items-center gap-1.5"><span class="h-2 w-4 rounded-full bg-accent-primary"></span>Running</span>
		<span class="inline-flex items-center gap-1.5"><span class="ak-timeline-forecast h-2 w-4 rounded-full"></span>Forecast</span>
		<span class="inline-flex items-center gap-1.5"><span class="h-3 border-l-2 border-accent-primary"></span>Today</span>
	</footer>
</div>

<style>
	.ak-timeline-forecast {
		background-image: repeating-linear-gradient(
			-45deg,
			color-mix(in oklch, var(--ak-color-accent) 45%, transparent) 0 4px,
			color-mix(in oklch, var(--ak-color-accent) 12%, transparent) 4px 8px
		);
		background-size: 11.3px 11.3px;
		animation: ak-timeline-march 1.2s linear infinite;
	}
	.ak-timeline-pulse {
		box-shadow: 0 0 0 0 color-mix(in oklch, var(--ak-color-accent) 50%, transparent);
		animation: ak-timeline-pulse 1.8s ease-out infinite;
	}
	@keyframes ak-timeline-march {
		to {
			background-position: 11.3px 0;
		}
	}
	@keyframes ak-timeline-pulse {
		to {
			box-shadow: 0 0 0 7px transparent;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.ak-timeline-forecast,
		.ak-timeline-pulse {
			animation: none;
		}
	}
</style>
