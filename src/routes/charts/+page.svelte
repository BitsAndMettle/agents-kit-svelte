<script lang="ts">
	import AgentHandoffGantt from '$lib/charts/AgentHandoffGantt.svelte';
	import GenerativeChart from '$lib/charts/GenerativeChart.svelte';
	import ModelPhaseStream from '$lib/charts/ModelPhaseStream.svelte';
	import RunReplayScrubber from '$lib/charts/RunReplayScrubber.svelte';
	import TokenBurnChart from '$lib/charts/TokenBurnChart.svelte';
	import { eventsAt, handoffsAt, seriesAt, spansAt } from '$lib/charts/replay';
	import type { ChartPoint, ChartSpec, RunMark } from '$lib/charts/types';
	import RunDetailSheet, { type RunDetail } from './RunDetailSheet.svelte';
	import {
		SAMPLE_CHART_SPECS,
		SAMPLE_HANDOFFS,
		SAMPLE_HANDOFF_LANES,
		SAMPLE_HANDOFF_SPANS,
		SAMPLE_MODEL_EVENTS,
		SAMPLE_MODEL_SERIES,
		SAMPLE_PHASE_BANDS,
		SAMPLE_BURN_POINTS,
		SAMPLE_RUN_DURATION,
		SAMPLE_RUN_MARKS,
		SAMPLE_TOKEN_BUDGET
	} from '$lib/fixtures/charts';
	import { cn } from '$lib/ui/cn';
	import { rise } from '$lib/state/motion.svelte';
	import { Sparkles } from '@lucide/svelte';

	let t = $state(0);
	let playing = $state(false);
	let speed = $state(8);
	let linked = $state<string | null>(null);
	let detail = $state<RunDetail | null>(null);
	let selectedId = $derived(detail?.kind === 'handoff' ? detail.link.id : detail?.kind === 'span' ? detail.span.id : null);
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

	let burn = $derived(SAMPLE_BURN_POINTS.filter((p) => p.t <= t));

	function open(next: RunDetail): void {
		playing = false;
		detail = next;
	}
	/** A moment on the scrubber or burn chart opens the handoff or routing decision behind it. */
	function openMark(mark: RunMark): void {
		playing = false;
		t = Math.max(t, mark.t);
		const link = SAMPLE_HANDOFFS.find((h) => h.id === mark.id);
		const event = SAMPLE_MODEL_EVENTS.find((e) => e.id === mark.id);
		if (link) open({ kind: 'handoff', link });
		else if (event) open({ kind: 'event', event });
	}

	const ANSWERS: Record<string, (p: ChartPoint) => string> = {
		latency: (p) =>
			p.series === 'After' && Number(p.x) >= 7
				? `Day ${p.x} is after the session cache shipped, so token checks hit memory instead of the identity provider. That saves about 120 ms per checkout.`
				: `Day ${p.x} on the ${p.series.toLowerCase()} build is ${p.y} ms. Without the cache, every checkout makes two identity-provider calls.`,
		tokens: (p) => `${p.series} spent ${p.y.toLocaleString()} tokens in ${p.x}. ${p.x === 'Retry' ? 'That is the cost of the two failing tests on the first attempt.' : 'That is within this phase’s usual range.'}`,
		passRate: (p) => `Attempt ${p.x} met ${p.y}% of the criteria. ${Number(p.x) === 4 ? 'It regressed because the token refresh broke; attempt 5 fixed it.' : ''}`
	};
	function askAbout(point: ChartPoint): void {
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

<div class={cn('mx-auto max-w-7xl space-y-6 px-4 py-10 transition-[padding] duration-300 ease-out sm:px-6', detail && 'xl:mr-[36rem] xl:max-w-none')}>
	<div class="max-w-2xl">
		<p class="text-xs font-medium text-accent-primary">Charts & Timelines</p>
		<h1 class="mt-2 font-display text-[2.25rem] leading-tight font-normal tracking-[-0.02em] text-fg-main">
			See who held the work, and what they handed on.
		</h1>
		<p class="mt-3 text-sm leading-6 text-fg-light">
			Replay one agent run on a feature card, from plan to verified. Hover a lane or a model to light it in both
			charts. Click a handoff to open what was passed (the diff, the failing tests, the plan), click a bar for its
			details, and drag across the stream to zoom.
		</p>
	</div>

	<RunReplayScrubber
		duration={SAMPLE_RUN_DURATION}
		bind:now={t}
		bind:playing
		bind:speed
		phases={SAMPLE_PHASE_BANDS}
		marks={SAMPLE_RUN_MARKS}
		autoplay
		onSelectMark={openMark}
		class="sticky top-[4.75rem] z-30"
	/>

	<AgentHandoffGantt
		title="Add SSO to the billing portal · card 214"
		lanes={SAMPLE_HANDOFF_LANES}
		{spans}
		{handoffs}
		now={live ? t : undefined}
		highlight={laneHighlight}
		onHighlight={(id) => (linked = id)}
		selected={selectedId}
		onSelectSpan={(span) => open({ kind: 'span', span })}
		onSelectHandoff={(link) => open({ kind: 'handoff', link })}
		onSelectLane={(lane) => {
			const latest = [...SAMPLE_HANDOFF_SPANS].reverse().find((s) => s.lane === lane.id && s.start <= t);
			if (latest) open({ kind: 'span', span: spans.find((s) => s.id === latest.id) ?? latest });
		}}
	/>

	<ModelPhaseStream
		title="Model throughput by phase"
		phases={SAMPLE_PHASE_BANDS}
		{series}
		{events}
		now={live ? t : undefined}
		highlight={modelHighlight}
		onHighlight={(model) => (linked = model)}
		onSelectEvent={(event) => open({ kind: 'event', event })}
		onSelectPhase={(phase) => open({ kind: 'phase', phase })}
		onSelectPoint={(point) => open({ kind: 'point', point })}
	/>

	<TokenBurnChart
		title="Token burn against budget"
		points={burn}
		budget={SAMPLE_TOKEN_BUDGET}
		end={SAMPLE_RUN_DURATION}
		marks={SAMPLE_RUN_MARKS}
		onSelectMark={openMark}
		onSelectPoint={(point) => {
			playing = false;
			t = point.t;
		}}
	/>

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
				<GenerativeChart {spec} onSelectPoint={askAbout} actionLabel="Click to ask the agent" height={260} />
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

<RunDetailSheet
	{detail}
	lanes={SAMPLE_HANDOFF_LANES}
	{spans}
	{handoffs}
	onOpen={(next) => (detail = next)}
	onClose={() => (detail = null)}
/>
