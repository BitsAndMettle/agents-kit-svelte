<script lang="ts" module>
	import type { HandoffLink, HandoffSpan, ModelEvent, ModelPoint, PhaseBand } from '$lib/charts/types';

	/** What the person clicked, and so what the sheet shows. */
	export type RunDetail =
		| { kind: 'handoff'; link: HandoffLink }
		| { kind: 'span'; span: HandoffSpan }
		| { kind: 'event'; event: ModelEvent }
		| { kind: 'phase'; phase: PhaseBand }
		| { kind: 'point'; point: ModelPoint };
</script>

<script lang="ts">
	import CodeBlock from '$lib/agents/CodeBlock.svelte';
	import FileDiff from '$lib/agents/FileDiff.svelte';
	import TestResults, { type SuiteGroup } from '$lib/runtime/TestResults.svelte';
	import { formatClock, formatCompact, phaseColor } from '$lib/charts/scale';
	import type { HandoffLane } from '$lib/charts/types';
	import type { SampleDiffFile } from '$lib/fixtures/charts';
	import { buttonClass } from '$lib/ui/styles';
	import { cn } from '$lib/ui/cn';
	import { motionDuration } from '$lib/state/motion.svelte';
	import { ArrowRight, X } from '@lucide/svelte';
	import { fade, fly } from 'svelte/transition';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children'> {
		detail: RunDetail | null;
		lanes: HandoffLane[];
		spans: HandoffSpan[];
		handoffs: HandoffLink[];
		onOpen: (detail: RunDetail) => void;
		onClose: () => void;
		class?: string;
	}

	let { detail, lanes, spans, handoffs, onOpen, onClose, class: className = '', ...rest }: Props = $props();

	function laneOf(span: HandoffSpan | undefined): HandoffLane | undefined {
		return lanes.find((l) => l.id === span?.lane);
	}
	function spanById(id: string): HandoffSpan | undefined {
		return spans.find((s) => s.id === id);
	}
	function spansDuring(start: number, end: number): HandoffSpan[] {
		return spans.filter((s) => s.start < end && (s.end ?? end) > start && s.status !== 'superseded');
	}
	function handleKey(event: KeyboardEvent): void {
		if (event.key === 'Escape' && detail) onClose();
	}

	let title = $derived.by(() => {
		if (!detail) return '';
		switch (detail.kind) {
			case 'handoff':
				return detail.link.artifact;
			case 'span':
				return `${laneOf(detail.span)?.label ?? detail.span.lane} · ${detail.span.label ?? detail.span.phase}`;
			case 'event':
				return `${detail.event.kind[0].toUpperCase()}${detail.event.kind.slice(1)} at ${formatClock(detail.event.t)}`;
			case 'phase':
				return `${detail.phase.label} phase`;
			case 'point':
				return `${detail.point.model} at ${formatClock(detail.point.t)}`;
		}
	});
</script>

<svelte:window onkeydown={handleKey} />

