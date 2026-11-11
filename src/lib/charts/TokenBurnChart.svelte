<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Spring, Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { Flame } from '@lucide/svelte';
	import { rise } from '../state/motion.svelte';
	import { areaPath, formatClock, formatCompact, linePath, niceMax, projectBurn, scaleLinear, ticks } from './scale';
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
	let projecting = $derived(!!last && last.t < tEnd);
	let over = $derived(budget !== undefined && burn.crossesAt !== null);

	const yTop = new Tween(1, { duration: 420, easing: cubicOut });
	const spentShown = new Spring(0, { stiffness: 0.1, damping: 0.8 });
	const reveal = new Tween(0, { duration: 900, easing: cubicOut });
	let primed = false;
	$effect(() => {
		const instant = !primed || prefersReducedMotion.current;
		const top = Math.max(budget ?? 0, burn.projected, last?.spent ?? 0) * 1.08;
		void yTop.set(niceMax(top, 4), { duration: instant ? 0 : 420 });
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
	let xTicks = $derived(ticks(0, tEnd, Math.max(2, Math.floor(innerW / 90))));
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
		const before = spentAt(Math.max(0, t - 20));
		return (spentAt(t) - before) / Math.max(1, Math.min(20, t));
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
	let tone = $derived(pctUsed === null ? 'text-fg-main' : pctUsed >= 90 ? 'text-status-danger' : pctUsed >= 75 ? 'text-status-warning' : 'text-fg-main');
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
				<span class={cn('text-[22px] leading-none font-semibold tabular-nums transition-colors duration-300', tone)}>{formatCompact(Math.round(spentShown.current))}</span>
				{#if budget}<span class="text-[13px] text-fg-light">of {formatCompact(budget)} tokens</span>{/if}
			</p>
		</div>
		<dl class="flex gap-5 text-[11px]">
			<div>
				<dt class="text-fg-light">Burn rate</dt>
				<dd class="mt-0.5 flex items-center gap-1 font-medium text-fg-main tabular-nums"><Flame class={cn('size-3', over ? 'text-status-danger' : 'text-status-warning')} aria-hidden="true" />{formatCompact(Math.round(burn.rate * rateScale))}{rateLabel}</dd>
			</div>
			{#if projecting}
				<div>
					<dt class="text-fg-light">Projected at end</dt>
					<dd class={cn('mt-0.5 font-medium tabular-nums', budget && burn.projected > budget ? 'text-status-danger' : 'text-fg-main')}>{formatCompact(Math.round(burn.projected))}</dd>
				</div>
			{/if}
			{#if budget}
				<div>
					<dt class="text-fg-light">Budget</dt>
					{#key over}
						<dd class={cn('mt-0.5 font-medium', over ? 'text-status-danger' : 'text-status-success')} in:rise={{ y: 4, duration: 180 }}>
							{#if burn.crossesAt !== null}{last && burn.crossesAt <= last.t ? 'Over' : 'Runs out'} at {formatTime(burn.crossesAt)}{:else}{Math.round(pctUsed ?? 0)}% used{/if}
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
			aria-label="{title ?? 'Token burn'}. Use the arrow keys to step through time."
			aria-valuemin={0}
			aria-valuemax={Math.round(last?.t ?? 0)}
			aria-valuenow={Math.round(activeT ?? 0)}
			aria-valuetext={activeT === null ? 'No time selected' : `${formatTime(activeT)}: ${formatCompact(Math.round(spentAt(activeT)))} tokens`}
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
				{#if budget}
					{@const y75 = Math.max(0, y(budget * 0.75))}
					{@const y90 = Math.max(0, y(budget * 0.9))}
					<rect x="0" y={y90} width={innerW} height={Math.max(0, y75 - y90)} class="fill-status-warning-subtle/60" />
					<rect x="0" y="0" width={innerW} height={y90} class="fill-status-danger-subtle/30" />
				{/if}
				{#each yTicks as t (t)}
					<g transform="translate(0,{y(t)})">
						<line x2={innerW} class="stroke-canvas-border" stroke-dasharray={t === 0 ? undefined : '2 4'} />
						<text x="-8" dy="0.32em" text-anchor="end" class="fill-fg-light text-[10px] tabular-nums">{formatCompact(t)}</text>
					</g>
				{/each}
				{#each xTicks as t (t)}
					<text x={x(t)} y={innerH + 16} text-anchor="middle" class="fill-fg-light text-[10px] tabular-nums">{formatTime(t)}</text>
				{/each}

				{#if budget}
					<line x1="0" x2={innerW} y1={y(budget)} y2={y(budget)} class="stroke-status-danger" stroke-width="1.5" stroke-dasharray="6 4" />
					<text x={innerW + 6} y={y(budget) + (projecting && Math.abs(y(burn.projected) - y(budget)) < 12 ? (burn.projected > budget ? 6 : -6) : 0)} dy="0.32em" class="fill-status-danger text-[10px] font-medium">Budget</text>
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
						x2={x(tEnd)}
						y2={y(burn.projected)}
						class={cn('ak-burn-projection transition-colors duration-300', budget && burn.projected > budget ? 'stroke-status-danger' : 'stroke-fg-light')}
						stroke-width="1.5"
						stroke-dasharray="4 4"
						style:opacity={reveal.current}
					/>
					<text x={x(tEnd) + 6} y={y(burn.projected) + (budget && Math.abs(y(burn.projected) - y(budget)) < 12 ? (burn.projected > budget ? -10 : 10) : 0)} dy="0.32em" class={cn('text-[10px] tabular-nums', budget && burn.projected > budget ? 'fill-status-danger' : 'fill-fg-light')} style:opacity={reveal.current}>{formatCompact(Math.round(burn.projected))}</text>
				{/if}
				{#if budget && burn.crossesAt !== null && burn.crossesAt <= tEnd}
					<g transform="translate({x(burn.crossesAt)},{y(budget)})" style:opacity={reveal.current}>
						<circle r="9" class="ak-burn-ring fill-status-danger/20" />
						<circle r="4" class="fill-status-danger stroke-card-bg" stroke-width="2" />
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
					<p class="text-fg-light tabular-nums">{formatTime(m.t)} · {formatCompact(Math.round(spentAt(m.t)))} spent</p>
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
				<p class="mt-0.5 flex justify-between gap-3 tabular-nums"><span class="text-fg-light">Spent</span><span class="text-fg-main">{formatCompact(Math.round(spent))}{#if budget}<span class="ml-1 text-fg-light">{Math.round((spent / budget) * 100)}%</span>{/if}</span></p>
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
