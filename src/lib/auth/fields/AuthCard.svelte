<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { SURFACE } from '../../ui/styles';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'title'> {
		/** The page or step heading, e.g. "Sign in". */
		title?: string;
		/** One line under the title. */
		description?: string;
		/** Heading level of the title. An auth screen is usually the page's main heading, so the default is 1. */
		headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
		/** Your logo or mark, above the title. Decorative unless you label it. */
		logo?: Snippet;
		/** The form, buttons and dividers. */
		children?: Snippet;
		/** Below a rule at the bottom, e.g. "No account? Sign up". */
		footer?: Snippet;
		class?: string;
	}

	let { title = '', description = '', headingLevel = 1, logo, children, footer, class: className = '', ...rest }: Props = $props();
</script>

<div {...rest} class={cn(SURFACE.card, 'mx-auto w-full max-w-sm shadow-sm', className)}>
	<div class="grid gap-5 px-6 py-6">
		{#if logo || title || description}
			<div class="grid justify-items-center gap-2 text-center">
				{#if logo}
					<div class="flex items-center justify-center text-fg-main [&_svg]:size-8">{@render logo()}</div>
				{/if}
				{#if title}
					<svelte:element this={`h${headingLevel}`} class={cn(SURFACE.heading, 'm-0 text-lg')}>{title}</svelte:element>
				{/if}
				{#if description}
					<p class={cn(SURFACE.description, 'm-0 text-[13px]')}>{description}</p>
				{/if}
			</div>
		{/if}
		{@render children?.()}
	</div>
	{#if footer}
		<div class={cn(SURFACE.footer, 'px-6 py-3.5 text-center text-[13px]')}>{@render footer()}</div>
	{/if}
</div>
