<script lang="ts">
	import FeatureCard from '$lib/charts/FeatureCard.svelte';
	import FeatureLineage from '$lib/charts/FeatureLineage.svelte';
	import FeatureTimeline from '$lib/charts/FeatureTimeline.svelte';
	import type { FeatureSummary, LineageNode } from '$lib/charts/types';
	import {
		SAMPLE_FEATURES,
		SAMPLE_FEATURE_START,
		SAMPLE_LINEAGE_EDGES,
		SAMPLE_LINEAGE_NODES,
		SAMPLE_TIMELINE_ITEMS,
		SAMPLE_TIMELINE_MILESTONES,
		SAMPLE_TIMELINE_TODAY
	} from '$lib/fixtures/charts';
	import { cn } from '$lib/ui/cn';
	import { rise } from '$lib/state/motion.svelte';
	import LineageDetailSheet from './LineageDetailSheet.svelte';

	let open = $state<LineageNode | null>(null);
	let focusFeature = $state<string>('F-12');
	let note = $state('');

	function openFeature(feature: FeatureSummary): void {
		focusFeature = feature.id;
		note = feature.id === 'F-12' ? '' : `${feature.id} has no lineage in this demo; showing F-12.`;
		if (feature.id === 'F-12') open = SAMPLE_LINEAGE_NODES[0];
	}
</script>

<svelte:head>
	<title>Features · Agents Kit Svelte</title>
</svelte:head>

<div class={cn('mx-auto max-w-7xl space-y-6 px-4 py-10 transition-[margin] duration-300 ease-out sm:px-6', open && 'xl:mr-[36rem] xl:max-w-none')}>
	<div class="max-w-2xl">
		<p class="text-xs font-medium text-accent-primary">Features</p>
		<h1 class="mt-2 font-display text-[2.25rem] leading-tight font-normal tracking-[-0.02em] text-fg-main">
			Where a feature came from, and everything it turned into.
		</h1>
		<p class="mt-3 text-sm leading-6 text-fg-light">
			A Feature groups cards; agents attempt each card, open PRs, and ship them in releases. Hover any node to trace its
			ancestry, fold a branch away with the handle on its edge, and click a node to open the card, PR, release,
			incident or agent run behind it.
		</p>
	</div>

	<section aria-label="Features" class={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-3', open && 'xl:grid-cols-2 2xl:grid-cols-3')}>
		{#each SAMPLE_FEATURES as feature, i (feature.id)}
			<div in:rise={{ y: 8, duration: 260, delay: i * 80 }}>
				<FeatureCard
					{feature}
					class={cn('h-full', focusFeature === feature.id && 'border-fg-light/50')}
					onOpen={openFeature}
					onSelectCards={(state) => (note = `${feature.cards[state]} ${state} cards in ${feature.id}. A board would filter to them here.`)}
				/>
			</div>
		{/each}
	</section>

	{#if note}
		<p class="rounded-card bg-canvas-secondary px-4 py-2.5 text-[13px] text-fg-main" in:rise={{ y: 4, duration: 160 }}>{note}</p>
	{/if}

	<FeatureTimeline
		title="F-12 timeline · planned vs actual"
		items={SAMPLE_TIMELINE_ITEMS}
		milestones={SAMPLE_TIMELINE_MILESTONES}
		today={SAMPLE_TIMELINE_TODAY}
		start={SAMPLE_FEATURE_START}
		onSelectItem={(item) => (open = SAMPLE_LINEAGE_NODES.find((n) => n.id === item.id) ?? open)}
		onSelectMilestone={(m) => (open = SAMPLE_LINEAGE_NODES.find((n) => n.id === m.id) ?? open)}
	/>

	<FeatureLineage
		title="F-12 lineage · SSO for the billing portal"
		nodes={SAMPLE_LINEAGE_NODES}
		edges={SAMPLE_LINEAGE_EDGES}
		selected={open?.id ?? null}
		onSelectNode={(node) => (open = node)}
	/>
</div>

<LineageDetailSheet node={open} nodes={SAMPLE_LINEAGE_NODES} edges={SAMPLE_LINEAGE_EDGES} onOpen={(node) => (open = node)} onClose={() => (open = null)} />
