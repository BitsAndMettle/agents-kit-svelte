<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { draw, fade } from 'svelte/transition';
	import type { TransitionConfig } from 'svelte/transition';
	import { ArrowRightLeft, Clock } from '@lucide/svelte';
	import { motionDuration, rise } from '../state/motion.svelte';
	import { formatClock, formatCompact, niceStep, phaseColor, scaleLinear, ticks } from './scale';
	import type { HandoffLane, HandoffLink, HandoffSpan } from './types';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		/** One row per agent or model, top to bottom. */
		lanes: HandoffLane[];
		/** Stretches of work. A span with no `end` is running and grows to `now`. */
		spans: HandoffSpan[];
		/** Work passed between spans, drawn as arrows. */
		handoffs?: HandoffLink[];
		/** Seconds since the run started. Running spans end here and the cursor sits here. */
		now?: number;
		/** Heading over the chart. */
		title?: string;
		/** Lane to emphasise; the rest dim. Pair with `onHighlight` to link charts. */
		highlight?: string | null;
		/** Called with a lane id when the person hovers its row, and `null` when they leave. */
		onHighlight?: (laneId: string | null) => void;
		/** Called when the person clicks a span or presses Enter on it. */
		onSelectSpan?: (span: HandoffSpan) => void;
		class?: string;
	}

	let {
		lanes,
		spans,
		handoffs = [],
		now,
		title,
		highlight = null,
		onHighlight,
		onSelectSpan,
		class: className = '',
		...rest
	}: Props = $props();

	const LABEL_W = 136;
	const AXIS_H = 26;
	const LANE_H = 46;
	const BAR_H = 24;
	const PAD_R = 20;

	let width = $state(720);
	let hoverSpan = $state<string | null>(null);
	let hoverLink = $state<string | null>(null);
	let hoverLane = $state<string | null>(null);

	let latestEnd = $derived(Math.max(0, ...spans.map((s) => s.end ?? s.start)));
	let clock = $derived(now ?? latestEnd);
	let running = $derived(spans.some((s) => s.status === 'running'));

	/** Domain end leaves headroom while live so bars have room to grow. */
	const domainEnd = new Tween(60, { duration: 600, easing: cubicOut });
	let primed = false;
	$effect(() => {
		const end = Math.max(clock, latestEnd, 1);
		const target = running ? Math.ceil((end * 1.15) / niceStep(end, 6)) * niceStep(end, 6) : end;
		if (!primed || target > domainEnd.target || !running) {
			void domainEnd.set(target, { duration: !primed || prefersReducedMotion.current ? 0 : 600 });
			primed = true;
		}
	});

	let innerW = $derived(Math.max(80, width - LABEL_W - PAD_R));
	let x = $derived(scaleLinear([0, domainEnd.current], [LABEL_W, LABEL_W + innerW]));
	let height = $derived(AXIS_H + lanes.length * LANE_H + 8);
	let axisTicks = $derived(ticks(0, domainEnd.current, Math.max(2, Math.floor(innerW / 90))));

	let laneIndex = $derived(new Map(lanes.map((lane, i) => [lane.id, i])));
	let spanById = $derived(new Map(spans.map((s) => [s.id, s])));
	let ordered = $derived([...spans].sort((a, b) => Number(b.status === 'superseded') - Number(a.status === 'superseded')));

	function laneY(laneId: string): number {
		return AXIS_H + (laneIndex.get(laneId) ?? 0) * LANE_H + LANE_H / 2;
	}
	function spanEnd(span: HandoffSpan): number {
		return span.end ?? Math.max(span.start, clock);
	}

	/** Spans lit by the current hover: a link lights both ends, a span lights its neighbours. */
	let lit = $derived.by(() => {
		const ids = new Set<string>();
		if (hoverLink) {
			const link = handoffs.find((h) => h.id === hoverLink);
			if (link) ids.add(link.from).add(link.to);
		} else if (hoverSpan) {
			ids.add(hoverSpan);
			for (const h of handoffs) {
				if (h.from === hoverSpan) ids.add(h.to);
				if (h.to === hoverSpan) ids.add(h.from);
			}
		}
		return ids;
	});
	let laneFocus = $derived(hoverLane ?? highlight);

	function spanOpacity(span: HandoffSpan): number {
		const base = span.status === 'superseded' ? 0.6 : 1;
		if (lit.size > 0) return lit.has(span.id) ? base : base * 0.25;
		if (laneFocus) return span.lane === laneFocus ? base : base * 0.3;
		return base;
	}
	function linkOpacity(link: HandoffLink): number {
		if (hoverLink) return hoverLink === link.id ? 1 : 0.15;
		if (hoverSpan) return link.from === hoverSpan || link.to === hoverSpan ? 1 : 0.15;
		if (laneFocus) {
			const from = spanById.get(link.from);
			const to = spanById.get(link.to);
			return from?.lane === laneFocus || to?.lane === laneFocus ? 1 : 0.2;
		}
		return 0.75;
	}

	interface Route {
		link: HandoffLink;
		d: string;
		mx: number;
		my: number;
	}
	let routes = $derived.by(() =>
		handoffs.flatMap((link): Route[] => {
			const from = spanById.get(link.from);
			const to = spanById.get(link.to);
			if (!from || !to || from.end === undefined) return [];
			const x1 = x(from.end);
			const y1 = laneY(from.lane) + (laneY(to.lane) > laneY(from.lane) ? BAR_H / 2 : -BAR_H / 2);
			const x2 = x(to.start);
			const y2 = laneY(to.lane) + (laneY(to.lane) > laneY(from.lane) ? -BAR_H / 2 : BAR_H / 2);
			const bend = Math.max(18, Math.abs(y2 - y1) * 0.55);
			const d = `M${x1},${y1} C${x1},${y1 + Math.sign(y2 - y1 || 1) * bend} ${x2},${y2 - Math.sign(y2 - y1 || 1) * bend} ${x2},${y2}`;
			return [{ link, d, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 }];
		})
	);

	/** Grows a bar in from its left edge. */
	function grow(_node: Element, { delay = 0 }: { delay?: number } = {}): TransitionConfig {
		return {
			delay,
			duration: motionDuration(420),
			easing: cubicOut,
			css: (t) => `transform: scaleX(${t}); opacity: ${Math.min(1, t * 2)};`
		};
	}

	function select(span: HandoffSpan): void {
		onSelectSpan?.(span);
	}
	function handleSpanKey(event: KeyboardEvent, span: HandoffSpan): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			select(span);
		}
	}
	function setLane(id: string | null): void {
		hoverLane = id;
		onHighlight?.(id);
	}

	let tipSpan = $derived(hoverSpan ? spanById.get(hoverSpan) : undefined);
	let tipLane = $derived(tipSpan ? lanes.find((l) => l.id === tipSpan?.lane) : undefined);
	let phases = $derived([...new Set(spans.map((s) => s.phase))]);
	let tokenTotal = $derived(spans.reduce((sum, s) => sum + (s.tokens ?? 0), 0));

	function statusLabel(span: HandoffSpan): string {
		switch (span.status) {
			case 'running':
				return 'Running';
			case 'failed':
				return 'Failed';
			case 'superseded':
				return 'Superseded by a retry';
			default:
				return 'Done';
		}
	}