{#if detail}
	<aside
		{...rest}
		aria-label={title}
		class={cn('fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-card-border bg-canvas-primary shadow-soft', className)}
		transition:fly={{ x: 40, duration: motionDuration(240), opacity: 0 }}
	>
		<header class="flex items-start justify-between gap-3 border-b border-canvas-border px-5 py-4">
			<div class="min-w-0">
				<p class="text-[11px] font-medium tracking-wide text-fg-light uppercase">
					{detail.kind === 'handoff' ? `Handoff · ${detail.link.kind ?? 'file'}` : detail.kind === 'point' ? 'Model' : detail.kind}
				</p>
				<h2 class="mt-0.5 truncate font-mono text-[15px] text-fg-main">{title}</h2>
			</div>
			<button type="button" class={buttonClass('ghost', 'icon-sm')} onclick={onClose} aria-label="Close"><X class="size-4" aria-hidden="true" /></button>
		</header>

		<div class="flex-1 space-y-4 overflow-y-auto px-5 py-4">
			{#key detail}
				<div class="space-y-4" in:fade={{ duration: motionDuration(160) }}>
					{#if detail.kind === 'handoff'}
						{@const link = detail.link}
						{@const from = spanById(link.from)}
						{@const to = spanById(link.to)}
						<div class="flex flex-wrap items-center gap-2 text-[13px]">
							{#if from}<button type="button" class="rounded-full bg-card-bg px-2.5 py-1 text-fg-main ak-shadow-btn hover:bg-canvas-secondary" onclick={() => onOpen({ kind: 'span', span: from })}>{laneOf(from)?.label}</button>{/if}
							<ArrowRight class="size-3.5 text-fg-light" aria-hidden="true" />
							{#if to}<button type="button" class="rounded-full bg-card-bg px-2.5 py-1 text-fg-main ak-shadow-btn hover:bg-canvas-secondary" onclick={() => onOpen({ kind: 'span', span: to })}>{laneOf(to)?.label}</button>{/if}
							{#if from?.end !== undefined}<span class="text-fg-light tabular-nums">at {formatClock(from.end)}</span>{/if}
						</div>
						{#if link.reason}<p class="text-[13px] leading-6 text-fg-main">{link.reason}</p>{/if}

						{#if link.kind === 'diff' && Array.isArray(link.data)}
							{#each (link.data as SampleDiffFile[]) as file (file.filename)}
								<FileDiff filename={file.filename} patch={file.patch} additions={file.additions} deletions={file.deletions} maxHeight={320} />
							{/each}
						{:else if link.kind === 'tests' && Array.isArray(link.data)}
							<TestResults suites={link.data as SuiteGroup[]} />
						{:else if typeof link.data === 'string'}
							<CodeBlock code={link.data} language="markdown" filename={link.kind === 'review' ? 'review.md' : link.artifact} />
						{/if}
					{:else if detail.kind === 'span'}
						{@const span = detail.span}
						{@const lane = laneOf(span)}
						<dl class="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-card-border bg-canvas-border text-[13px]">
							{#each [['Model', lane?.model ?? '—'], ['Phase', span.phase], ['Started', formatClock(span.start)], ['Took', formatClock((span.end ?? span.start) - span.start)], ['Tokens', span.tokens ? formatCompact(span.tokens) : '—'], ['Attempt', String(span.attempt ?? 1)]] as [label, value] (label)}
								<div class="bg-card-bg px-3 py-2">
									<dt class="text-[11px] text-fg-light">{label}</dt>
									<dd class={cn('mt-0.5 font-medium text-fg-main', label === 'Phase' && 'capitalize')}>{value}</dd>
								</div>
							{/each}
						</dl>
						{@const related = handoffs.filter((h) => h.from === span.id || h.to === span.id)}
						{#if related.length}
							<section>
								<h3 class="mb-2 text-xs font-medium text-fg-light">Handoffs</h3>
								<ul class="space-y-1.5">
									{#each related as h (h.id)}
										<li>
											<button type="button" class="flex w-full items-center justify-between gap-3 rounded-control border border-card-border bg-card-bg px-3 py-2 text-left text-[13px] transition-colors hover:bg-canvas-secondary" onclick={() => onOpen({ kind: 'handoff', link: h })}>
												<span class="text-fg-light">{h.from === span.id ? 'Passed on' : 'Received'}</span>
												<span class="truncate font-mono text-fg-main">{h.artifact}</span>
											</button>
										</li>
									{/each}
								</ul>
							</section>
						{/if}
					{:else}
						{@const window = detail.kind === 'event' ? [detail.event.t - 1, detail.event.t + 1] : detail.kind === 'phase' ? [detail.phase.start, detail.phase.end] : [detail.point.t - 1, detail.point.t + 1]}
						{#if detail.kind === 'event'}
							<p class="font-mono text-[13px] text-fg-main">{detail.event.from} → {detail.event.to}</p>
							{#if detail.event.reason}<p class="text-[13px] leading-6 text-fg-main">{detail.event.reason}</p>{/if}
						{:else if detail.kind === 'point'}
							<p class="text-[13px] text-fg-main">Streaming {formatCompact(detail.point.value)} tokens a second{detail.point.phase ? ` during ${detail.point.phase.label.toLowerCase()}` : ''}.</p>
						{:else}
							<p class="text-[13px] text-fg-main tabular-nums">{formatClock(detail.phase.start)} to {formatClock(detail.phase.end)}</p>
						{/if}
						<section>
							<h3 class="mb-2 text-xs font-medium text-fg-light">Work in progress then</h3>
							<ul class="space-y-1.5">
								{#each spansDuring(window[0], window[1]) as s (s.id)}
									<li>
										<button type="button" class="flex w-full items-center gap-2 rounded-control border border-card-border bg-card-bg px-3 py-2 text-left text-[13px] transition-colors hover:bg-canvas-secondary" onclick={() => onOpen({ kind: 'span', span: s })}>
											<span class="size-2 rounded-full" style:background={phaseColor(s.phase)}></span>
											<span class="text-fg-main">{laneOf(s)?.label}</span>
											<span class="text-fg-light capitalize">{s.phase}</span>
											<span class="ml-auto text-fg-light tabular-nums">{formatClock(s.start)}–{formatClock(s.end ?? s.start)}</span>
										</button>
									</li>
								{:else}
									<li class="text-[13px] text-fg-light">Nothing was running.</li>
								{/each}
							</ul>
						</section>
					{/if}
				</div>
			{/key}
		</div>
	</aside>
{/if}
