<script lang="ts">
	import AgentHandoffGantt from '$lib/charts/AgentHandoffGantt.svelte';
	import FeatureCard from '$lib/charts/FeatureCard.svelte';
	import GitHubIncidentCard from '$lib/github/GitHubIncidentCard.svelte';
	import GitHubIssueCard from '$lib/github/GitHubIssueCard.svelte';
	import GitHubPullRequestCard from '$lib/github/GitHubPullRequestCard.svelte';
	import GitHubReleaseCard from '$lib/github/GitHubReleaseCard.svelte';
	import type { LineageEdge, LineageNode } from '$lib/charts/types';
	import {
		SAMPLE_FEATURE,
		SAMPLE_HANDOFFS,
		SAMPLE_HANDOFF_LANES,
		SAMPLE_HANDOFF_SPANS,
		type SampleLineageData
	} from '$lib/fixtures/charts';
	import { buttonClass } from '$lib/ui/styles';
	import { cn } from '$lib/ui/cn';
	import { motionDuration } from '$lib/state/motion.svelte';
	import { ArrowLeft, ArrowRight, X } from '@lucide/svelte';
	import { fade, fly } from 'svelte/transition';
	import { base } from '$app/paths';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children'> {
		node: LineageNode | null;
		nodes: LineageNode[];
		edges: LineageEdge[];
		onOpen: (node: LineageNode) => void;
		onClose: () => void;
		class?: string;
	}

	let { node, nodes, edges, onOpen, onClose, class: className = '', ...rest }: Props = $props();

	const KIND_LABEL: Record<LineageNode['kind'], string> = {
		feature: 'Feature',
		card: 'Card',
		attempt: 'Attempt',
		pr: 'Pull request',
		release: 'Release',
		incident: 'Incident'
	};

	let data = $derived(node?.data as SampleLineageData | undefined);
	let upstream = $derived(node ? edges.filter((e) => e.to === node.id).map((e) => ({ e, n: nodes.find((x) => x.id === e.from) })) : []);
	let downstream = $derived(node ? edges.filter((e) => e.from === node.id).map((e) => ({ e, n: nodes.find((x) => x.id === e.to) })) : []);

	/** The sample run stands in for every attempt; only the 214 retry is the real one. */
	let runSpans = $derived(data?.type === 'run' && data.attempt === 1 && data.card === 214 ? SAMPLE_HANDOFF_SPANS.filter((s) => s.end !== undefined && s.end <= 146) : SAMPLE_HANDOFF_SPANS);
	let runHandoffs = $derived(SAMPLE_HANDOFFS.filter((h) => runSpans.some((s) => s.id === h.from) && runSpans.some((s) => s.id === h.to)));

	function handleKey(event: KeyboardEvent): void {
		if (event.key === 'Escape' && node) onClose();
	}
</script>

<svelte:window onkeydown={handleKey} />

{#if node}
	<aside
		{...rest}
		aria-label={node.label}
		class={cn('fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-card-border bg-canvas-primary shadow-soft', className)}
		transition:fly={{ x: 40, duration: motionDuration(240), opacity: 0 }}
	>
		<header class="flex items-start justify-between gap-3 border-b border-canvas-border px-5 py-4">
			<div class="min-w-0">
				<p class="text-[11px] font-medium tracking-wide text-fg-light uppercase">{KIND_LABEL[node.kind]}{node.detail ? ` · ${node.detail}` : ''}</p>
				<h2 class="mt-0.5 truncate text-[15px] font-semibold text-fg-main">{node.label}</h2>
			</div>
			<button type="button" class={buttonClass('ghost', 'icon-sm')} onclick={onClose} aria-label="Close"><X class="size-4" aria-hidden="true" /></button>
		</header>

		<div class="flex-1 overflow-y-auto px-5 py-4">
			{#key node.id}
				<div class="space-y-4" in:fade={{ duration: motionDuration(160) }}>
					{#if upstream.length || downstream.length}
						<nav class="flex flex-wrap items-center gap-1.5 text-[12px]" aria-label="Lineage">
							{#each upstream as { e, n } (e.from)}
								{#if n}<button type="button" class="inline-flex items-center gap-1 rounded-full bg-card-bg px-2.5 py-1 text-fg-main ak-shadow-btn hover:bg-canvas-secondary" onclick={() => onOpen(n)}><ArrowLeft class="size-3 text-fg-light" aria-hidden="true" />{n.label}<span class="font-mono text-[10px] text-fg-light">{e.rel}</span></button>{/if}
							{/each}
							{#each downstream as { e, n } (e.to)}
								{#if n}<button type="button" class="inline-flex items-center gap-1 rounded-full bg-card-bg px-2.5 py-1 text-fg-main ak-shadow-btn hover:bg-canvas-secondary" onclick={() => onOpen(n)}><span class="font-mono text-[10px] text-fg-light">{e.rel}</span>{n.label}<ArrowRight class="size-3 text-fg-light" aria-hidden="true" /></button>{/if}
							{/each}
						</nav>
					{/if}

					{#if data?.type === 'issue'}
						<GitHubIssueCard issue={data.issue} />
					{:else if data?.type === 'pr'}
						<GitHubPullRequestCard pr={data.pr} defaultChecksOpen={true} />
					{:else if data?.type === 'release'}
						<GitHubReleaseCard release={data.release} />
					{:else if data?.type === 'incident'}
						<GitHubIncidentCard incident={data.incident} />
					{:else if data?.type === 'run'}
						<AgentHandoffGantt title="Card {data.card} · attempt {data.attempt}" lanes={SAMPLE_HANDOFF_LANES} spans={runSpans} handoffs={runHandoffs} />
						<a href="{base}/charts/" class="inline-flex items-center gap-1 text-[13px] text-accent-primary hover:underline">Replay this run with diffs and tests <ArrowRight class="size-3.5" aria-hidden="true" /></a>
					{:else if data?.type === 'feature'}
						<FeatureCard feature={SAMPLE_FEATURE} />
					{/if}
				</div>
			{/key}
		</div>
	</aside>
{/if}
