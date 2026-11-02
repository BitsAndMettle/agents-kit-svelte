<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Tween, Spring, prefersReducedMotion } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { SvelteSet } from 'svelte/reactivity';
	import { Sparkles } from '@lucide/svelte';
	import { rise, motionDuration } from '../state/motion.svelte';
	import { areaPath, formatCompact, linePath, niceMax, scaleLinear, seriesColor, ticks } from './scale';
	import type { ChartPoint, ChartSpec } from './types';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		/** The chart an agent described: kind, rows, fields and optional annotations. */
		spec: ChartSpec;
		/** Plot height in pixels. */
		height?: number;
		/** Series to emphasise; the rest dim. Pair with `onHighlight` to link charts. */
		highlight?: string | null;
		/** Called when the person hovers a legend item or leaves it (`null`). */
		onHighlight?: (series: string | null) => void;
		/** Called when the person clicks a point or presses Enter on it: open a detail view, ask the agent, filter. */
		onSelectPoint?: (point: ChartPoint) => void;
		/** Hint shown in the tooltip when `onSelectPoint` is set. */
		actionLabel?: string;
		class?: string;
	}

	let {
		spec,
		height = 240,
		highlight = null,
		onHighlight,
		onSelectPoint,
		actionLabel = 'Click for details',
		class: className = '',
		...rest
	}: Props = $props();

	const uid = $props.id();
	const PAD = { top: 16, right: 16, bottom: 28, left: 44 };

	let width = $state(640);
	let hidden = new SvelteSet<string>();
	let hoverSeries = $state<string | null>(null);
	let activeIndex = $state<number | null>(null);
	let pointerY = $state<number | null>(null);

	let seriesNames = $derived.by(() => {
		if (!spec.series) return [spec.y];
		const field = spec.series;
		const inData: string[] = [];
		for (const row of spec.data) {
			const name = String(row[field] ?? '');
			if (!inData.includes(name)) inData.push(name);
		}
		const ordered = (spec.seriesOrder ?? []).filter((name) => inData.includes(name));
		return [...ordered, ...inData.filter((name) => !ordered.includes(name))];
	});

	let numericX = $derived(spec.kind !== 'bar' && spec.data.length > 0 && spec.data.every((row) => typeof row[spec.x] === 'number'));

	/** Distinct x values in display order. */
	let xs = $derived.by(() => {
		const seen: (string | number)[] = [];
		for (const row of spec.data) {
			const v = row[spec.x];
			if (v === null || v === undefined) continue;
			if (!seen.includes(v)) seen.push(v);
		}
		return numericX ? (seen as number[]).sort((a, b) => a - b) : seen;
	});

	/** series → x → y */
	let values = $derived.by(() => {
		const map = new Map<string, Map<string | number, number>>();
		for (const name of seriesNames) map.set(name, new Map());
		for (const row of spec.data) {
			const name = spec.series ? String(row[spec.series] ?? '') : spec.y;
			const x = row[spec.x];
			const y = row[spec.y];
			if (x === null || x === undefined || typeof y !== 'number') continue;
			map.get(name)?.set(x, y);
		}
		return map;
	});

	let visible = $derived(seriesNames.filter((name) => !hidden.has(name)));
	let focus = $derived(hoverSeries ?? highlight);

	let targetYMax = $derived.by(() => {
		let max = 0;
		for (const name of visible) for (const v of values.get(name)?.values() ?? []) max = Math.max(max, v);
		return niceMax(max, 5);
	});

	const DURATION = 480;
	const yMax = new Tween(1, { duration: DURATION, easing: cubicOut });
	const xMin = new Tween(0, { duration: DURATION, easing: cubicOut });
	const xMax = new Tween(1, { duration: DURATION, easing: cubicOut });
	const progress = new Tween(0, { duration: 900, easing: cubicOut });
	const cursor = new Spring(0, { stiffness: 0.2, damping: 0.8 });

	let started = false;
	$effect(() => {
		const instant = !started || prefersReducedMotion.current;
		void yMax.set(targetYMax, { duration: instant ? 0 : DURATION });
		if (numericX && xs.length > 0) {
			void xMin.set(xs[0] as number, { duration: instant ? 0 : DURATION });
			void xMax.set(Math.max((xs.at(-1) as number) ?? 1, (xs[0] as number) + 1e-6), { duration: instant ? 0 : DURATION });
		}
		if (!started) {
			started = true;
			void progress.set(1, { duration: motionDuration(900) });
		}
	});

	let innerW = $derived(Math.max(40, width - PAD.left - PAD.right));
	let innerH = $derived(Math.max(40, height - PAD.top - PAD.bottom));
	let y = $derived(scaleLinear([0, yMax.current], [innerH, 0]));
	let xNum = $derived(scaleLinear([xMin.current, xMax.current], [0, innerW]));
	let band = $derived(innerW / Math.max(1, xs.length));

	/** Pixel x for the value at index `i`. */
	function xAt(i: number): number {
		if (numericX) return xNum(xs[i] as number);
		if (spec.kind === 'bar') return band * i + band / 2;
		return xs.length <= 1 ? innerW / 2 : (i / (xs.length - 1)) * innerW;
	}

	function pointsFor(name: string): [number, number][] {
		const series = values.get(name);
		const out: [number, number][] = [];
		xs.forEach((x, i) => {
			const v = series?.get(x);
			if (v !== undefined) out.push([xAt(i), y(v)]);
		});
		return out;
	}

	let yTicks = $derived(ticks(0, yMax.current, 5).filter((t) => t <= yMax.current + 1e-9));
	let xTickIdx = $derived.by(() => {
		const max = Math.max(1, Math.floor(innerW / 72));
		const step = Math.max(1, Math.ceil(xs.length / max));
		return xs.map((_, i) => i).filter((i) => i % step === 0);
	});

	function fmtY(v: number): string {
		return `${formatCompact(v)}${spec.unit && spec.unit.length <= 2 ? spec.unit : ''}`;
	}
	function fmtX(v: string | number): string {
		return typeof v === 'number' ? formatCompact(v) : v;
	}

	function opacityFor(name: string): number {
		return focus && focus !== name ? 0.22 : 1;
	}

	function nearestIndex(px: number): number {
		let best = 0;
		let dist = Infinity;
		xs.forEach((_, i) => {
			const d = Math.abs(xAt(i) - px);
			if (d < dist) {
				dist = d;
				best = i;
			}
		});
		return best;
	}

	function handleMove(event: PointerEvent): void {
		const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
		pointerY = event.clientY - rect.top - PAD.top;
		setActive(nearestIndex(event.clientX - rect.left - PAD.left));
	}

	function setActive(i: number | null): void {
		activeIndex = i;
		if (i !== null) void cursor.set(xAt(i), { instant: prefersReducedMotion.current });
	}

	/** The point at the active x: the focused series, else the one nearest the pointer, else the largest. */
	function pointAt(i: number): ChartPoint | null {
		const x = xs[i];
		let best: ChartPoint | null = null;
		let bestScore = Infinity;
		for (const name of visible) {
			const v = values.get(name)?.get(x);
			if (v === undefined) continue;
			if (focus === name) return { x, y: v, series: name };
			const score = pointerY === null ? -v : Math.abs(y(v) - pointerY);
			if (score < bestScore) {
				bestScore = score;
				best = { x, y: v, series: name };
			}
		}
		return best;
	}

	function handleKey(event: KeyboardEvent): void {
		if (xs.length === 0) return;
		if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
			event.preventDefault();
			const delta = event.key === 'ArrowRight' ? 1 : -1;
			setActive(Math.min(xs.length - 1, Math.max(0, (activeIndex ?? (delta > 0 ? -1 : xs.length)) + delta)));
		} else if (event.key === 'Enter' && activeIndex !== null) {
			const point = pointAt(activeIndex);
			if (point) onSelectPoint?.(point);
		} else if (event.key === 'Escape') {
			activeIndex = null;
		}
	}

	function handleClick(): void {
		if (activeIndex === null) return;
		const point = pointAt(activeIndex);
		if (point) onSelectPoint?.(point);
	}

	function toggleSeries(name: string): void {
		if (hidden.has(name)) hidden.delete(name);
		else if (visible.length > 1) hidden.add(name);
	}

	function setHover(name: string | null): void {
		hoverSeries = name;
		onHighlight?.(name);
	}

	/** Bar `i` of series `s` grows in after the ones before it. */
	function barProgress(i: number, s: number): number {
		const order = (i * seriesNames.length + s) / Math.max(1, xs.length * seriesNames.length);
		return Math.min(1, Math.max(0, (progress.current - order * 0.45) / 0.55));
	}

	let annotations = $derived(
		(spec.annotations ?? []).flatMap((note) => {
			const i = xs.findIndex((x) => x === note.x);
			const name = note.series ?? visible[0];
			const v = values.get(name)?.get(note.x);
			if (i < 0 || v === undefined || hidden.has(name)) return [];
			let px = xAt(i);
			if (spec.kind === 'bar') {
				const present = visible.filter((n) => values.get(n)?.get(note.x) !== undefined);
				const barW = Math.min(36, (band * 0.72) / Math.max(1, present.length));
				px += -((barW * present.length) / 2) + present.indexOf(name) * barW + barW / 2;
			}
			return [{ ...note, series: name, px: px + PAD.left, py: y(v) + PAD.top }];
		})
	);
	let settled = $derived(progress.current >= 0.999);
	let activePoint = $derived(activeIndex !== null ? pointAt(activeIndex) : null);
	let summary = $derived(
		`${spec.title ?? 'Chart'}: ${spec.kind} chart of ${spec.y} by ${spec.x}, ${seriesNames.length} series, ${xs.length} points.`
	);
