<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { PROGRESS_TRACK_CLASS, progressFillClass, type UiTone } from '../../ui/styles';
	import { progressPercent } from './helpers';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		/** Current value. Leave it out (or `null`) for an indeterminate bar. */
		value?: number | null;
		min?: number;
		max?: number;
		tone?: UiTone;
		/** Visible label, also the accessible name. Without it, pass `aria-label`. */
		label?: string;
		/** Shows the value text on the right of the label. */
		showValue?: boolean;
		/** Spoken and shown value text. Defaults to a percentage. */
		valueText?: string | ((value: number, percent: number) => string);
		size?: 'sm' | 'md' | 'lg';
		class?: string;
	}

	let {
		value = null,
		min = 0,
		max = 100,
		tone = 'accent',
		label = '',
		showValue = false,
		valueText,
		size = 'md',
		class: className = '',
		...rest
	}: Props = $props();

	const uid = $props.id();

	let indeterminate = $derived(value === null || value === undefined);
	let percent = $derived(indeterminate ? 0 : progressPercent(value as number, min, max));
	let text = $derived(
		indeterminate
			? ''
			: typeof valueText === 'function'
				? valueText(value as number, percent)
				: (valueText ?? `${Math.round(percent)}%`)
	);
</script>

<div {...rest}
	role="progressbar"
	aria-labelledby={label ? `${uid}-label` : undefined}
	aria-valuemin={indeterminate ? undefined : min}
	aria-valuemax={indeterminate ? undefined : max}
	aria-valuenow={indeterminate ? undefined : Math.min(max, Math.max(min, value as number))}
	aria-valuetext={indeterminate ? undefined : text}
	class={cn('flex w-full flex-col gap-1.5', className)}
>
	{#if label || (showValue && !indeterminate)}
		<div class="flex items-baseline justify-between gap-3 text-xs">
			{#if label}<span id="{uid}-label" class="font-medium text-fg-main">{label}</span>{/if}
			{#if showValue && !indeterminate}<span aria-hidden="true" class="ml-auto tabular-nums text-fg-light">{text}</span>{/if}
		</div>
	{/if}
	<div class={cn(PROGRESS_TRACK_CLASS, size === 'lg' && 'h-2.5', size === 'sm' && 'h-1', 'relative')}>
		{#if indeterminate}
			<span class={cn(progressFillClass(tone), 'ak-progress-indeterminate absolute w-2/5 transition-none')}></span>
		{:else}
			<span class={progressFillClass(tone)} style:width="{percent}%"></span>
		{/if}
	</div>
</div>

<style>
	.ak-progress-indeterminate {
		left: 0;
	}
	@media (prefers-reduced-motion: no-preference) {
		.ak-progress-indeterminate {
			animation: ak-progress-slide 1.4s ease-in-out infinite;
		}
	}
	@keyframes ak-progress-slide {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(250%);
		}
	}
</style>
