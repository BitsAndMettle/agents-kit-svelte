<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../ui/cn';
	import { TONE_FILL_CLASS, type UiTone } from '../ui/styles';
	import { READABLE_TONE_TEXT } from '../primitives/display/helpers';
	import { formatMetricValue } from '../charts/metrics';
	import type { StatusStat } from './types';

	export interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children'> {
		/** What is going on right now, in a word or two, e.g. "Running" or "Paused". */
		status?: string;
		/** Colour meaning of the status. */
		tone?: UiTone;
		/** The numbers that matter, in order. Keep the labels short: the strip is one line where it fits. */
		stats?: StatusStat[];
		/** Buttons at the end, e.g. Pause. */
		actions?: Snippet;
		class?: string;
	}

	let { status = '', tone = 'neutral', stats = [], actions, class: className = '', ...rest }: Props = $props();

	function shown(stat: StatusStat): string {
		const format = stat.format ?? 'number';
		const value = formatMetricValue(stat.value, format, stat.unit ?? '');
		return stat.max === undefined ? value.text + value.unit : `${value.text}/${formatMetricValue(stat.max, format).text}`;
	}
</script>

<!-- Wide: status, numbers, actions on one line. Narrow: status and actions share the first line, the numbers wrap below. -->
<section {...rest} class={cn('@container flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-card border border-card-border bg-card-bg px-3 py-2 text-[13px]', className)}>
	{#if status}
		<p class={cn('m-0 flex items-center gap-1.5 font-medium', READABLE_TONE_TEXT[tone])}>
			<span aria-hidden="true" class={cn('size-2 shrink-0 rounded-full', TONE_FILL_CLASS[tone])}></span>{status}
		</p>
	{/if}
	{#if stats.length}
		<dl class="order-last m-0 flex w-full flex-wrap items-baseline gap-x-4 gap-y-1 @lg:order-none @lg:w-auto @lg:flex-1">
			{#each stats as stat (stat.id)}
				<div class="flex items-baseline gap-1.5">
					<dt class="text-xs text-fg-light">{stat.label}</dt>
					<dd class="m-0 font-medium text-fg-main tabular-nums">{shown(stat)}</dd>
				</div>
			{/each}
		</dl>
	{/if}
	{#if actions}
		<div class="ml-auto flex items-center gap-1.5">{@render actions()}</div>
	{/if}
</section>
