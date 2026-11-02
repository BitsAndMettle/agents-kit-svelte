<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { ArrowDownRight, ArrowUpRight, Repeat, ZoomOut } from '@lucide/svelte';
	import { motionDuration, rise } from '../state/motion.svelte';
	import { areaPath, formatClock, formatCompact, linePath, niceMax, scaleLinear, seriesColor, stack, ticks } from './scale';
	import type { ModelEvent, ModelPoint, ModelSeries, PhaseBand } from './types';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		/** Shaded phase bands behind the stream. */
		phases: PhaseBand[];
		/** Throughput per model. Series should share sample times; missing samples count as 0. */
		series: ModelSeries[];
		/** Routing decisions to mark: escalations, fallbacks and swaps. */
		events?: ModelEvent[];
		/** Seconds since the run started; the active phase is the one containing it. */
		now?: number;
		title?: string;
		/** Unit for the y values. */
		unit?: string;
		/** Plot height in pixels. */
		height?: number;
		/** Model to emphasise; the rest dim. Pair with `onHighlight` to link charts. */
		highlight?: string | null;
		/** Called with a model id when the person hovers its layer or legend entry, and `null` after. */
		onHighlight?: (model: string | null) => void;
		/** Called when the person clicks a routing marker. */
		onSelectEvent?: (event: ModelEvent) => void;
		/** Called when the person clicks the stream (without dragging): the model under the pointer at that time. */
		onSelectPoint?: (point: ModelPoint) => void;
		/** Called when the person clicks a phase's label. */
		onSelectPhase?: (phase: PhaseBand) => void;
		class?: string;
	}

	let {
		phases,
		series,
		events = [],
		now,
		title,
		unit = 'tok/s',
		height = 220,
		highlight = null,
		onHighlight,
		onSelectEvent,
		onSelectPoint,
		onSelectPhase,
		class: className = '',
		...rest
	}: Props = $props();

	const PAD = { top: 26, right: 16, bottom: 24, left: 44 };
	const uid = $props.id();

	let width = $state(720);
	let hoverModel = $state<string | null>(null);
	let hoverEvent = $state<string | null>(null);
	let activeT = $state<number | null>(null);
	let brush = $state<{ from: number; to: number } | null>(null);
	let pointerY = $state<number | null>(null);
	let zoom = $state<[number, number] | null>(null);

	let xs = $derived([...new Set(series.flatMap((s) => s.points.map((p) => p.t)))].sort((a, b) => a - b));
	let maps = $derived(series.map((s) => new Map(s.points.map((p) => [p.t, p.value]))));
	let layers = $derived(stack(maps, xs));
	let peak = $derived(Math.max(0, ...layers.flatMap((layer) => layer.map((p) => p[2]))));
	let fullEnd = $derived(Math.max(now ?? 0, xs.at(-1) ?? 0, phases.at(-1)?.end ?? 0, 1));

	const d0 = new Tween(0, { duration: 420, easing: cubicOut });
	const d1 = new Tween(1, { duration: 420, easing: cubicOut });
	const yTop = new Tween(1, { duration: 420, easing: cubicOut });
	const reveal = new Tween(0, { duration: 900, easing: cubicOut });
	let primed = false;

	$effect(() => {
		const [a, b] = zoom ?? [0, fullEnd];
		const instant = !primed || prefersReducedMotion.current;
		void d0.set(a, { duration: instant ? 0 : 420 });
		void d1.set(b, { duration: instant ? 0 : 420 });
		void yTop.set(niceMax(peak * 1.05, 4), { duration: instant ? 0 : 420 });
		if (!primed) {
			primed = true;
			void reveal.set(1, { duration: motionDuration(900) });
		}
	});

	let innerW = $derived(Math.max(60, width - PAD.left - PAD.right));
	let innerH = $derived(Math.max(40, height - PAD.top - PAD.bottom));
	let x = $derived(scaleLinear([d0.current, d1.current], [0, innerW]));
	let y = $derived(scaleLinear([0, yTop.current], [innerH, 0]));
	let xTicks = $derived(ticks(d0.current, d1.current, Math.max(2, Math.floor(innerW / 90))));
	let yTicks = $derived(ticks(0, yTop.current, 3).filter((t) => t <= yTop.current + 1e-9));
	let focus = $derived(hoverModel ?? highlight);
	let activePhase = $derived(now === undefined ? null : (phases.find((p) => now >= p.start && now < p.end)?.id ?? null));

	function layerPath(i: number): string {
		const layer = layers[i] ?? [];
		return areaPath(
			layer.map(([t, , y1]) => [x(t), y(y1)]),
			layer.map(([t, y0]) => [x(t), y(y0)])
		);
	}
	/** The layer's top edge, only where the model is streaming (or ramping to or from it). */
	function topLine(i: number): string {
		const layer = layers[i] ?? [];
		const on = layer.map(([, y0, y1]) => y1 - y0 > 0);
		const runs: [number, number][][] = [];
		let run: [number, number][] = [];
		layer.forEach(([t, , y1], j) => {
			if (on[j] || on[j - 1] || on[j + 1]) run.push([x(t), y(y1)]);
			else if (run.length) {
				runs.push(run);
				run = [];
			}
		});
		if (run.length) runs.push(run);
		return runs.map((r) => linePath(r)).join('');
	}

	function localX(event: PointerEvent): number {
		const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
		return Math.min(innerW, Math.max(0, event.clientX - rect.left - PAD.left));
	}
	function nearestT(px: number): number | null {
		if (xs.length === 0) return null;
		const t = x.invert(px);
		return xs.reduce((best, v) => (Math.abs(v - t) < Math.abs(best - t) ? v : best), xs[0]);
	}
	function handleDown(event: PointerEvent): void {
		if (event.button !== 0) return;
		(event.currentTarget as SVGElement).setPointerCapture(event.pointerId);
		const px = localX(event);
		brush = { from: px, to: px };
	}
	function handleMove(event: PointerEvent): void {
		const px = localX(event);
		pointerY = event.clientY - (event.currentTarget as SVGElement).getBoundingClientRect().top - PAD.top;
		if (brush) brush = { ...brush, to: px };
		activeT = nearestT(px);
	}
	function handleUp(): void {
		if (brush && Math.abs(brush.to - brush.from) > 12) {
			const a = x.invert(Math.min(brush.from, brush.to));
			const b = x.invert(Math.max(brush.from, brush.to));
			zoom = [a, b];
		} else if (brush && activeT !== null) {
			const point = pointAt(activeT);
			if (point) onSelectPoint?.(point);
		}
		brush = null;
	}

	/** The model whose layer is under the pointer at `t`, else the busiest one. */
	function pointAt(t: number): ModelPoint | null {
		const phase = phases.find((p) => t >= p.start && t < p.end);
		const j = xs.indexOf(t);
		let best: ModelPoint | null = null;
		series.forEach((s, i) => {
			const value = maps[i]?.get(t) ?? 0;
			if (value <= 0) return;
			const band = layers[i]?.[j];
			if (band && pointerY !== null && pointerY <= y(band[1]) && pointerY >= y(band[2])) {
				best = { t, model: s.model, value, phase };
			}
		});
		if (best) return best;
		series.forEach((s, i) => {
			const value = maps[i]?.get(t) ?? 0;
			if (value > 0 && (!best || value > best.value)) best = { t, model: s.model, value, phase };
		});
		return best;
	}
	function resetZoom(): void {
		zoom = null;
	}
	function handleKey(event: KeyboardEvent): void {
		if (xs.length === 0) return;
		if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
			event.preventDefault();
			const i = activeT === null ? -1 : xs.indexOf(activeT);
			const next = event.key === 'ArrowRight' ? Math.min(xs.length - 1, i + 1) : Math.max(0, i < 0 ? xs.length - 1 : i - 1);
			activeT = xs[next];
		} else if (event.key === 'Enter' && activeT !== null) {
			const point = pointAt(activeT);
			if (point) onSelectPoint?.(point);
		} else if (event.key === 'Escape') {
			activeT = null;
			zoom = null;
		}
	}
	function setModel(model: string | null): void {
		hoverModel = model;
		onHighlight?.(model);
	}

	function eventIcon(kind: ModelEvent['kind']) {
		return kind === 'escalate' ? ArrowUpRight : kind === 'fallback' ? ArrowDownRight : Repeat;
	}
	function eventTone(kind: ModelEvent['kind']): string {
		return kind === 'escalate' ? 'text-status-info' : kind === 'fallback' ? 'text-status-warning' : 'text-fg-light';
	}
	function labelFor(model: string): string {
		return series.find((s) => s.model === model)?.label ?? model;
	}

	let visibleEvents = $derived(events.filter((e) => e.t >= d0.current - 1e-6 && e.t <= d1.current + 1e-6));
	let tipEvent = $derived(hoverEvent ? events.find((e) => e.id === hoverEvent) : undefined);
