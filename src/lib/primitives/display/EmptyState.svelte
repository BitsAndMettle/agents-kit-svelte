<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { SURFACE } from '../../ui/styles';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'title'> {
		title: string;
		description?: string;
		/** Icon or illustration above the title. Keep it decorative. */
		icon?: Snippet;
		/** The main next step, usually a button. */
		primaryAction?: Snippet;
		/** A quieter alternative, e.g. a link to the docs. */
		secondaryAction?: Snippet;
		/** Extra content between the description and the actions. */
		children?: Snippet;
		/** `compact` suits a card or sidebar; `full` suits a page. */
		size?: 'compact' | 'full';
		headingLevel?: 2 | 3 | 4 | 5 | 6;
		class?: string;
	}

	let {
		title,
		description = '',
		icon,
		primaryAction,
		secondaryAction,
		children,
		size = 'full',
		headingLevel = 3,
		class: className = '',
		...rest
	}: Props = $props();

	let full = $derived(size === 'full');
</script>

<div {...rest} class={cn('flex flex-col items-center text-center', full ? 'gap-3 px-6 py-12' : 'gap-2 px-4 py-6', className)}>
	{#if icon}
		<span
			aria-hidden="true"
			class={cn('inline-flex items-center justify-center rounded-full bg-canvas-secondary text-fg-light', full ? 'size-12 [&_svg]:size-6' : 'size-9 [&_svg]:size-4')}
		>
			{@render icon()}
		</span>
	{/if}
	<div class={cn('flex max-w-sm flex-col', full ? 'gap-1' : 'gap-0.5')}>
		<svelte:element this={`h${headingLevel}`} class={cn('m-0', full ? SURFACE.heading : SURFACE.title)}>{title}</svelte:element>
		{#if description}<p class={cn('m-0', full ? 'text-[13px] leading-5 text-fg-light' : SURFACE.description)}>{description}</p>{/if}
	</div>
	{#if children}<div class="max-w-sm text-[13px] text-fg-main">{@render children()}</div>{/if}
	{#if primaryAction || secondaryAction}
		<div class={cn('flex flex-wrap items-center justify-center gap-2', full && 'mt-1')}>
			{#if primaryAction}{@render primaryAction()}{/if}
			{#if secondaryAction}{@render secondaryAction()}{/if}
		</div>
	{/if}
</div>
