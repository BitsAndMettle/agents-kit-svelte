<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../ui/cn';
	import { STRETCHED, TONE_FILL_CLASS, type UiTone } from '../ui/styles';
	import { READABLE_TONE_TEXT } from '../primitives/display/helpers';

	export interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children' | 'title'> {
		title: string;
		/** A short reference above the title, such as an issue number. */
		reference?: string;
		/** The one line that says where the card stands, e.g. "Waiting for your approval". */
		status?: string;
		/** Colour meaning of the status. */
		tone?: UiTone;
		/** Makes the whole card a link to this address, e.g. the card in full. */
		href?: string;
		/** Makes the whole card a button that calls this. Ignored when `href` is set. */
		onSelect?: () => void;
		/** Small facts under the status, usually badges. */
		children?: Snippet;
		/** Buttons at the bottom. They stay separately clickable. */
		actions?: Snippet;
		/** Heading level of the title. The default is two below `BoardLanes`' own, so a card sits under its lane and group labels. */
		headingLevel?: 2 | 3 | 4 | 5 | 6;
		class?: string;
	}

	let { title, reference = '', status = '', tone = 'neutral', href, onSelect, children, actions, headingLevel = 4, class: className = '', ...rest }: Props = $props();

	let interactive = $derived(Boolean(href) || Boolean(onSelect));
</script>

<article {...rest} class={cn('relative flex min-w-0 flex-col gap-1.5 rounded-card border border-card-border bg-card-bg p-3', interactive && STRETCHED.surface, className)}>
	<div class="min-w-0">
		{#if reference}<p class="m-0 font-mono text-[11px] leading-4 text-fg-light">{reference}</p>{/if}
		<svelte:element this={`h${headingLevel}`} class="m-0 text-sm leading-snug font-medium [overflow-wrap:anywhere] text-fg-main">
			{#if href}
				<a {href} data-card-main class={STRETCHED.main}>{title}</a>
			{:else if onSelect}
				<button type="button" data-card-main onclick={() => onSelect?.()} class={cn(STRETCHED.main, STRETCHED.button)}>{title}</button>
			{:else}
				{title}
			{/if}
		</svelte:element>
	</div>
	{#if status}
		<p class={cn('m-0 flex items-center gap-1.5 text-xs', READABLE_TONE_TEXT[tone])}>
			<span aria-hidden="true" class={cn('size-1.5 shrink-0 rounded-full', TONE_FILL_CLASS[tone])}></span>{status}
		</p>
	{/if}
	<!-- A snippet that draws nothing for this card leaves no gap behind. -->
	{#if children}
		<div class={cn('flex flex-wrap items-center gap-1 empty:hidden', interactive && STRETCHED.lift)}>{@render children()}</div>
	{/if}
	{#if actions}
		<div class="relative z-10 mt-1 flex flex-wrap items-center gap-1.5 empty:hidden">{@render actions()}</div>
	{/if}
</article>
