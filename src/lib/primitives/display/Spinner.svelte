<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { STATUS_TEXT_CLASS, type UiTone } from '../../ui/styles';

	export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';

	export interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, 'class' | 'children'> {
		size?: SpinnerSize;
		/** `current` takes the surrounding text colour, which suits a spinner inside a button. */
		tone?: UiTone | 'current';
		/** Name of the spinner for assistive technology (a plain image label, not a live region). */
		loadingLabel?: string;
		/** Also announces the label through a live region once, after it appears. Leave off when many spinners show at once. */
		announce?: boolean;
		/** Hides it from assistive technology, for a spinner inside a button that already says it is busy. */
		decorative?: boolean;
		class?: string;
	}

	let {
		size = 'md',
		tone = 'current',
		loadingLabel = 'Loading',
		announce = false,
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
	let named = $derived(!decorative && !announce && loadingLabel !== '');
	let announcement = $state('');
	// A live region only speaks changes, so it starts empty and is filled after mount.
	$effect(() => {
		if (!announce || decorative) return;
		const text = loadingLabel;
		const timer = setTimeout(() => (announcement = text), 60);
		return () => {
			clearTimeout(timer);
			announcement = '';
		};
	});
</script>

<span {...rest}
	role={named ? 'img' : undefined}
	aria-label={named ? loadingLabel : undefined}
	aria-hidden={decorative ? 'true' : undefined}
	class={cn('inline-flex shrink-0 align-middle', tone === 'current' ? 'text-current' : STATUS_TEXT_CLASS[tone], className)}
>
	<svg class={cn('ak-spinner', SIZES[size])} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
		<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.2" stroke-width="3" />
		<path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
	</svg>
	{#if announce && !decorative}<span role="status" class="sr-only">{announcement}</span>{/if}
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
