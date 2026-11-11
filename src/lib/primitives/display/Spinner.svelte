<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { STATUS_TEXT_CLASS, type UiTone } from '../../ui/styles';

	export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';

	export interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, 'class' | 'children'> {
		size?: SpinnerSize;
		/** `current` takes the surrounding text colour, which suits a spinner inside a button. */
		tone?: UiTone | 'current';
		/** Announced politely to assistive technology. Empty text means no announcement. */
		label?: string;
		/** Hides it from assistive technology, for a spinner inside a button that already says it is busy. */
		decorative?: boolean;
		class?: string;
	}

	let {
		size = 'md',
		tone = 'current',
		label = 'Loading',
		decorative = false,
		class: className = '',
		...rest
	}: Props = $props();

	const SIZES: Record<SpinnerSize, string> = {
		xs: 'size-3',
		sm: 'size-4',
		md: 'size-5',
		lg: 'size-8'
	};
	let announced = $derived(!decorative && label !== '');
</script>

<span {...rest}
	role={announced ? 'status' : undefined}
	aria-hidden={decorative ? 'true' : undefined}
	class={cn('inline-flex shrink-0 align-middle', tone === 'current' ? 'text-current' : STATUS_TEXT_CLASS[tone], className)}
>
	<svg class={cn('ak-spinner', SIZES[size])} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
		<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.2" stroke-width="3" />
		<path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
	</svg>
	{#if announced}<span class="sr-only">{label}</span>{/if}
</span>

<style>
	@media (prefers-reduced-motion: no-preference) {
		.ak-spinner {
			animation: ak-spinner-turn 0.8s linear infinite;
		}
	}
	@keyframes ak-spinner-turn {
		to {
			transform: rotate(360deg);
		}
	}
</style>
