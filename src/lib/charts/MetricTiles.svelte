<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { ArrowDown, ArrowUp, Minus } from '@lucide/svelte';
	import { capacityPercent, deltaVerdict, describeMetric, formatDeltaAmount, formatMetricValue, metricDelta, sparkline } from './metrics';
	import type { Metric } from './types';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children' | 'title'> {
		metrics: Metric[];
		title?: string;
		/** What the numbers cover, e.g. "last 24 hours". */
		period?: string;
		/** Makes every tile a button and reports which one was chosen, e.g. to open its detail. */
		onSelect?: (metric: Metric) => void;
		class?: string;
	}

	let { metrics, title = '', period = '', onSelect, class: className = '', ...rest }: Props = $props();

	const SPARK_W = 72;
	const SPARK_H = 24;
	const VERDICT_TEXT = { better: 'text-status-success', worse: 'text-status-danger', neutral: 'text-fg-light' } as const;
	const TILE = 'flex h-full min-w-0 flex-col gap-1 rounded-control border border-card-border bg-card-bg p-3 text-left';
</script>

{#snippet tile(metric: Metric)}
	{@const format = metric.format ?? 'number'}
	{@const shown = formatMetricValue(metric.value, format, metric.unit ?? '')}
	{@const delta = metric.previous === undefined ? null : metricDelta(metric.value, metric.previous)}
	{@const verdict = delta ? deltaVerdict(delta.direction, metric.better) : 'neutral'}
	{@const spark = sparkline(metric.series ?? [], SPARK_W, SPARK_H)}
	{@const fill = metric.max === undefined ? null : capacityPercent(metric.value, metric.max)}
	<span class="sr-only">{describeMetric(metric)}</span>
	<span aria-hidden="true" class="flex h-full min-w-0 flex-col gap-1">
		<span class="truncate text-[11px] text-fg-light">{metric.label}</span>
		<span class="flex items-end justify-between gap-2">
			<span class="min-w-0 text-[24px] leading-none font-semibold text-fg-main tabular-nums">
				{shown.text}{#if shown.unit && metric.max === undefined}<span class="ml-0.5 text-[12px] font-normal text-fg-light">{shown.unit}</span>{/if}{#if metric.max !== undefined}<span class="ml-1 text-[12px] font-normal text-fg-light">of {formatMetricValue(metric.max, format, metric.unit ?? '').text}</span>{/if}
			</span>
			{#if spark.points.length}
				{@const last = spark.points[spark.points.length - 1]}
				<svg width={SPARK_W} height={SPARK_H} viewBox="0 0 {SPARK_W} {SPARK_H}" class="max-w-[40%] shrink overflow-visible" focusable="false">
					{#if spark.line}<path d={spark.line} fill="none" class="stroke-fg-light" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />{/if}
					<circle cx={last[0]} cy={last[1]} r="2.5" class={cn('stroke-card-bg', verdict === 'better' ? 'fill-status-success' : verdict === 'worse' ? 'fill-status-danger' : 'fill-fg-light')} stroke-width="1.5" />
				</svg>
			{/if}
		</span>
		{#if fill !== null}
			<span class="mt-0.5 block h-1 overflow-hidden rounded-full bg-canvas-secondary"><span class={cn('block h-full rounded-full', fill >= 100 ? 'bg-status-warning' : 'bg-accent-primary')} style:width="{fill}%"></span></span>
		{/if}
		{#if delta}
			<span class={cn('inline-flex items-center gap-1 text-[11px] font-medium tabular-nums', VERDICT_TEXT[verdict])}>
				{#if delta.direction === 'up'}<ArrowUp class="size-3" />{:else if delta.direction === 'down'}<ArrowDown class="size-3" />{:else}<Minus class="size-3" />{/if}
				{delta.direction === 'flat' ? 'No change' : formatDeltaAmount(delta.diff, format, metric.unit ?? '')}
			</span>
		{/if}
		{#if metric.hint}<span class="text-[11px] leading-4 text-fg-light">{metric.hint}</span>{/if}
	</span>
{/snippet}

<section {...rest} class={cn('min-w-0', className)}>
	{#if title || period}
		<header class="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
			{#if title}<h3 class="text-[14px] font-semibold text-fg-main">{title}</h3>{/if}
			{#if period}<span class="text-[11px] text-fg-light">{period}</span>{/if}
		</header>
	{/if}
	<ul class="grid list-none grid-cols-2 gap-2 p-0 md:grid-cols-4">
		{#each metrics as metric (metric.id)}
			<li class="min-w-0">
				{#if onSelect}
					<button type="button" class={cn(TILE, 'w-full cursor-pointer transition-colors hover:bg-canvas-secondary')} onclick={() => onSelect?.(metric)}>
						{@render tile(metric)}
					</button>
				{:else}
					<div class={TILE}>
						{@render tile(metric)}
					</div>
				{/if}
			</li>
		{/each}
	</ul>
</section>