</script>

<div {...rest} class={cn('rounded-card border border-card-border bg-card-bg p-4 ak-shadow-btn', className)}>
	<header class="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
		<div class="flex min-w-0 items-center gap-2">
			{#if title}<h3 class="truncate text-sm font-semibold text-fg-main">{title}</h3>{/if}
			{#if running}
				<span class="inline-flex items-center gap-1 rounded-full bg-accent-subtle px-2 py-0.5 text-[11px] font-medium text-accent-primary" in:fade={{ duration: motionDuration(160) }}>
					<span class="size-1.5 animate-pulse rounded-full bg-accent-primary"></span>Live
				</span>
			{/if}
		</div>
		<dl class="flex items-center gap-3 text-[11px] text-fg-light tabular-nums">
			<div class="flex items-center gap-1"><Clock class="size-3" aria-hidden="true" /><dt class="sr-only">Elapsed</dt><dd>{formatClock(clock)}</dd></div>
			<div class="flex items-center gap-1"><ArrowRightLeft class="size-3" aria-hidden="true" /><dt class="sr-only">Handoffs</dt><dd>{routes.length} handoffs</dd></div>
			{#if tokenTotal > 0}<div><dt class="sr-only">Tokens</dt><dd>{formatCompact(tokenTotal)} tokens</dd></div>{/if}
		</dl>
	</header>

	<div class="relative" bind:clientWidth={width}>
		<svg {width} {height} class="block overflow-visible" aria-label={title ?? 'Agent handoff timeline'} role="group">
			<!-- Axis -->
			{#each axisTicks as t (t)}
				<g transform="translate({x(t)},0)" class="text-fg-light">
					<line y1={AXIS_H - 4} y2={height} class="stroke-canvas-border" stroke-dasharray="2 4" />
					<text y={AXIS_H - 10} text-anchor="middle" class="fill-current text-[10px] tabular-nums">{formatClock(t)}</text>
				</g>
			{/each}

			<!-- Lanes -->
			{#each lanes as lane, i (lane.id)}
				{@const top = AXIS_H + i * LANE_H}
				<g
					role="presentation"
					onpointerenter={() => setLane(lane.id)}
					onpointerleave={() => setLane(null)}
				>
					<rect x="0" y={top} width={width} height={LANE_H} class={cn('transition-colors duration-200', laneFocus === lane.id ? 'fill-canvas-secondary' : 'fill-transparent')} rx="8" />
					<text x="10" y={top + LANE_H / 2 - (lane.model ? 3 : -4)} class="fill-fg-main text-[12px] font-medium">{lane.label}</text>
					{#if lane.model}
						<text x="10" y={top + LANE_H / 2 + 11} class="fill-fg-light font-mono text-[10px]">{lane.model}</text>
					{/if}
				</g>
			{/each}

			<!-- Spans -->
			{#each ordered as span, i (span.id)}
				{@const ghost = span.status === 'superseded'}
				{@const bx = x(span.start)}
				{@const bw = Math.max(3, x(spanEnd(span)) - bx)}
				{@const by = laneY(span.lane) - (ghost ? BAR_H / 2 - 5 : BAR_H / 2)}
				{@const bh = ghost ? BAR_H - 10 : BAR_H}
				<g
					role="button"
					tabindex="0"
					aria-label="{span.label ?? span.phase}, {statusLabel(span)}, {formatClock(span.start)} to {formatClock(spanEnd(span))}"
					class="cursor-pointer outline-none"
					onpointerenter={() => (hoverSpan = span.id)}
					onpointerleave={() => (hoverSpan = null)}
					onfocus={() => (hoverSpan = span.id)}
					onblur={() => (hoverSpan = null)}
					onclick={() => select(span)}
					onkeydown={(event) => handleSpanKey(event, span)}
				>
					<g style="transform-box: fill-box; transform-origin: left center;" in:grow={{ delay: Math.min(i, 8) * 40 }}>
						<rect
							x={bx}
							width={bw}
							rx="6"
							style:y="{by}px"
							style:height="{bh}px"
							style:fill={phaseColor(span.phase, i)}
							style:opacity={spanOpacity(span)}
							style:fill-opacity={span.status === 'failed' ? 0.28 : ghost ? 0.5 : 0.9}
							style:stroke={span.status === 'failed' ? 'var(--ak-color-danger)' : phaseColor(span.phase, i)}
							stroke-width={lit.has(span.id) ? 2 : 1}
							stroke-dasharray={ghost ? '3 3' : undefined}
							class="transition-[opacity,y,height,stroke-width] duration-300 ease-out"
						/>
						{#if span.status === 'running'}
							<rect x={bx + bw - 3} y={by} width="3" height={bh} rx="1.5" class="animate-pulse fill-card-bg/80" />
						{/if}
						{#if span.label && bw > span.label.length * 6.2 + 14 && !ghost}
							<text
								x={bx + 8}
								y={by + bh / 2}
								dy="0.34em"
								class={cn('pointer-events-none text-[11px] font-medium', span.status === 'failed' ? 'fill-status-danger' : 'fill-white')}
								style:opacity={spanOpacity(span)}
							>{span.label}</text>
						{/if}
					</g>
				</g>
			{/each}

			<!-- Handoffs -->
			<defs>
				<marker id="ak-handoff-head" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M0,0 L8,4 L0,8 z" class="fill-fg-light" />
				</marker>
			</defs>
			{#each routes as route (route.link.id)}
				<g
					role="presentation"
					class="cursor-default"
					onpointerenter={() => (hoverLink = route.link.id)}
					onpointerleave={() => (hoverLink = null)}
				>
					<path d={route.d} fill="none" stroke="transparent" stroke-width="12" />
					<path
						d={route.d}
						fill="none"
						class="stroke-fg-light transition-opacity duration-200"
						stroke-width={hoverLink === route.link.id ? 2 : 1.5}
						stroke-linecap="round"
						marker-end="url(#ak-handoff-head)"
						style:opacity={linkOpacity(route.link)}
						in:draw={{ duration: motionDuration(520), easing: cubicOut }}
					/>
				</g>
			{/each}

			<!-- Now cursor -->
			{#if running}
				<g transform="translate({x(clock)},0)" class="pointer-events-none">
					<line y1={AXIS_H - 2} y2={height} class="stroke-accent-primary" stroke-width="1.5" />
					<circle cy={AXIS_H - 2} r="3.5" class="fill-accent-primary" />
					<circle cy={AXIS_H - 2} r="3.5" class="animate-ping fill-accent-primary/50" style="transform-box: fill-box; transform-origin: center;" />
				</g>
			{/if}
		</svg>

		<!-- Handoff artifact pills -->
		{#each routes as route (route.link.id)}
			<div
				class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
				style:left="{route.mx}px"
				style:top="{route.my}px"
				style:opacity={linkOpacity(route.link) > 0.5 ? 1 : 0.25}
				in:rise={{ y: 4, duration: 200, delay: 380 }}
			>
				<span
					role="presentation"
					onpointerenter={() => (hoverLink = route.link.id)}
					onpointerleave={() => (hoverLink = null)}
					class={cn(
						'pointer-events-auto block max-w-40 cursor-default truncate rounded-full border border-card-border bg-card-bg px-2 py-0.5 font-mono text-[10px] shadow-soft-sm transition-[transform,opacity] duration-200',
						hoverLink === route.link.id ? 'scale-110 text-fg-main' : 'text-fg-light'
					)}
				>{route.link.artifact}</span>
				{#if hoverLink === route.link.id && route.link.reason}
					<span class="absolute top-full left-1/2 mt-1.5 block w-max max-w-56 -translate-x-1/2 rounded-chip bg-fg-main px-2 py-1 text-[11px] text-fg-inverse" in:rise={{ y: 3, duration: 140 }}>{route.link.reason}</span>
				{/if}
			</div>
		{/each}

		<!-- Span tooltip -->
		{#if tipSpan}
			{@const left = Math.min(width - 200, Math.max(LABEL_W, x(tipSpan.start)))}
			<div
				class="pointer-events-none absolute z-20 w-48 rounded-chip border border-card-border bg-card-bg p-2.5 text-[11px] shadow-soft"
				style:left="{left}px"
				style:top="{laneY(tipSpan.lane) + BAR_H / 2 + 6}px"
				in:rise={{ y: 3, duration: 120 }}
			>
				<p class="flex items-center gap-1.5 font-medium text-fg-main">
					<span class="size-2 rounded-full" style:background={phaseColor(tipSpan.phase)}></span>
					<span class="capitalize">{tipSpan.phase}</span>
					{#if tipSpan.attempt}<span class="text-fg-light">· attempt {tipSpan.attempt}</span>{/if}
				</p>
				<p class="mt-0.5 text-fg-light">{tipLane?.label}{tipLane?.model ? ` · ${tipLane.model}` : ''}</p>
				<dl class="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 tabular-nums">
					<dt class="text-fg-light">Time</dt><dd class="text-right text-fg-main">{formatClock(spanEnd(tipSpan) - tipSpan.start)}</dd>
					{#if tipSpan.tokens}<dt class="text-fg-light">Tokens</dt><dd class="text-right text-fg-main">{formatCompact(tipSpan.tokens)}</dd>{/if}
					<dt class="text-fg-light">Status</dt><dd class={cn('text-right', tipSpan.status === 'failed' ? 'text-status-danger' : 'text-fg-main')}>{statusLabel(tipSpan)}</dd>
				</dl>
			</div>
		{/if}
	</div>

	{#if phases.length > 0}
		<ul class="mt-2 flex flex-wrap gap-3 text-[11px] text-fg-light" aria-label="Phases">
			{#each phases as phase, i (phase)}
				<li class="flex items-center gap-1.5 capitalize"><span class="size-2 rounded-sm" style:background={phaseColor(phase, i)}></span>{phase}</li>
			{/each}
			<li class="flex items-center gap-1.5"><span class="size-2 rounded-sm border border-dashed border-fg-light"></span>Superseded attempt</li>
		</ul>
	{/if}
</div>
