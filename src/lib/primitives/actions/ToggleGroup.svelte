<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Part } from '../../headless/runtime/parts';

	/** One item of the `items` array. Icon-only items need `ariaLabel`. */
	export interface ToggleGroupItem {
		value: string;
		label?: string;
		icon?: Snippet;
		ariaLabel?: string;
		disabled?: boolean;
	}

	/** What the `children` snippet receives, for fully custom items. */
	export interface ToggleGroupApi {
		/** Spread on a `<button>`. */
		item: (options: { value: string; disabled?: boolean }) => Part<HTMLButtonElement>;
		isPressed: (value: string) => boolean;
		/** The kit's class list for one item. */
		itemClass: (value: string) => string;
	}

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'role' | 'aria-label'> {
		/** Names the group for screen readers. */
		label: string;
		/** Allow several pressed items. Read once, at construction. Default false. */
		multiple?: boolean;
		/** Pressed value (single: `string | null`) or values (multiple: `string[]`). Bindable. */
		value?: string | string[] | null;
		onValueChange?: (value: string | string[] | null) => void;
		orientation?: 'horizontal' | 'vertical';
		/** Arrow keys wrap. Default true. */
		loop?: boolean;
		items?: ToggleGroupItem[];
		/** Custom items; used when `items` is not given. */
		children?: Snippet<[ToggleGroupApi]>;
		class?: string;
	}

	export type ToggleGroupProps = Props;
</script>

<script lang="ts">
	import { cn } from '../../ui/cn';
	import { segmentClass, SEGMENT_GROUP_CLASS } from '../../ui/styles';
	import { ToggleGroup } from '../../headless/patterns/groups.svelte';

	let {
		label,
		multiple = false,
		value = $bindable(),
		onValueChange,
		orientation = 'horizontal',
		loop = true,
		items,
		children,
		class: className = '',
		...rest
	}: Props = $props();

	const id = $props.id();
	// `multiple` is fixed at construction, as the headless pattern requires.
	const group = new ToggleGroup<boolean>({
		id,
		// svelte-ignore state_referenced_locally
		multiple,
		orientation: () => orientation,
		loop: () => loop,
		value: () => (value ?? (multiple ? [] : null)) as string[] & (string | null),
		onValueChange: (next) => {
			value = next;
			onValueChange?.(next);
		}
	});

	const api: ToggleGroupApi = {
		item: (options) => group.item(options),
		isPressed: (v) => group.isPressed(v),
		itemClass: (v) => cn(segmentClass(group.isPressed(v)), 'cursor-pointer disabled:cursor-not-allowed disabled:opacity-50')
	};
</script>

<div {...rest} {...group.root} aria-label={label} data-orientation={orientation} class={cn(SEGMENT_GROUP_CLASS, orientation === 'vertical' && 'flex-col items-stretch rounded-[14px]', className)}>
	{#if items}
		{#each items as item (item.value)}
			<button {...group.item({ value: item.value, disabled: item.disabled })} aria-label={item.ariaLabel} class={api.itemClass(item.value)}>
				{@render item.icon?.()}
				{#if item.label}{item.label}{/if}
			</button>
		{/each}
	{:else}
		{@render children?.(api)}
	{/if}
</div>
