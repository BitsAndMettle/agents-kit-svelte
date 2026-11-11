<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		/** Shape of a placeholder: a `block`, a text `line` or a `circle`. */
		shape?: 'block' | 'line' | 'circle';
		/** Number of text lines (for `shape="line"`). The last one is shorter. */
		lines?: number;
		/** CSS width, e.g. `120px` or `60%`. Circles use it as the diameter. */
		width?: string;
		/** CSS height. Defaults to 1rem for blocks, one text line for lines, and the width for circles. */
		height?: string;
		/**
		 * Pass children to make this the loading container: it sets `aria-busy` and reads `loadingLabel`,
		 * and the placeholders inside stay hidden from assistive technology.
		 */
		children?: Snippet;
		/** Plain text read for the loading container. */
		loadingLabel?: string;
		/** Also announces the label through a live region once, after it appears. */
		announce?: boolean;
		class?: string;
	}

	let {
		shape = 'block',
		lines = 1,
		width,
		height,
		children,
		loadingLabel = 'Loading',
		announce = false,
		class: className = '',
		style,
		...rest
	}: Props = $props();

	let box = $derived(
		[
			width ? `width:${width}` : '',
			shape === 'circle' ? `height:${height ?? width ?? '2.5rem'}` : height ? `height:${height}` : '',
			shape === 'circle' && !width ? 'width:2.5rem' : '',
			typeof style === 'string' ? style : ''
		]
			.filter(Boolean)
			.join(';')
	);
		let announcement = $state('');
	// A live region only speaks changes, so it starts empty and is filled after mount.
	$effect(() => {
		if (!announce) return;
		const text = loadingLabel;
		const timer = setTimeout(() => (announcement = text), 60);
		return () => {
			clearTimeout(timer);
			announcement = '';
		};
	});
	let rows = $derived(Math.max(1, Math.floor(lines)));
</script>

{#if children}
	<div {...rest} aria-busy="true" class={cn('flex flex-col gap-2', className)} {style}>
		<span class="sr-only">{loadingLabel}</span>
		{#if announce}<span role="status" class="sr-only">{announcement}</span>{/if}
		{@render children()}
	</div>
{:else if shape === 'line' && rows > 1}
	<div {...rest} aria-hidden="true" class={cn('flex w-full flex-col gap-2', className)} {style}>
		{#each { length: rows } as _, n (n)}
			<span class="ak-skeleton block h-3.5 rounded-chip" style={n === rows - 1 ? 'width:60%' : 'width:100%'}></span>
		{/each}
	</div>
{:else}
	<div
		{...rest}
		aria-hidden="true"
		class={cn(
			'ak-skeleton',
			shape === 'circle' ? 'shrink-0 rounded-full' : shape === 'line' ? 'h-3.5 w-full rounded-chip' : 'h-4 w-full rounded-control',
			className
		)}
		style={box}
	></div>
{/if}

<style>
	.ak-skeleton {
		background-color: color-mix(in oklch, var(--ak-color-fg) 9%, transparent);
		background-image: linear-gradient(
			90deg,
			transparent 0%,
			color-mix(in oklch, var(--ak-color-fg) 9%, transparent) 50%,
			transparent 100%
		);
		background-size: 220% 100%;
		background-repeat: no-repeat;
		background-position: 120% 0;
	}
	@media (prefers-reduced-motion: no-preference) {
		.ak-skeleton {
			animation: ak-skeleton-sweep 1.6s ease-in-out infinite;
		}
	}
	@keyframes ak-skeleton-sweep {
		to {
			background-position: -120% 0;
		}
	}
</style>
