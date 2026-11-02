<script lang="ts">
	import AgentHandoffGantt from '$lib/charts/AgentHandoffGantt.svelte';
	import GenerativeChart from '$lib/charts/GenerativeChart.svelte';
	import ModelPhaseStream from '$lib/charts/ModelPhaseStream.svelte';
	import { eventsAt, handoffsAt, seriesAt, spansAt } from '$lib/charts/replay';
	import { formatClock } from '$lib/charts/scale';
	import type { ChartPoint, ChartSpec, HandoffSpan, ModelEvent } from '$lib/charts/types';
	import {
		SAMPLE_CHART_SPECS,
		SAMPLE_HANDOFFS,
		SAMPLE_HANDOFF_LANES,
		SAMPLE_HANDOFF_SPANS,
		SAMPLE_MODEL_EVENTS,
		SAMPLE_MODEL_SERIES,
		SAMPLE_PHASE_BANDS,
		SAMPLE_RUN_DURATION
	} from '$lib/fixtures/charts';
	import { buttonClass } from '$lib/ui/styles';
	import { cn } from '$lib/ui/cn';
	import { rise } from '$lib/state/motion.svelte';
	import { Pause, Play, RotateCcw, Sparkles } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';

	/** Playback speed: seconds of run per real second. */
	const SPEEDS = [4, 8, 16] as const;

	let t = $state(SAMPLE_RUN_DURATION);
	let playing = $state(false);
	let speed = $state<(typeof SPEEDS)[number]>(8);
	let linked = $state<string | null>(null);
	let selected = $state<string>('');
	let specKey = $state<keyof typeof SAMPLE_CHART_SPECS>('latency');
	let asked = $state<{ point: ChartPoint; answer: string } | null>(null);

	let spans = $derived(spansAt(SAMPLE_HANDOFF_SPANS, t));
	let handoffs = $derived(handoffsAt(SAMPLE_HANDOFFS, SAMPLE_HANDOFF_SPANS, t));
	let series = $derived(seriesAt(SAMPLE_MODEL_SERIES, t));
	let events = $derived(eventsAt(SAMPLE_MODEL_EVENTS, t));
	let live = $derived(t < SAMPLE_RUN_DURATION);

	/** Lane ↔ model, so hovering one chart lights the same agent in the other. */
	let laneHighlight = $derived(SAMPLE_HANDOFF_LANES.find((l) => l.id === linked || l.model === linked)?.id ?? null);
	let modelHighlight = $derived(SAMPLE_HANDOFF_LANES.find((l) => l.id === linked || l.model === linked)?.model ?? linked);

	let frame = 0;
	let last = 0;
	function tick(ts: number): void {
		if (!playing) return;
		const dt = last ? (ts - last) / 1000 : 0;
		last = ts;
		t = Math.min(SAMPLE_RUN_DURATION, t + dt * speed);
		if (t >= SAMPLE_RUN_DURATION) {
			playing = false;
			return;
		}
		frame = requestAnimationFrame(tick);
	}
	function play(): void {
		if (t >= SAMPLE_RUN_DURATION) t = 0;
		playing = true;
		last = 0;
		frame = requestAnimationFrame(tick);
	}
	function pause(): void {
		playing = false;
		cancelAnimationFrame(frame);
	}
	function restart(): void {
		pause();
		t = 0;
		play();
	}
	onMount(() => {
		if (!prefersReducedMotion.current) restart();
		return () => cancelAnimationFrame(frame);
	});

	function describeSpan(span: HandoffSpan): void {
		const lane = SAMPLE_HANDOFF_LANES.find((l) => l.id === span.lane);
		selected = `${lane?.label} ran ${span.phase} from ${formatClock(span.start)} to ${formatClock(span.end ?? t)}${span.tokens ? `, using ${span.tokens.toLocaleString()} tokens` : ''}.`;
	}
	function describeEvent(event: ModelEvent): void {
		selected = `${formatClock(event.t)}: ${event.reason ?? event.kind}`;
	}

	const ANSWERS: Record<string, (p: ChartPoint) => string> = {
		latency: (p) =>
			p.series === 'After' && Number(p.x) >= 7
				? `Day ${p.x} is after the session cache shipped, so token checks hit memory instead of the identity provider. That saves about 120 ms per checkout.`
				: `Day ${p.x} on the ${p.series.toLowerCase()} build is ${p.y} ms. Without the cache, every checkout makes two identity-provider calls.`,
		tokens: (p) => `${p.series} spent ${p.y.toLocaleString()} tokens in ${p.x}. ${p.x === 'Retry' ? 'That is the cost of the two failing tests on the first attempt.' : 'That is within this phase’s usual range.'}`,
		passRate: (p) => `Attempt ${p.x} met ${p.y}% of the criteria. ${Number(p.x) === 4 ? 'It regressed because the token refresh broke; attempt 5 fixed it.' : ''}`
	};
	function explain(point: ChartPoint): void {
		asked = { point, answer: ANSWERS[specKey]?.(point) ?? '' };
	}

	let spec = $derived<ChartSpec>(SAMPLE_CHART_SPECS[specKey]);
	const SPEC_TABS: { key: keyof typeof SAMPLE_CHART_SPECS; label: string }[] = [
		{ key: 'latency', label: 'Line' },
		{ key: 'tokens', label: 'Bar' },
		{ key: 'passRate', label: 'Area' }
	];
</script>

