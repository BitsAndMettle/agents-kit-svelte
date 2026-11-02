<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Spring, Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { draw } from 'svelte/transition';
	import { ArrowUpRight, Bot, Flag, GitPullRequest, Repeat } from '@lucide/svelte';
	import { motionDuration } from '../state/motion.svelte';
	import { formatCompact, linePath } from './scale';
	import type { FeatureSummary } from './types';

	type CardState = keyof FeatureSummary['cards'];

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children'> {
		feature: FeatureSummary;
		/** Shows an "Open" button and makes the title a link-like button. */
		onOpen?: (feature: FeatureSummary) => void;
		/** Called when the person clicks a segment of the cards bar, e.g. to filter a board. */
		onSelectCards?: (state: CardState) => void;
		class?: string;
	}

	let { feature, onOpen, onSelectCards, class: className = '', ...rest }: Props = $props();

	const SEGMENTS: { key: CardState; label: string; color: string }[] = [
		{ key: 'done', label: 'Done', color: 'var(--ak-color-success)' },
		{ key: 'running', label: 'Running', color: 'var(--ak-color-accent)' },
		{ key: 'failed', label: 'Failed', color: 'var(--ak-color-danger)' },
		{ key: 'planned', label: 'Planned', color: 'var(--ak-color-border)' }
	];

	const STATUS: Record<FeatureSummary['status'], { label: string; tone: string }> = {
		planned: { label: 'Planned', tone: 'bg-canvas-secondary text-fg-light' },
		'in-progress': { label: 'In progress', tone: 'bg-accent-subtle text-accent-primary' },
		shipped: { label: 'Shipped', tone: 'bg-status-success-subtle text-status-success' },
		blocked: { label: 'Blocked', tone: 'bg-status-danger-subtle text-status-danger' }
	};

	const RISK: Record<NonNullable<FeatureSummary['riskTier']>, string> = {
		T0: 'bg-canvas-secondary text-fg-light',
		T1: 'bg-status-info-subtle text-status-info',
		T2: 'bg-status-info-subtle text-status-info',
		T3: 'bg-status-warning-subtle text-status-warning',
		T4: 'bg-status-danger-subtle text-status-danger'
	};

	let totalCards = $derived(SEGMENTS.reduce((sum, s) => sum + feature.cards[s.key], 0));
	let pct = $derived(feature.criteriaTotal ? (feature.criteriaMet / feature.criteriaTotal) * 100 : 0);
	let budgetPct = $derived(feature.tokenBudget ? Math.min(100, (feature.tokensSpent / feature.tokenBudget) * 100) : null);

	const met = new Spring(0, { stiffness: 0.12, damping: 0.7 });
	const bar = new Tween(0, { duration: 700, easing: cubicOut });
	const budget = new Tween(0, { duration: 700, easing: cubicOut });
	$effect(() => {
		const instant = prefersReducedMotion.current;
		void met.set(feature.criteriaMet, { instant });
		void bar.set(pct, { duration: instant ? 0 : 700 });
		void budget.set(budgetPct ?? 0, { duration: instant ? 0 : 700 });
	});

	let hoverSeg = $state<CardState | null>(null);

	const SPARK_W = 120;
	const SPARK_H = 32;
	let sparkPoints = $derived.by((): [number, number][] => {
		const values = feature.progress ?? [];
		if (values.length < 2) return [];
		return values.map((v, i) => [(i / (values.length - 1)) * (SPARK_W - 6) + 3, SPARK_H - 3 - (Math.max(0, Math.min(100, v)) / 100) * (SPARK_H - 6)]);
	});
	let budgetTone = $derived(budgetPct === null ? '' : budgetPct >= 90 ? 'bg-status-danger' : budgetPct >= 75 ? 'bg-status-warning' : 'bg-fg-light');
</script>

