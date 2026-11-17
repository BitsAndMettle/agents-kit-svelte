<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Spring, Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { Flame } from '@lucide/svelte';
	import { rise } from '../state/motion.svelte';
	import { areaPath, formatClock, formatCompact, linePath, niceMax, projectBurn, projectionEnd, scaleLinear, ticks } from './scale';
	import type { BurnPoint, RunMark } from './types';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		/** Cumulative spend samples, in time order. */
		points: BurnPoint[];
		/** The token budget for the run, card or Feature. */
		budget?: number;
		/** When the work is due to end; the projection runs to here. Defaults to the last sample. */
		end?: number;
		/** Moments to pin on the line: handoffs, retries, escalations. */
		marks?: RunMark[];
		title?: string;
		/** Plot height in pixels. */
		height?: number;
		/** Formats a time value for the axis and tooltip. Defaults to `m:ss`. */
		formatTime?: (t: number) => string;
		/** Label for the burn rate, e.g. `/min`. The rate is multiplied by `rateScale` first. */
		rateLabel?: string;
		/** Multiplier from spend per t unit to the displayed rate. Defaults to 60 (per second → per minute). */
		rateScale?: number;
		/** Formats a spend value for the header, axis and tooltip. Defaults to compact tokens (`12.4k`). */
		formatValue?: (value: number) => string;
		/** Word after the budget in the header. */
		unit?: string;
		/** Names the budget line, e.g. `Switch point`. */
		budgetLabel?: string;
		/**
		 * The most spend can reach, e.g. `100` for a usage window. It makes the budget a switch point, not a ceiling: drawn
		 * in info blue, read as reached or passed, the projection ends where it meets it, and the axis stops at `limit`.
		 */
		limit?: number;
		/** Spacing of the time ticks in `t` units, e.g. `24` for days when `t` is in hours. Defaults to round numbers. */
		timeStep?: number;
		/** Names the chart for a screen reader when there is no `title`. */
		label?: string;
		/** Called when the person clicks a mark. */
		onSelectMark?: (mark: RunMark) => void;
		/** Called when the person clicks the plot: the spend at that time. */
		onSelectPoint?: (point: BurnPoint) => void;
		class?: string;
	}

	let {
		points,
		budget,
		end,
		marks = [],
		title,
		height = 200,
		formatTime = formatClock,
		rateLabel = '/min',
		rateScale = 60,
		formatValue = formatCompact,
		unit = 'tokens',
		budgetLabel = 'Budget',
		limit,
		timeStep,
		label = 'Token burn',
		onSelectMark,
		onSelectPoint,
		class: className = '',
		...rest
	}: Props = $props();

	const PAD = { top: 14, right: 64, bottom: 24, left: 44 };
	const uid = $props.id();
	let width = $state(720);
	let activeT = $state<number | null>(null);
	let hoverMark = $state<string | null>(null);

	let last = $derived(points.at(-1));
	let tEnd = $derived(Math.max(end ?? 0, last?.t ?? 0, 1));
	let burn = $derived(projectBurn(points, tEnd, budget));
	/** Where the dashed projection ends: the end of the run, or on a usage chart's switch point. */
	let ahead = $derived(projectionEnd(points, tEnd, budget, limit));
	let projecting = $derived(!!last && last.t < ahead.t);
	let toEnd = $derived(projecting && ahead.t >= tEnd);
	let over = $derived(budget !== undefined && burn.crossesAt !== null);
	let passed = $derived(over && !!last && burn.crossesAt! <= last.t);
	/** A usage chart's switch point is a hand-over, drawn in info blue; a token budget is a ceiling, drawn in danger red. */
	let ink = $derived(
		limit === undefined
			? { line: 'stroke-status-danger', text: 'fill-status-danger', ring: 'fill-status-danger/20', dot: 'fill-status-danger', word: 'text-status-danger' }
			: { line: 'stroke-status-info', text: 'fill-status-info', ring: 'fill-status-info/20', dot: 'fill-status-info', word: 'text-status-info' }
	);

	const yTop = new Tween(1, { duration: 420, easing: cubicOut });
	const spentShown = new Spring(0, { stiffness: 0.1, damping: 0.8 });
	const reveal = new Tween(0, { duration: 900, easing: cubicOut });
	let primed = false;
	$effect(() => {
		const instant = !primed || prefersReducedMotion.current;
		const top = limit ?? niceMax(Math.max(budget ?? 0, ahead.spent, last?.spent ?? 0) * 1.08, 4);
		void yTop.set(top, { duration: instant ? 0 : 420 });
		void spentShown.set(last?.spent ?? 0, { instant: prefersReducedMotion.current });
		if (!primed) {
			primed = true;
			void reveal.set(1, { duration: prefersReducedMotion.current ? 0 : 900 });
		}
	});

	let innerW = $derived(Math.max(60, width - PAD.left - PAD.right));
	let innerH = $derived(Math.max(40, height - PAD.top - PAD.bottom));
	let x = $derived(scaleLinear([0, tEnd], [0, innerW]));
	let y = $derived(scaleLinear([0, yTop.current], [innerH, 0]));
	let xTicks = $derived.by(() => {
		const count = Math.max(2, Math.floor(innerW / 90));
		if (!timeStep) return ticks(0, tEnd, count);
		const step = timeStep * Math.ceil(tEnd / timeStep / count);
		return Array.from({ length: Math.floor(tEnd / step + 1e-9) + 1 }, (_, i) => i * step);
	});
	let yTicks = $derived(ticks(0, yTop.current, 3).filter((t) => t <= yTop.current + 1e-9));
	let line = $derived(points.map((p): [number, number] => [x(p.t), y(p.spent)]));

	/** Spend at `t`, interpolated between samples. */
	function spentAt(t: number): number {
		if (!points.length) return 0;
		if (t <= points[0].t) return points[0].spent;
		for (let i = 1; i < points.length; i++) {
			const a = points[i - 1];
			const b = points[i];
			if (t <= b.t) return a.spent + ((b.spent - a.spent) * (t - a.t)) / Math.max(1e-9, b.t - a.t);
		}
		return points[points.length - 1].spent;
	}
	function rateAt(t: number): number {
		const span = Math.min(20, t);
		return span > 0 ? (spentAt(t) - spentAt(t - span)) / span : 0;
	}
	/** A spend value with its unit, when there is one. */
	function amount(value: number): string {
		return unit ? `${formatValue(value)} ${unit}` : formatValue(value);
	}

	function localT(event: PointerEvent): number {
		const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
		const px = Math.min(innerW, Math.max(0, event.clientX - rect.left - PAD.left));
		return Math.min(last?.t ?? 0, x.invert(px));
	}
	function handleKey(event: KeyboardEvent): void {
		if (!last) return;
		const stepT = tEnd / 40;
		if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
			event.preventDefault();
			const from = activeT ?? (event.key === 'ArrowRight' ? 0 : last.t);
			activeT = Math.max(0, Math.min(last.t, from + (event.key === 'ArrowRight' ? stepT : -stepT)));
		} else if (event.key === 'Enter' && activeT !== null) {
			onSelectPoint?.({ t: activeT, spent: spentAt(activeT) });
		} else if (event.key === 'Escape') activeT = null;
	}

	let pctUsed = $derived(budget ? (spentShown.current / budget) * 100 : null);
	let tone = $derived(pctUsed === null || limit !== undefined ? 'text-fg-main' : pctUsed >= 90 ? 'text-status-danger' : pctUsed >= 75 ? 'text-status-warning' : 'text-fg-main');
	let visibleMarks = $derived(marks.filter((m) => m.t <= (last?.t ?? 0)));
	const MARK_TONE: Record<NonNullable<RunMark['kind']>, string> = {
		handoff: 'fill-accent-primary',
		tool: 'fill-fg-light',
		decision: 'fill-status-info',
		error: 'fill-status-danger',
		done: 'fill-status-success'
	};
