<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLLiAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { ROW } from '../../ui/styles';

	export interface Props extends Omit<HTMLLiAttributes, 'class' | 'children' | 'title'> {
		title: string;
		/** Makes the title a link, e.g. to the thing the row stands for. */
		href?: string;
		/** One quieter line under the title. */
		description?: string;
		/** Small facts after the title, usually badges. */
		children?: Snippet;
		/** Buttons at the end of the row. */
		actions?: Snippet;
		class?: string;
	}

	let { title, href, description = '', children, actions, class: className = '', ...rest }: Props = $props();
</script>

<!-- A list item: it goes in your `<ul>` or `<ol>`. -->
<li {...rest} class={cn(ROW.root, className)}>
	<div class="min-w-0 flex-1">
		<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
			{#if href}
				<a {href} class={cn(ROW.title, 'rounded-sm underline-offset-2 hover:underline')}>{title}</a>
			{:else}
				<p class={ROW.title}>{title}</p>
			{/if}
			{@render children?.()}
		</div>
		{#if description}<p class={ROW.description}>{description}</p>{/if}
	</div>
	{#if actions}
		<div class="flex shrink-0 items-center gap-1.5">{@render actions()}</div>
	{/if}
</li>