<article {...rest} class={cn('group/feature rounded-card border border-card-border bg-card-bg p-4 ak-shadow-btn transition-shadow duration-200 hover:shadow-soft', className)}>
	<header class="flex items-start gap-3">
		<span class="grid size-9 shrink-0 place-items-center rounded-control bg-accent-subtle text-accent-primary">
			<Flag class="size-4" aria-hidden="true" />
		</span>
		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-center gap-1.5 text-[11px]">
				<span class="font-mono text-fg-light">{feature.id}</span>
				<span class={cn('rounded-full px-2 py-0.5 font-medium', STATUS[feature.status].tone)}>{STATUS[feature.status].label}</span>
				{#if feature.riskTier}<span class={cn('rounded-full px-2 py-0.5 font-mono font-semibold', RISK[feature.riskTier])}>Risk {feature.riskTier}</span>{/if}
			</div>
			{#if onOpen}
				<button type="button" class="mt-1 text-left text-[15px] leading-snug font-semibold text-fg-main decoration-card-border underline-offset-4 hover:underline" onclick={() => onOpen?.(feature)}>{feature.title}</button>
			{:else}
				<h3 class="mt-1 text-[15px] leading-snug font-semibold text-fg-main">{feature.title}</h3>
			{/if}
			{#if feature.summary}<p class="mt-1 text-[12px] leading-5 text-fg-light">{feature.summary}</p>{/if}
		</div>
		{#if onOpen}
			<button type="button" aria-label="Open {feature.title}" class="grid size-7 shrink-0 place-items-center rounded-full text-fg-light transition-[transform,background-color,color] duration-200 group-hover/feature:translate-x-0.5 group-hover/feature:-translate-y-0.5 hover:bg-canvas-secondary hover:text-fg-main" onclick={() => onOpen?.(feature)}>
				<ArrowUpRight class="size-4" aria-hidden="true" />
			</button>
		{/if}
	</header>

	<section class="mt-4 flex items-end justify-between gap-4" aria-label="Acceptance criteria">
		<div class="min-w-0 flex-1">
			<p class="text-[11px] text-fg-light">Acceptance criteria</p>
			<p class="mt-0.5 text-[22px] leading-none font-semibold text-fg-main">
				{Math.round(met.current)}<span class="ml-1 text-[13px] font-normal text-fg-light">/ {feature.criteriaTotal} met</span>
			</p>
			<div class="mt-2 h-1.5 overflow-hidden rounded-full bg-canvas-secondary">
				<div class="h-full rounded-full bg-status-success" style:width="{bar.current}%"></div>
			</div>
		</div>
		{#if sparkPoints.length}
			{@const last = sparkPoints[sparkPoints.length - 1]}
			<svg width={SPARK_W} height={SPARK_H} class="shrink-0 overflow-visible" aria-label="Criteria met after each attempt: {(feature.progress ?? []).join(', ')}%" role="img">
				<path d={linePath(sparkPoints)} fill="none" class="stroke-fg-light" stroke-width="1.5" stroke-linecap="round" in:draw={{ duration: motionDuration(800), easing: cubicOut }} />
				<circle cx={last[0]} cy={last[1]} r="3" class="fill-status-success stroke-card-bg" stroke-width="2" />
			</svg>
		{/if}
	</section>

	<section class="mt-4" aria-label="Cards">
		<div class="mb-1.5 flex items-center justify-between text-[11px]">
			<span class="text-fg-light">{totalCards} cards</span>
			<span class="text-fg-light tabular-nums">
				{#if hoverSeg}
					{feature.cards[hoverSeg]} {SEGMENTS.find((s) => s.key === hoverSeg)?.label.toLowerCase()}
				{:else}
					{feature.cards.done} done · {feature.cards.running} running
				{/if}
			</span>
		</div>
		<div class="flex h-2 gap-0.5" role="group" aria-label="Cards by state">
			{#each SEGMENTS as seg, i (seg.key)}
				{#if feature.cards[seg.key] > 0}
					<button
						type="button"
						aria-label="{feature.cards[seg.key]} {seg.label.toLowerCase()}"
						class={cn('h-full rounded-full transition-[flex-grow,transform,opacity] duration-500 ease-out hover:scale-y-150 focus-visible:scale-y-150 focus-visible:outline-none', onSelectCards ? 'cursor-pointer' : 'cursor-default', hoverSeg && hoverSeg !== seg.key && 'opacity-40')}
						style:flex-grow={feature.cards[seg.key]}
						style:background={seg.color}
						style:transition-delay="{i * 60}ms"
						onpointerenter={() => (hoverSeg = seg.key)}
						onpointerleave={() => (hoverSeg = null)}
						onfocus={() => (hoverSeg = seg.key)}
						onblur={() => (hoverSeg = null)}
						onclick={() => onSelectCards?.(seg.key)}
					></button>
				{/if}
			{/each}
		</div>
	</section>

	<dl class="mt-4 grid grid-cols-3 gap-2 text-[12px]">
		<div class="rounded-control bg-canvas-secondary px-2.5 py-2">
			<dt class="flex items-center gap-1 text-[11px] text-fg-light"><Repeat class="size-3" aria-hidden="true" />Attempts</dt>
			<dd class="mt-0.5 font-semibold text-fg-main">{feature.attempts}</dd>
		</div>
		<div class="rounded-control bg-canvas-secondary px-2.5 py-2">
			<dt class="flex items-center gap-1 text-[11px] text-fg-light"><GitPullRequest class="size-3" aria-hidden="true" />PRs</dt>
			<dd class="mt-0.5 font-semibold text-fg-main">{feature.pullRequests}</dd>
		</div>
		<div class="rounded-control bg-canvas-secondary px-2.5 py-2">
			<dt class="text-[11px] text-fg-light">Tokens</dt>
			<dd class="mt-0.5 font-semibold text-fg-main">
				{formatCompact(feature.tokensSpent)}{#if feature.tokenBudget}<span class="ml-0.5 font-normal text-fg-light">/ {formatCompact(feature.tokenBudget)}</span>{/if}
			</dd>
			{#if budgetPct !== null}
				<div class="mt-1.5 h-1 overflow-hidden rounded-full bg-card-border">
					<div class={cn('h-full rounded-full transition-colors', budgetTone)} style:width="{budget.current}%"></div>
				</div>
			{/if}
		</div>
	</dl>

	{#if feature.agents?.length || feature.updatedLabel || feature.owner}
		<footer class="mt-4 flex flex-wrap items-center gap-1.5 text-[11px] text-fg-light">
			{#each feature.agents ?? [] as agent (agent)}
				<span class="inline-flex items-center gap-1 rounded-full border border-card-border px-2 py-0.5 font-mono"><Bot class="size-3" aria-hidden="true" />{agent}</span>
			{/each}
			<span class="ml-auto">{[feature.owner, feature.updatedLabel].filter(Boolean).join(' · ')}</span>
		</footer>
	{/if}
</article>
