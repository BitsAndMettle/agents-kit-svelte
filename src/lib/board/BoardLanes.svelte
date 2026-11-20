<script lang="ts" generics="T extends { id: string | number }">
	import type { HTMLAttributes } from 'svelte/elements';
	import { SvelteSet } from 'svelte/reactivity';
	import { cn } from '../ui/cn';
	import { buttonClass, STATUS_TEXT_CLASS } from '../ui/styles';
	import type { BoardLanesProps } from './types';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | keyof BoardLanesProps<T>>, BoardLanesProps<T> {}

	let { lanes, card, headingLevel = 2, class: className = '', ...rest }: Props = $props();

	/** Folded groups shown in full, by lane and group id, so they stay open when the lanes are handed over anew. */
	const shown = new SvelteSet<string>();
</script>

<!-- As many lanes side by side as fit at a readable width; the rest wrap, down to one column on a phone. -->
<div {...rest} class={cn('grid grid-cols-[repeat(auto-fit,minmax(min(15rem,100%),1fr))] items-start gap-x-3 gap-y-6', className)}>
	{#each lanes as lane (lane.id)}
		<section aria-label={lane.label} class="flex min-w-0 flex-col gap-2">
			<header class="flex items-baseline gap-2 text-xs {STATUS_TEXT_CLASS[lane.tone ?? 'neutral']}">
				<svelte:element this={`h${headingLevel}`} class="m-0 truncate font-semibold tracking-wide uppercase">{lane.label}</svelte:element>
				<span class="tabular-nums">{lane.groups.reduce((count, group) => count + group.items.length, 0)}</span>
			</header>
			{#each lane.groups as group (group.id)}
				{@const key = JSON.stringify([lane.id, group.id])}
				{@const folds = group.fold !== undefined && group.items.length > group.fold}
				{@const open = !folds || shown.has(key)}
				<!-- A wider gap between groups than between cards, so a group reads as one even without a label. -->
				<div class="flex min-w-0 flex-col gap-1.5 [&+&]:mt-2">
					{#if group.label}
						<svelte:element this={`h${headingLevel + 1}`} class="m-0 truncate text-xs font-medium text-fg-light">{group.label}</svelte:element>
					{/if}
					<ul class="m-0 flex list-none flex-col gap-2 p-0">
						{#each open ? group.items : group.items.slice(0, group.fold) as item (item.id)}
							<li class="min-w-0">{@render card(item)}</li>
						{/each}
					</ul>{#if folds}
						<button type="button" class={buttonClass('ghost', 'xs', 'self-start')} aria-expanded={open} onclick={() => (open ? shown.delete(key) : shown.add(key))}>
							{open ? 'Show fewer' : `Show all ${group.items.length}`}
						</button>
					{/if}</div>
			{/each}
		</section>
	{/each}
</div>