<svelte:head>
	<title>Charts & timelines · Agents Kit Svelte</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6">
	<div class="max-w-2xl">
		<p class="text-xs font-medium text-accent-primary">Charts & Timelines</p>
		<h1 class="mt-2 font-display text-[2.25rem] leading-tight font-normal tracking-[-0.02em] text-fg-main">
			See who held the work, and what they handed on.
		</h1>
		<p class="mt-3 text-sm leading-6 text-fg-light">
			Replay one agent run on a feature card, from plan to verified. Hover a lane or a model to light it in both
			charts, hover a handoff to see what was passed, and drag across the stream to zoom.
		</p>
	</div>

	<section aria-label="Run playback" class="flex flex-wrap items-center gap-3 rounded-card border border-card-border bg-card-bg px-4 py-3 ak-shadow-btn">
		{#if playing}
			<button type="button" class={buttonClass('primary', 'sm')} onclick={pause}><Pause class="size-3.5" aria-hidden="true" />Pause</button>
		{:else}
			<button type="button" class={buttonClass('primary', 'sm')} onclick={play}><Play class="size-3.5" aria-hidden="true" />{t >= SAMPLE_RUN_DURATION ? 'Replay run' : 'Play'}</button>
		{/if}
		<button type="button" class={buttonClass('ghost', 'icon-sm')} onclick={restart} aria-label="Restart"><RotateCcw class="size-3.5" aria-hidden="true" /></button>
		<label class="flex min-w-48 flex-1 items-center gap-3 text-xs text-fg-light">
			<span class="sr-only">Run time</span>
			<input
				type="range"
				min="0"
				max={SAMPLE_RUN_DURATION}
				step="1"
				value={t}
				oninput={(event) => {
					pause();
					t = Number(event.currentTarget.value);
				}}
				class="w-full accent-[var(--ak-color-accent)]"
			/>
			<span class="w-24 shrink-0 text-right whitespace-nowrap font-mono tabular-nums text-fg-main">{formatClock(t)} / {formatClock(SAMPLE_RUN_DURATION)}</span>
		</label>
		<div class="flex items-center gap-1 rounded-full bg-canvas-secondary p-0.5" role="group" aria-label="Speed">
			{#each SPEEDS as s (s)}
				<button type="button" aria-pressed={speed === s} onclick={() => (speed = s)} class={cn('rounded-full px-2 py-0.5 font-mono text-[11px] transition-colors', speed === s ? 'bg-card-bg text-fg-main ak-shadow-btn' : 'text-fg-light hover:text-fg-main')}>{s}×</button>
			{/each}
		</div>
	</section>

	<AgentHandoffGantt
		title="Add SSO to the billing portal · card 214"
		lanes={SAMPLE_HANDOFF_LANES}
		{spans}
		{handoffs}
		now={live ? t : undefined}
		highlight={laneHighlight}
		onHighlight={(id) => (linked = id)}
		onSelectSpan={describeSpan}
	/>

	<ModelPhaseStream
		title="Model throughput by phase"
		phases={SAMPLE_PHASE_BANDS}
		{series}
		{events}
		now={live ? t : undefined}
		highlight={modelHighlight}
		onHighlight={(model) => (linked = model)}
		onSelectEvent={describeEvent}
	/>

	{#if selected}
		<p class="rounded-card bg-canvas-secondary px-4 py-2.5 text-[13px] text-fg-main" in:rise={{ y: 4, duration: 160 }}>{selected}</p>
	{/if}

	<section aria-label="Generative chart" class="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
		<div class="space-y-3">
			<div class="flex items-center gap-1 rounded-full bg-canvas-secondary p-0.5 w-fit" role="group" aria-label="Chart spec">
				{#each SPEC_TABS as tab (tab.key)}
					<button
						type="button"
						aria-pressed={specKey === tab.key}
						onclick={() => {
							specKey = tab.key;
							asked = null;
						}}
						class={cn('rounded-full px-3 py-1 text-xs transition-colors', specKey === tab.key ? 'bg-card-bg text-fg-main ak-shadow-btn' : 'text-fg-light hover:text-fg-main')}
					>{tab.label}</button>
				{/each}
			</div>
			{#key specKey}
				<GenerativeChart {spec} onExplain={explain} height={260} />
			{/key}
		</div>
		<div class="flex flex-col gap-3">
			<div class="rounded-card border border-card-border bg-card-bg p-4 text-[13px] ak-shadow-btn">
				<p class="mb-2 text-xs font-medium text-fg-light">The agent emitted</p>
				<pre class="max-h-56 overflow-auto font-mono text-[11px] leading-relaxed text-fg-main">{JSON.stringify({ ...spec, data: `[${spec.data.length} rows]` }, null, 2)}</pre>
			</div>
			{#if asked}
				<div class="rounded-card border border-accent-primary/30 bg-accent-subtle p-4 text-[13px]" in:rise={{ y: 6, duration: 200 }}>
					<p class="mb-1 flex items-center gap-1.5 text-xs font-medium text-accent-primary"><Sparkles class="size-3.5" aria-hidden="true" />{asked.point.series} at {asked.point.x}</p>
					<p class="text-fg-main">{asked.answer}</p>
				</div>
			{:else}
				<p class="px-1 text-xs text-fg-light">Click any point, or focus the chart and use the arrow keys and Enter, to ask the agent about it.</p>
			{/if}
		</div>
	</section>
</div>
