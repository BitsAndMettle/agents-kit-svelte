<script lang="ts" module>
	import type { Snippet } from 'svelte';

	/** One tab: its trigger label (text or a snippet for rich labels) and its panel content. */
	export interface TabItem {
		value: string;
		label: string | Snippet;
		disabled?: boolean;
		content: Snippet;
	}
</script>

<script lang="ts">
	import { cn } from '../../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { SEGMENT_GROUP_CLASS, segmentClass } from '../../ui/styles';
	import { Tabs as HeadlessTabs } from '../../headless/patterns/groups.svelte';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		items: TabItem[];
		/** The selected tab. Bindable. Falls back to `defaultValue`, then the first enabled tab. */
		value?: string;
		defaultValue?: string;
		onValueChange?: (value: string) => void;
		/** `underline` is a ruled list; `segmented` is a pill group. */
		variant?: 'underline' | 'segmented';
		orientation?: 'horizontal' | 'vertical';
		/** `automatic`: arrow keys select. `manual`: arrow keys move focus, Enter/Space selects. */
		activation?: 'automatic' | 'manual';
		/**
		 * Panel content: `eager` keeps every panel mounted, `lazy` mounts a panel the first time
		 * it is shown and keeps it, `active` mounts only the selected one.
		 */
		mount?: 'eager' | 'lazy' | 'active';
		/** The root element. */
		ref?: HTMLDivElement;
		/** Names the tab list (the real attribute, passed through to it). */
		'aria-label'?: string;
		'aria-labelledby'?: string;
		class?: string;
	}

	let {
		items,
		value = $bindable(),
		defaultValue,
		onValueChange,
		variant = 'underline',
		orientation = 'horizontal',
		activation = 'automatic',
		mount = 'eager',
		ref = $bindable(),
		'aria-label': ariaLabel,
		'aria-labelledby': ariaLabelledby,
		class: className = '',
		...rest
	}: Props = $props();

	export type TabsProps = Props;

	const id = $props.id();

	let current = $derived(value ?? defaultValue ?? items.find((item) => !item.disabled)?.value ?? '');

	const tabs = new HeadlessTabs({
		id,
		value: () => current,
		onValueChange: (next) => {
			value = next;
			onValueChange?.(next);
		},
		orientation: () => orientation,
		activation: () => activation
	});

	let visited = $state<string[]>([]);
	$effect(() => {
		if (current && !visited.includes(current)) visited = [...visited, current];
	});

	const vertical = $derived(orientation === 'vertical');

	let listClass = $derived(
		variant === 'segmented'
			? cn(SEGMENT_GROUP_CLASS, vertical ? 'flex-col items-stretch self-start rounded-card' : 'max-w-full self-start overflow-x-auto')
			: cn(
					'flex gap-1',
					vertical ? 'flex-col border-e border-card-border' : 'max-w-full overflow-x-auto border-b border-card-border'
				)
	);

	let tabClass = $derived(
		variant === 'segmented'
			? cn(
					segmentClass(false),
					'whitespace-nowrap aria-disabled:cursor-not-allowed aria-disabled:opacity-50 data-[state=active]:bg-card-bg data-[state=active]:text-fg-main data-[state=active]:shadow-btn',
					vertical && 'justify-start'
				)
			: cn(
					'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap border-transparent px-3 text-sm font-medium text-fg-light transition-colors hover:text-fg-main aria-disabled:cursor-not-allowed aria-disabled:opacity-50 data-[state=active]:border-fg-main data-[state=active]:text-fg-main [&_svg]:size-4',
					vertical ? '-me-px justify-start border-e-2' : '-mb-px border-b-2'
				)
	);
</script>

<div {...rest} bind:this={ref} class={cn('flex gap-3', vertical ? 'flex-row' : 'flex-col', className)}>
	<div {...tabs.list} aria-label={ariaLabel} aria-labelledby={ariaLabelledby} class={listClass}>
		{#each items as item (item.value)}
			<button {...tabs.tab({ value: item.value, disabled: item.disabled })} class={tabClass}>
				{#if typeof item.label === 'string'}{item.label}{:else}{@render item.label()}{/if}
			</button>
		{/each}
	</div>
	<div class="min-w-0 flex-1">
		{#each items as item (item.value)}
			<div {...tabs.panel(item.value)} class="text-sm text-fg-main">
				{#if mount === 'eager' || current === item.value || (mount === 'lazy' && visited.includes(item.value))}
					{@render item.content()}
				{/if}
			</div>
		{/each}
	</div>
</div>
