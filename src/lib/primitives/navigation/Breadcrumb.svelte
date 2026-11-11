<script lang="ts" module>
	/** One breadcrumb. Without `href` it is plain text; the last item is the current page. */
	export interface BreadcrumbItem {
		label: string;
		href?: string;
	}
</script>

<script lang="ts">
	import { cn } from '../../ui/cn';
	import { tick, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { ChevronRight } from '@lucide/svelte';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children'> {
		items: BreadcrumbItem[];
		/** Accessible name of the navigation landmark. */
		label?: string;
		/** Below the `sm` breakpoint, fold the middle items behind a "…" button. Default true. */
		collapse?: boolean;
		/** Replaces the default chevron between items. Always hidden from assistive technology. */
		separator?: Snippet;
		class?: string;
	}

	let { items, label = 'Breadcrumb', collapse = true, separator, class: className = '', ...rest }: Props = $props();

	let root = $state<HTMLElement>();
	let expanded = $state(false);

	// Only paths of four or more items have a middle worth folding: first, …, last two.
	let foldFrom = $derived(1);
	let foldTo = $derived(items.length - 2);
	let foldable = $derived(collapse && items.length > 3);
	let folded = $derived(foldable && !expanded);

	function hiddenOnNarrow(index: number): boolean {
		return folded && index >= foldFrom && index < foldTo;
	}

	/** Reveals the folded items and moves focus to the first one. */
	async function expand(): Promise<void> {
		expanded = true;
		await tick();
		root?.querySelector<HTMLElement>(`[data-crumb="${foldFrom}"]`)?.focus();
	}

	const LINK = 'rounded-control text-fg-light underline-offset-4 transition-colors hover:text-fg-main hover:underline';
</script>

{#snippet divider()}
	<span aria-hidden="true" class="flex shrink-0 items-center text-fg-light/70 [&_svg]:size-3.5 rtl:[&_svg]:-scale-x-100">
		{#if separator}{@render separator()}{:else}<ChevronRight />{/if}
	</span>
{/snippet}

<nav {...rest} bind:this={root} aria-label={label} class={cn('text-sm', className)}>
	<ol class="m-0 flex list-none flex-wrap items-center gap-x-1.5 gap-y-1 p-0">
		{#each items as item, index (index)}
			{@const last = index === items.length - 1}
			{#if folded && index === foldFrom}
				<li class="flex items-center gap-1.5 sm:hidden">
					<button
						type="button"
						aria-label="Show {foldTo - foldFrom} more {foldTo - foldFrom === 1 ? 'level' : 'levels'}"
						aria-expanded="false"
						onclick={expand}
						class="rounded-control px-1.5 text-fg-light transition-colors hover:bg-canvas-secondary hover:text-fg-main"
					>
						…
					</button>
					{@render divider()}
				</li>
			{/if}
			<li class={cn('items-center gap-1.5', hiddenOnNarrow(index) ? 'hidden sm:flex' : 'flex')}>
				{#if last}
					<span data-crumb={index} tabindex="-1" aria-current="page" class="font-medium text-fg-main">{item.label}</span>
				{:else if item.href}
					<a data-crumb={index} href={item.href} class={LINK}>{item.label}</a>
				{:else}
					<span data-crumb={index} tabindex="-1" class="text-fg-light">{item.label}</span>
				{/if}
				{#if !last}{@render divider()}{/if}
			</li>
		{/each}
	</ol>
</nav>
