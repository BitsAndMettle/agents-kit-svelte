<!--
	@component
	A list of effects where the tone is spoken, not only coloured: each item has an icon and a
	screen-reader prefix ("Yes:", "No:", "Caution:", "Note:"), an optional description and an
	optional fact on the right. One list, or titled groups that sit side by side in a wide
	container (What changes / What stays, Can / Can't).
-->
<script lang="ts" module>
	/** The spoken prefix for each tone. */
	export interface ConsequenceListLabels {
		ok: string;
		no: string;
		warn: string;
		info: string;
	}
</script>

<script lang="ts">
	import type { Component } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Check, Info, TriangleAlert, X } from '@lucide/svelte';
	import { cn } from '../../ui/cn';
	import type { ConsequenceGroup, ConsequenceItem } from '../shared/types';
	import { headingBelow } from './helpers';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'title'> {
		/** One flat list of effects. */
		items?: ConsequenceItem[];
		/** Titled groups of effects; wins over `items`. */
		groups?: ConsequenceGroup[];
		/** A heading above the list, which also names it. */
		title?: string;
		/** @deprecated Use `title`. */
		heading?: string;
		/** Level of `title`; group titles take the next level (or this one without a heading). Default 3. */
		headingLevel?: 3 | 4 | 5;
		/** `auto`: groups sit side by side once the settings container is wide enough. Default `auto`. */
		columns?: 'auto' | 1 | 2;
		size?: 'sm' | 'md';
		labels?: Partial<ConsequenceListLabels>;
		class?: string;
	}

	let {
		items = [],
		groups,
		title,
		heading: headingAlias,
		headingLevel = 3,
		columns = 'auto',
		size = 'md',
		labels,
		class: className = '',
		...rest
	}: Props = $props();

	const heading = $derived(title ?? headingAlias);
	const text = $derived<ConsequenceListLabels>({ ok: 'Yes:', no: 'No:', warn: 'Caution:', info: 'Note:', ...labels });

	const id = $props.id();
	const headingId = `${id}-heading`;
	const groupLevel = $derived(heading ? headingBelow(headingLevel) : headingLevel);
	const lists = $derived<ConsequenceGroup[]>(groups && groups.length > 0 ? groups : [{ label: '', items }]);

	const ICONS: Record<ConsequenceItem['tone'], Component<{ class?: string }>> = { ok: Check, no: X, warn: TriangleAlert, info: Info };
	const TILE: Record<ConsequenceItem['tone'], string> = {
		ok: 'bg-status-success-subtle text-status-success',
		no: 'bg-status-danger-subtle text-status-danger',
		warn: 'bg-status-warning-subtle text-status-warning',
		info: 'bg-canvas-secondary text-fg-light'
	};
	const GRID = $derived(
		columns === 2 ? 'grid-cols-2' : columns === 1 ? 'grid-cols-1' : lists.length > 1 ? '@lg/settings:grid-cols-2' : 'grid-cols-1'
	);
</script>

<div {...rest} role={heading ? 'group' : undefined} aria-labelledby={heading ? headingId : undefined} class={cn('min-w-0', size === 'sm' ? 'text-xs leading-5' : 'text-[13px] leading-5', className)}>
	{#if heading}
		<svelte:element this={`h${headingLevel}`} id={headingId} class="m-0 mb-2 text-xs font-semibold text-fg-main">{heading}</svelte:element>
	{/if}
	<div class={cn('grid gap-x-6 gap-y-4', GRID)}>
		{#each lists as group, index (index)}
			<div class="min-w-0">
				{#if group.label}
					<svelte:element this={`h${groupLevel}`} id={`${id}-group-${index}`} class="m-0 mb-2 text-xs font-semibold text-fg-main">{group.label}</svelte:element>
				{/if}
				<ul role="list" aria-labelledby={group.label ? `${id}-group-${index}` : undefined} class={cn('m-0 grid list-none p-0', size === 'sm' ? 'gap-1.5' : 'gap-2.5')}>
					{#each group.items as item, itemIndex (item.id ?? itemIndex)}
						{@const Glyph = ICONS[item.tone]}
						<li data-tone={item.tone} class="flex min-w-0 items-start gap-2.5">
							<span aria-hidden="true" class={cn('mt-px inline-flex shrink-0 items-center justify-center rounded-full', size === 'sm' ? 'size-4 [&_svg]:size-2.5' : 'size-5 [&_svg]:size-3', TILE[item.tone])}>
								<Glyph class="stroke-[2.5]" />
							</span>
							<span class="min-w-0 flex-1">
								<span class="text-fg-main"><span class="sr-only">{`${text[item.tone]} `}</span>{item.label}</span>
								{#if item.description}
									<span class="block text-xs text-fg-light">{item.description}</span>
								{/if}
							</span>
							{#if item.aside}
								<span class="shrink-0 text-xs text-fg-light tabular-nums">{item.aside}</span>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>
</div>