</script>

<div {...rest} class={cn('relative rounded-card border border-card-border bg-card-bg p-4 ak-shadow-btn', className)}>
	{#if spec.title || spec.subtitle}
		<header class="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
			<div class="min-w-0">
				{#if spec.title}<h3 class="text-sm font-semibold text-fg-main">{spec.title}</h3>{/if}
				{#if spec.subtitle}<p class="mt-0.5 text-xs text-fg-light">{spec.subtitle}</p>{/if}
			</div>
			{#if seriesNames.length > 1}
				<ul class="flex flex-wrap items-center gap-1" aria-label="Series">
					{#each seriesNames as name, s (name)}
						<li>
							<button
								type="button"
								aria-pressed={!hidden.has(name)}
								onclick={() => toggleSeries(name)}
								onpointerenter={() => setHover(name)}
								onpointerleave={() => setHover(null)}
								onfocus={() => setHover(name)}
								onblur={() => setHover(null)}
								class={cn(
									'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] transition-[opacity,background-color] duration-200 hover:bg-canvas-secondary',
									hidden.has(name) ? 'text-fg-light opacity-50' : 'text-fg-main'
								)}
							>
								<span class="size-2 rounded-full transition-transform duration-200" style:background={seriesColor(s)} style:transform={hidden.has(name) ? 'scale(0.5)' : 'scale(1)'}></span>
								{name}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</header>
	{/if}

	<div class="relative" bind:clientWidth={width}>
		<svg
			{width}
			{height}
			class={cn('block touch-none overflow-visible outline-none focus-visible:rounded-control focus-visible:ring-2 focus-visible:ring-accent-primary/40', onSelectPoint && activeIndex !== null && 'cursor-pointer')}
			role="slider"
			aria-label={summary}
			aria-valuemin={0}
			aria-valuemax={Math.max(0, xs.length - 1)}
			aria-valuenow={activeIndex ?? 0}
			aria-valuetext={activePoint ? `${activePoint.series} at ${fmtX(activePoint.x)}: ${activePoint.y}${spec.unit ? ` ${spec.unit}` : ''}` : 'Use the arrow keys to read values'}
			tabindex="0"
			onpointermove={handleMove}
			onpointerleave={() => ((activeIndex = null), (pointerY = null))}
			onclick={handleClick}
			onkeydown={handleKey}
		>
			<defs>
				<clipPath id="{uid}-reveal">
					<rect x={-4} y={-PAD.top} width={progress.current * (innerW + 8)} height={height + PAD.top} />
				</clipPath>
				{#each seriesNames as name, s (name)}
					<linearGradient id="{uid}-fill-{s}" x1="0" x2="0" y1="0" y2="1">
						<stop offset="0%" style:stop-color={seriesColor(s)} stop-opacity="0.32" />
						<stop offset="100%" style:stop-color={seriesColor(s)} stop-opacity="0" />
					</linearGradient>
				{/each}
			</defs>

			<g transform="translate({PAD.left},{PAD.top})">
				{#each yTicks as t (t)}
					<g transform="translate(0,{y(t)})" class="text-fg-light">
						<line x2={innerW} class="stroke-canvas-border" stroke-dasharray={t === 0 ? undefined : '2 4'} />
						<text x={-8} dy="0.32em" text-anchor="end" class="fill-current text-[10px] tabular-nums">{fmtY(t)}</text>
					</g>
				{/each}
				{#each xTickIdx as i (xs[i])}
					<text x={xAt(i)} y={innerH + 18} text-anchor="middle" class="fill-fg-light text-[10px] tabular-nums">{fmtX(xs[i])}</text>
				{/each}

				{#if spec.kind === 'bar'}
					{#each xs as x, i (x)}
						{@const present = visible.filter((name) => values.get(name)?.get(x) !== undefined)}
						{@const barW = Math.min(36, (band * 0.72) / Math.max(1, present.length))}
						{#each present as name, k (name)}
							{@const s = seriesNames.indexOf(name)}
							{@const v = values.get(name)?.get(x) ?? 0}
							{@const h = (innerH - y(v)) * barProgress(i, s)}
							<rect
								x={xAt(i) - (barW * present.length) / 2 + k * barW + 1}
								y={innerH - h}
								width={Math.max(1, barW - 2)}
								height={Math.max(0, h)}
								rx="3"
								style:fill={seriesColor(s)}
								style:opacity={(activeIndex === null || activeIndex === i ? 1 : 0.55) * opacityFor(name)}
								class="transition-[opacity,x,width] duration-300"
							/>
						{/each}
					{/each}
				{:else}
					<g clip-path="url(#{uid}-reveal)">
						{#each visible as name (name)}
							{@const s = seriesNames.indexOf(name)}
							{@const pts = pointsFor(name)}
							<g style:opacity={opacityFor(name)} class="transition-opacity duration-200">
								{#if spec.kind === 'area'}
									<path d={areaPath(pts, pts.map(([px]) => [px, innerH]))} fill="url(#{uid}-fill-{s})" />
								{/if}
								<path d={linePath(pts)} fill="none" style:stroke={seriesColor(s)} stroke-width={focus === name ? 2.5 : 2} stroke-linecap="round" stroke-linejoin="round" />
								{#if pts.length > 0}
									{@const last = pts[pts.length - 1]}
									<circle cx={last[0]} cy={last[1]} r="3" style:fill={seriesColor(s)} />
								{/if}
							</g>
						{/each}
					</g>
				{/if}

				{#if activeIndex !== null}
					<line x1={cursor.current} x2={cursor.current} y1={0} y2={innerH} class="stroke-fg-light/40" stroke-dasharray="3 3" />
					{#if spec.kind !== 'bar'}
						{#each visible as name (name)}
							{@const v = values.get(name)?.get(xs[activeIndex])}
							{#if v !== undefined}
								<circle cx={xAt(activeIndex)} cy={y(v)} r="4.5" class="stroke-card-bg" stroke-width="2" style:fill={seriesColor(seriesNames.indexOf(name))} style:opacity={opacityFor(name)} />
							{/if}
						{/each}
					{/if}
				{/if}
			</g>
		</svg>

		{#if settled}
			{#each annotations as note, n (`${note.x}-${note.series}`)}
				<div
					class="pointer-events-none absolute z-10"
					style:left="{note.px}px"
					style:top="{note.py}px"
					in:rise={{ y: 6, duration: 220, delay: 120 + n * 140 }}
				>
					<span class="absolute -top-1 -left-1 size-2 rounded-full bg-fg-main ring-2 ring-card-bg"></span>
					<span class="absolute -top-1 -left-1 size-2 animate-ping rounded-full bg-fg-main/40 [animation-iteration-count:2]"></span>
					<div class={cn('absolute w-max max-w-48', note.py < 72 ? 'top-3' : 'bottom-3', 'rounded-chip border border-card-border bg-card-bg px-2 py-1 text-[11px] leading-snug shadow-soft-sm', note.px > width * 0.6 ? 'right-0' : '-left-2')}>
						<p class="font-medium text-fg-main">{note.label}</p>
						{#if note.note}<p class="text-fg-light">{note.note}</p>{/if}
					</div>
				</div>
			{/each}
		{/if}

		{#if activeIndex !== null && activePoint}
			{@const left = cursor.current + PAD.left}
			<div
				class={cn('pointer-events-none absolute top-2 z-20 min-w-32 rounded-chip border border-card-border bg-card-bg px-2.5 py-2 text-[11px] shadow-soft', left > width / 2 ? '-translate-x-[calc(100%+12px)]' : 'translate-x-3')}
				style:left="{left}px"
			>
				<p class="mb-1 font-medium text-fg-main">{spec.xLabel ? `${spec.xLabel} ` : ''}{fmtX(xs[activeIndex])}</p>
				{#each visible as name (name)}
					{@const v = values.get(name)?.get(xs[activeIndex])}
					{#if v !== undefined}
						<p class={cn('flex items-center justify-between gap-3 tabular-nums', focus && focus !== name ? 'text-fg-light' : 'text-fg-main')}>
							<span class="flex items-center gap-1.5"><span class="size-1.5 rounded-full" style:background={seriesColor(seriesNames.indexOf(name))}></span>{name}</span>
							<span>{formatCompact(v)}{spec.unit ? ` ${spec.unit}` : ''}</span>
						</p>
					{/if}
				{/each}
				{#if onSelectPoint}
					<p class="mt-1.5 flex items-center gap-1 border-t border-canvas-border pt-1.5 text-accent-primary"><Sparkles class="size-3" aria-hidden="true" />{actionLabel}</p>
				{/if}
			</div>
		{/if}
	</div>
</div>