</script>

<div {...rest} class={cn('rounded-card border border-card-border bg-card-bg p-4 ak-shadow-btn', className)}>
	<header class="mb-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
		<div>
			{#if title}<h3 class="text-sm font-semibold text-fg-main">{title}</h3>{/if}
			<p class="mt-1 flex items-baseline gap-1.5">
				<span class={cn('text-[22px] leading-none font-semibold tabular-nums transition-colors duration-300', tone)}>{formatValue(Math.round(spentShown.current))}</span>
				{#if budget}<span class="text-[13px] text-fg-light">of {amount(budget)}</span>{/if}
			</p>
		</div>
		<dl class="flex gap-5 text-[11px]">
			<div>
				<dt class="text-fg-light">Burn rate</dt>
				<dd class="mt-0.5 flex items-center gap-1 font-medium text-fg-main tabular-nums"><Flame class={cn('size-3', over && limit === undefined ? 'text-status-danger' : 'text-status-warning')} aria-hidden="true" />{formatCompact(Math.round(burn.rate * rateScale))}{rateLabel}</dd>
			</div>
			{#if toEnd}
				<div>
					<dt class="text-fg-light">Projected at end</dt>
					<dd class={cn('mt-0.5 font-medium tabular-nums', budget && ahead.spent > budget ? 'text-status-danger' : 'text-fg-main')}>{formatValue(Math.round(ahead.spent))}</dd>
				</div>
			{/if}
			{#if budget}
				<div>
					<dt class="text-fg-light">{budgetLabel}</dt>
					{#key over}
						<dd class={cn('mt-0.5 font-medium', over ? ink.word : 'text-status-success')} in:rise={{ y: 4, duration: 180 }}>
							{#if burn.crossesAt === null}{limit === undefined ? `${Math.round(pctUsed ?? 0)}% used` : 'Not reached'}{:else if limit !== undefined}{passed ? 'Passed' : `Reached ${formatTime(burn.crossesAt)}`}{:else}{passed ? 'Over' : 'Runs out'} at {formatTime(burn.crossesAt)}{/if}
						</dd>
					{/key}
				</div>
			{/if}
		</dl>
	</header>

	<div class="relative" bind:clientWidth={width}>
		<svg
			{width}
			{height}
			class="block cursor-crosshair touch-none overflow-visible outline-none select-none focus-visible:rounded-control focus-visible:ring-2 focus-visible:ring-accent-primary/40"
			role="slider"
			aria-label="{title ?? label}. Use the arrow keys to step through time."
			aria-valuemin={0}
			aria-valuemax={Math.round(last?.t ?? 0)}
			aria-valuenow={Math.round(activeT ?? 0)}
			aria-valuetext={activeT === null ? 'No time selected' : `${formatTime(activeT)}: ${amount(Math.round(spentAt(activeT)))}`}
			tabindex="0"
			onpointermove={(e) => (activeT = localT(e))}
			onpointerleave={() => (activeT = null)}
			onclick={() => activeT !== null && onSelectPoint?.({ t: activeT, spent: spentAt(activeT) })}
			onkeydown={handleKey}
		>
			<defs>
				<clipPath id="{uid}-reveal"><rect x="0" y={-PAD.top} width={innerW * reveal.current} height={height} /></clipPath>
				<linearGradient id="{uid}-fill" x1="0" x2="0" y1="0" y2="1">
					<stop offset="0" stop-color="var(--ak-color-accent)" stop-opacity="0.28" />
					<stop offset="1" stop-color="var(--ak-color-accent)" stop-opacity="0.02" />
				</linearGradient>
			</defs>
			<g transform="translate({PAD.left},{PAD.top})">
				{#if budget && limit === undefined}
					{@const y75 = Math.max(0, y(budget * 0.75))}
					{@const y90 = Math.max(0, y(budget * 0.9))}
					<rect x="0" y={y90} width={innerW} height={Math.max(0, y75 - y90)} class="fill-status-warning-subtle/60" />
					<rect x="0" y="0" width={innerW} height={y90} class="fill-status-danger-subtle/30" />
				{/if}
				{#each yTicks as t (t)}
					<g transform="translate(0,{y(t)})">
						<line x2={innerW} class="stroke-canvas-border" stroke-dasharray={t === 0 ? undefined : '2 4'} />
						<text x="-8" dy="0.32em" text-anchor="end" class="fill-fg-light text-[10px] tabular-nums">{formatValue(t)}</text>
					</g>
				{/each}
				{#each xTicks as t (t)}
					<text x={x(t)} y={innerH + 16} text-anchor="middle" class="fill-fg-light text-[10px] tabular-nums">{formatTime(t)}</text>
				{/each}

				{#if budget}
					<line x1="0" x2={innerW} y1={y(budget)} y2={y(budget)} class={ink.line} stroke-width="1.5" stroke-dasharray="6 4" />
					<text x={innerW + 6} y={y(budget) + (toEnd && Math.abs(y(ahead.spent) - y(budget)) < 12 ? (ahead.spent > budget ? 6 : -6) : 0)} dy="0.32em" class={cn(ink.text, 'text-[10px] font-medium')}>{budgetLabel}</text>
				{/if}

				<g clip-path="url(#{uid}-reveal)">
					{#if line.length > 1}
						<path d={areaPath(line, line.map(([px]) => [px, innerH] as [number, number]))} fill="url(#{uid}-fill)" />
						<path d={linePath(line)} fill="none" class="stroke-accent-primary" stroke-width="2" stroke-linejoin="round" />
					{/if}
				</g>

				{#if last && projecting}
					<line
						x1={x(last.t)}
						y1={y(last.spent)}
						x2={x(ahead.t)}
						y2={y(ahead.spent)}
						class={cn('ak-burn-projection transition-colors duration-300', budget && ahead.spent > budget ? 'stroke-status-danger' : 'stroke-fg-light')}
						stroke-width="1.5"
						stroke-dasharray="4 4"
						style:opacity={reveal.current}
					/>
					{#if toEnd}
						<text x={x(tEnd) + 6} y={y(ahead.spent) + (budget && Math.abs(y(ahead.spent) - y(budget)) < 12 ? (ahead.spent > budget ? -10 : 10) : 0)} dy="0.32em" class={cn('text-[10px] tabular-nums', budget && ahead.spent > budget ? 'fill-status-danger' : 'fill-fg-light')} style:opacity={reveal.current}>{formatValue(Math.round(ahead.spent))}</text>
					{/if}
				{/if}
				{#if budget && burn.crossesAt !== null && burn.crossesAt <= tEnd}
					<g transform="translate({x(burn.crossesAt)},{y(budget)})" style:opacity={reveal.current}>
						<circle r="9" class={cn('ak-burn-ring', ink.ring)} />
						<circle r="4" class={cn(ink.dot, 'stroke-card-bg')} stroke-width="2" />
					</g>
				{/if}

				{#if last}
					<circle cx={x(last.t)} cy={y(last.spent)} r="4" class="fill-accent-primary stroke-card-bg" stroke-width="2" style:opacity={reveal.current} />
				{/if}

				{#if activeT !== null}
					<line x1={x(activeT)} x2={x(activeT)} y1="0" y2={innerH} class="stroke-fg-main/40" />
					<circle cx={x(activeT)} cy={y(spentAt(activeT))} r="3.5" class="fill-card-bg stroke-accent-primary" stroke-width="2" />
				{/if}
			</g>
		</svg>

		{#each visibleMarks as m (m.id)}
			{@const mx = PAD.left + x(m.t)}
			{@const my = PAD.top + y(spentAt(m.t))}
			<button
				type="button"
				aria-label="{m.label} at {formatTime(m.t)}"
				class="group/mark absolute z-10 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full focus-visible:outline-none"
				style:left="{mx}px"
				style:top="{my}px"
				onpointerenter={() => (hoverMark = m.id)}
				onpointerleave={() => (hoverMark = null)}
				onfocus={() => (hoverMark = m.id)}
				onblur={() => (hoverMark = null)}
				onclick={() => onSelectMark?.(m)}
				in:rise={{ y: 4, duration: 200 }}
			>
				<svg width="12" height="12" viewBox="-6 -6 12 12" class="transition-transform duration-200 group-hover/mark:scale-150 group-focus-visible/mark:scale-150" aria-hidden="true">
					<rect x="-3.5" y="-3.5" width="7" height="7" rx="1.5" transform="rotate(45)" class={cn('stroke-card-bg', MARK_TONE[m.kind ?? 'tool'])} stroke-width="1.5" />
				</svg>
			</button>
		{/each}

		{#if hoverMark}
			{@const m = marks.find((mk) => mk.id === hoverMark)}
			{#if m}
				{@const left = PAD.left + x(m.t)}
				<div
					class={cn('pointer-events-none absolute z-20 rounded-chip border border-card-border bg-card-bg px-2.5 py-1.5 text-[11px] whitespace-nowrap shadow-soft', left > width / 2 ? '-translate-x-full' : '')}
					style:left="{left}px"
					style:top="{PAD.top + y(spentAt(m.t)) + 12}px"
					in:rise={{ y: 3, duration: 120 }}
				>
					<p class="font-medium text-fg-main">{m.label}</p>
					<p class="text-fg-light tabular-nums">{formatTime(m.t)} · {formatValue(Math.round(spentAt(m.t)))} spent</p>
				</div>
			{/if}
		{:else if activeT !== null}
			{@const left = PAD.left + x(activeT)}
			{@const spent = spentAt(activeT)}
			<div
				class={cn('pointer-events-none absolute top-0 z-20 min-w-36 rounded-chip border border-card-border bg-card-bg px-2.5 py-2 text-[11px] shadow-soft', left > width / 2 ? '-translate-x-[calc(100%+10px)]' : 'translate-x-2.5')}
				style:left="{left}px"
			>
				<p class="font-medium text-fg-main tabular-nums">{formatTime(activeT)}</p>
				<p class="mt-0.5 flex justify-between gap-3 tabular-nums"><span class="text-fg-light">Spent</span><span class="text-fg-main">{formatValue(Math.round(spent))}{#if budget && limit === undefined}<span class="ml-1 text-fg-light">{Math.round((spent / budget) * 100)}%</span>{/if}</span></p>
				<p class="flex justify-between gap-3 tabular-nums"><span class="text-fg-light">Rate</span><span class="text-fg-main">{formatCompact(Math.round(rateAt(activeT) * rateScale))}{rateLabel}</span></p>
			</div>
		{/if}
	</div>
</div>

<style>
	.ak-burn-projection {
		animation: ak-burn-march 0.9s linear infinite;
	}
	.ak-burn-ring {
		transform-box: fill-box;
		transform-origin: center;
		animation: ak-burn-ring 1.6s ease-out infinite;
	}
	@keyframes ak-burn-march {
		to {
			stroke-dashoffset: -8;
		}
	}
	@keyframes ak-burn-ring {
		from {
			transform: scale(0.6);
			opacity: 1;
		}
		to {
			transform: scale(1.6);
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.ak-burn-projection,
		.ak-burn-ring {
			animation: none;
		}
	}
</style>