</script>

<div {...rest} class={cn('rounded-card border border-card-border bg-card-bg p-4 ak-shadow-btn', className)}>
	<header class="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
		<div class="flex items-center gap-2">
			{#if title}<h3 class="text-sm font-semibold text-fg-main">{title}</h3>{/if}
			{#if zoom}
				<button type="button" onclick={resetZoom} class="inline-flex items-center gap-1 rounded-full bg-canvas-secondary px-2 py-0.5 text-[11px] text-fg-main hover:bg-canvas-border" in:rise={{ y: 3, duration: 140 }}>
					<ZoomOut class="size-3" aria-hidden="true" />Reset zoom
				</button>
			{/if}
		</div>
		<ul class="flex flex-wrap items-center gap-1" aria-label="Models">
			{#each series as s, i (s.model)}
				<li>
					<button
						type="button"
						onpointerenter={() => setModel(s.model)}
						onpointerleave={() => setModel(null)}
						onfocus={() => setModel(s.model)}
						onblur={() => setModel(null)}
						class={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[11px] transition-opacity duration-200 hover:bg-canvas-secondary', focus && focus !== s.model ? 'text-fg-light opacity-60' : 'text-fg-main')}
					>
						<span class="size-2 rounded-full" style:background={seriesColor(i)}></span>{s.label ?? s.model}
					</button>
				</li>
			{/each}
		</ul>
	</header>

	<div class="relative" bind:clientWidth={width}>
		<svg
			{width}
			{height}
			class="block cursor-crosshair touch-none overflow-visible outline-none select-none focus-visible:rounded-control focus-visible:ring-2 focus-visible:ring-accent-primary/40"
			role="slider"
			aria-label="{title ?? 'Model throughput by phase'}. Drag to zoom, double-click or Escape to reset."
			aria-valuemin={0}
			aria-valuemax={Math.round(fullEnd)}
			aria-valuenow={activeT ?? 0}
			aria-valuetext={activeT === null ? 'Use the arrow keys to step through time' : formatClock(activeT)}
			tabindex="0"
			onpointerdown={handleDown}
			onpointermove={handleMove}
			onpointerup={handleUp}
			onpointerleave={() => (activeT = brush ? activeT : null)}
			ondblclick={resetZoom}
			onkeydown={handleKey}
		>
			<defs>
				<clipPath id="{uid}-plot">
					<rect x="0" y={-PAD.top} width={innerW * reveal.current} height={height + PAD.top} />
				</clipPath>
			</defs>
			<g transform="translate({PAD.left},{PAD.top})">
				<!-- Phase bands -->
				<g clip-path="url(#{uid}-plot)">
					{#each phases as phase, i (phase.id)}
						{@const px0 = x(phase.start)}
						{@const px1 = x(phase.end)}
						<rect x={px0} y={-PAD.top + 4} width={Math.max(0, px1 - px0)} height={innerH + PAD.top - 4} class={cn('transition-colors duration-300', activePhase === phase.id ? 'fill-accent-subtle/70' : i % 2 ? 'fill-canvas-secondary/60' : 'fill-transparent')} />
					{/each}
				</g>
				{#each phases as phase (phase.id)}
					{@const px0 = Math.max(0, x(phase.start))}
					{@const px1 = Math.min(innerW, x(phase.end))}
					{#if px1 - px0 > 40 && !onSelectPhase}
						<text x={px0 + 6} y={-PAD.top + 16} class={cn('text-[10px] font-medium uppercase tracking-wide transition-colors duration-300', activePhase === phase.id ? 'fill-accent-primary' : 'fill-fg-light')}>{phase.label}</text>
					{/if}
				{/each}

				{#each yTicks as t (t)}
					<g transform="translate(0,{y(t)})">
						<line x2={innerW} class="stroke-canvas-border" stroke-dasharray={t === 0 ? undefined : '2 4'} />
						<text x="-8" dy="0.32em" text-anchor="end" class="fill-fg-light text-[10px] tabular-nums">{formatCompact(t)}</text>
					</g>
				{/each}
				{#each xTicks as t (t)}
					<text x={x(t)} y={innerH + 16} text-anchor="middle" class="fill-fg-light text-[10px] tabular-nums">{formatClock(t)}</text>
				{/each}

				<!-- Stream -->
				<g clip-path="url(#{uid}-plot)">
					<svg width={innerW} height={innerH} class="overflow-hidden">
						{#each series as s, i (s.model)}
							<g
								role="presentation"
								style:opacity={focus && focus !== s.model ? 0.18 : 1}
								class="transition-opacity duration-200"
								onpointerenter={() => setModel(s.model)}
								onpointerleave={() => setModel(null)}
							>
								<path d={layerPath(i)} style:fill={seriesColor(i)} fill-opacity="0.55" />
								<path d={topLine(i)} fill="none" style:stroke={seriesColor(i)} stroke-width="1.5" />
							</g>
						{/each}
					</svg>
				</g>

				<!-- Routing markers -->
				{#each visibleEvents as ev (ev.id)}
					{@const ex = x(ev.t)}
					<g class={cn('transition-opacity duration-200', eventTone(ev.kind))} style:opacity={hoverEvent && hoverEvent !== ev.id ? 0.4 : 1}>
						<line x1={ex} x2={ex} y1="0" y2={innerH} class="stroke-current" stroke-dasharray="3 3" />
					</g>
				{/each}

				{#if activeT !== null && !brush}
					<line x1={x(activeT)} x2={x(activeT)} y1="0" y2={innerH} class="stroke-fg-main/40" />
				{/if}
				{#if now !== undefined && now <= d1.current}
					<line x1={x(now)} x2={x(now)} y1={-PAD.top + 4} y2={innerH} class="stroke-accent-primary" stroke-width="1.5" />
				{/if}
				{#if brush}
					<rect x={Math.min(brush.from, brush.to)} y="0" width={Math.abs(brush.to - brush.from)} height={innerH} class="fill-accent-primary/10 stroke-accent-primary/50" />
				{/if}
			</g>
		</svg>

		{#if onSelectPhase}
			{#each phases as phase (phase.id)}
				{@const px0 = Math.max(0, x(phase.start))}
				{@const px1 = Math.min(innerW, x(phase.end))}
				{#if px1 - px0 > 40}
					<button
						type="button"
						onclick={() => onSelectPhase?.(phase)}
						class={cn(
							'absolute top-1 z-10 rounded-full px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase transition-colors hover:bg-card-bg hover:text-fg-main hover:shadow-soft-sm focus-visible:ring-2 focus-visible:ring-accent-primary/50 focus-visible:outline-none',
							activePhase === phase.id ? 'text-accent-primary' : 'text-fg-light'
						)}
						style:left="{PAD.left + px0 + 2}px"
					>{phase.label}</button>
				{/if}
			{/each}
		{/if}

		<!-- Marker buttons (HTML so they are focusable and get icons) -->
		{#each visibleEvents as ev (ev.id)}
			{@const Icon = eventIcon(ev.kind)}
			<button
				type="button"
				aria-label="{ev.kind} from {labelFor(ev.from)} to {labelFor(ev.to)} at {formatClock(ev.t)}"
				class={cn('absolute z-10 grid size-5 -translate-x-1/2 place-items-center rounded-full border border-card-border bg-card-bg shadow-soft-sm transition-transform duration-200 hover:scale-125 focus-visible:scale-125', eventTone(ev.kind))}
				style:left="{PAD.left + x(ev.t)}px"
				style:top="{PAD.top + innerH - 10}px"
				onpointerenter={() => (hoverEvent = ev.id)}
				onpointerleave={() => (hoverEvent = null)}
				onfocus={() => (hoverEvent = ev.id)}
				onblur={() => (hoverEvent = null)}
				onclick={() => onSelectEvent?.(ev)}
				in:rise={{ y: 6, duration: 240 }}
			>
				<span class="absolute inset-0 animate-ping rounded-full bg-current opacity-30 [animation-iteration-count:2]"></span>
				<Icon class="relative size-3" aria-hidden="true" />
			</button>
		{/each}

		{#if tipEvent}
			{@const left = PAD.left + x(tipEvent.t)}
			<div
				class={cn('pointer-events-none absolute z-20 w-56 rounded-chip border border-card-border bg-card-bg p-2.5 text-[11px] shadow-soft', left > width / 2 ? '-translate-x-full' : '')}
				style:left="{left}px"
				style:top="{PAD.top + innerH - 72}px"
				in:rise={{ y: 3, duration: 120 }}
			>
				<p class={cn('font-medium capitalize', eventTone(tipEvent.kind))}>{tipEvent.kind} · {formatClock(tipEvent.t)}</p>
				<p class="mt-0.5 font-mono text-fg-main">{labelFor(tipEvent.from)} → {labelFor(tipEvent.to)}</p>
				{#if tipEvent.reason}<p class="mt-1 text-fg-light">{tipEvent.reason}</p>{/if}
			</div>
		{:else if activeT !== null && !brush}
			{@const left = PAD.left + x(activeT)}
			<div
				class={cn('pointer-events-none absolute top-6 z-20 min-w-36 rounded-chip border border-card-border bg-card-bg px-2.5 py-2 text-[11px] shadow-soft', left > width / 2 ? '-translate-x-[calc(100%+10px)]' : 'translate-x-2.5')}
				style:left="{left}px"
			>
				<p class="mb-1 font-medium text-fg-main tabular-nums">{formatClock(activeT)} · {phases.find((p) => activeT !== null && activeT >= p.start && activeT < p.end)?.label ?? ''}</p>
				{#each series as s, i (s.model)}
					{@const v = maps[i]?.get(activeT) ?? 0}
					{#if v > 0}
						<p class="flex items-center justify-between gap-3 tabular-nums text-fg-main">
							<span class="flex items-center gap-1.5 font-mono"><span class="size-1.5 rounded-full" style:background={seriesColor(i)}></span>{s.label ?? s.model}</span>
							<span>{formatCompact(v)} {unit}</span>
						</p>
					{/if}
				{/each}
				{#if onSelectPoint}<p class="mt-1.5 border-t border-canvas-border pt-1.5 text-accent-primary">Click for details · drag to zoom</p>{/if}
			</div>
		{/if}
	</div>
</div>
