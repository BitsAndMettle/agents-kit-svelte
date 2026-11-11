<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { SURFACE } from '../../ui/styles';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'title'> {
		/** Heading text. For an interactive card it is also the link or button text. The `aria-label` prop (passed through) names that link or button when there is no visible title. */
		title?: string;
		description?: string;
		/** Controls on the right of the header. They stay separately clickable. */
		actions?: Snippet;
		/** Card body. */
		children?: Snippet;
		footer?: Snippet;
		/** Makes the whole card a link to this address. */
		href?: string;
		/** Makes the whole card a button that calls this. Ignored when `href` is set. */
		onSelect?: () => void;
		/** Heading level of the title. */
		headingLevel?: 2 | 3 | 4 | 5 | 6;
		class?: string;
	}

	let {
		title = '',
		description = '',
		actions,
		children,
		footer,
		href,
		onSelect,
		'aria-label': ariaLabel,
		headingLevel = 3,
		class: className = '',
		...rest
	}: Props = $props();

	let interactive = $derived(Boolean(href) || Boolean(onSelect));
	let hasHeader = $derived(Boolean(title || description || actions || (interactive && ariaLabel)));
	/** The one tab stop: stretched over the card by a pseudo-element, so no interactive element is nested. */
	const MAIN = 'rounded-sm after:absolute after:inset-0 after:content-[""] focus-visible:outline-none';
	/** Links and controls inside the body of an interactive card sit above the stretched overlay, so they stay clickable; empty space still reaches the overlay. */
	const LIFT =
		'[&_a]:relative [&_a]:z-10 [&_button]:relative [&_button]:z-10 [&_input]:relative [&_input]:z-10 [&_select]:relative [&_select]:z-10 [&_textarea]:relative [&_textarea]:z-10 [&_[tabindex]]:relative [&_[tabindex]]:z-10';
	const INTERACTIVE =
		'ak-hover-soft hover:border-fg-light/50 has-[[data-card-main]:focus-visible]:outline-2 has-[[data-card-main]:focus-visible]:outline-offset-2 has-[[data-card-main]:focus-visible]:outline-accent-primary/70';
</script>

<div {...rest} class={cn(SURFACE.card, 'relative', interactive && INTERACTIVE, className)}>
	{#if hasHeader}
		<div class={cn('flex items-start justify-between gap-3 px-4 pt-4', !children && !footer && 'pb-4')}>
			<div class="min-w-0">
				{#if title || (interactive && ariaLabel)}
					<svelte:element this={`h${headingLevel}`} class={cn(SURFACE.title, 'm-0')}>
						{#if href}
							<a {href} data-card-main aria-label={ariaLabel} class={MAIN}>{title}</a>
						{:else if onSelect}
							<button type="button" data-card-main aria-label={ariaLabel} onclick={() => onSelect?.()} class={cn(MAIN, 'm-0 block cursor-pointer border-0 bg-transparent p-0 text-left font-[inherit] text-inherit')}>{title}</button>
						{:else}
							{title}
						{/if}
					</svelte:element>
				{/if}
				{#if description}
					<p class={cn(SURFACE.description, 'm-0 mt-0.5')}>{description}</p>
				{/if}
			</div>
			{#if actions}
				<div class="relative z-10 flex shrink-0 items-center gap-1.5">{@render actions()}</div>
			{/if}
		</div>
	{/if}
	{#if children}
		<div class={cn('px-4 pb-4 text-[13px] leading-5 text-fg-main', interactive && LIFT, hasHeader ? 'pt-3' : 'pt-4')}>
			{@render children()}
		</div>
	{/if}
	{#if footer}
		<div class={cn(SURFACE.footer, 'relative z-10', !hasHeader && !children && 'border-t-0')}>
			{@render footer()}
		</div>
	{/if}
</div>
