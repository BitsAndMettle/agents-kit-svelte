<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { Part } from '../../headless/runtime/parts';

	/** One item of the `items` array. Icon-only items need `'aria-label'`. */
	export interface ToggleGroupItem {
		value: string;
		label?: string;
		icon?: Snippet;
		'aria-label'?: string;
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
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { segmentClass, SEGMENT_GROUP_CLASS } from '../../ui/styles';
	import { ToggleGroup } from '../../headless/patterns/groups.svelte';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'role' | 'aria-label'> {
		/** Names the group for screen readers. */
		'aria-label': string;
		/** Allow several pressed items. Read once, at construction. Default false. */
		multiple?: boolean;
		/** Pressed value (single: `string | null`) or values (multiple: `string[]`). Bindable. */
		value?: string | string[] | null;
		/** The value a form reset restores. Used when `value` is not given. */
		defaultValue?: string | string[] | null;
		onValueChange?: (value: string | string[] | null) => void;
		/** With a name, each pressed value posts as a hidden input in a plain `<form>`. */
		name?: string;
		disabled?: boolean;
		orientation?: 'horizontal' | 'vertical';
		/** Arrow keys wrap. Default true. */
		loop?: boolean;
		items?: ToggleGroupItem[];
		/** Custom items; used when `items` is not given. */
		children?: Snippet<[ToggleGroupApi]>;
		/** The group element. Bindable. */
		ref?: HTMLDivElement | null;
		class?: string;
	}

	let {
		'aria-label': label,
		multiple = false,
		value = $bindable(),
		defaultValue,
		onValueChange,
		name,
		disabled = false,
		orientation = 'horizontal',
		loop = true,
		items,
		children,
		ref = $bindable(null),
		class: className = '',
		...rest
	}: Props = $props();

	// What a form reset restores, fixed at construction.
	// svelte-ignore state_referenced_locally
	const initial = value ?? defaultValue ?? (multiple ? [] : null);
	// svelte-ignore state_referenced_locally
	if (value === undefined) value = initial;

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

	$effect(() => {
		const form = ref?.closest('form');
		if (!form) return;
		const reset = () => {
			value = initial;
			onValueChange?.(initial);
		};
		form.addEventListener('reset', reset);
		return () => form.removeEventListener('reset', reset);
	});

	const pressedValues = $derived(Array.isArray(value) ? value : value == null ? [] : [value]);

	const api: ToggleGroupApi = {
		item: (options) => group.item({ ...options, disabled: options.disabled || disabled }),
		isPressed: (v) => group.isPressed(v),
		itemClass: (v) => cn(segmentClass(group.isPressed(v)), 'cursor-pointer disabled:cursor-not-allowed disabled:opacity-50')
	};
</script>

<div {...rest} bind:this={ref} {...group.root} aria-label={label} data-orientation={orientation} class={cn(SEGMENT_GROUP_CLASS, orientation === 'vertical' && 'flex-col items-stretch rounded-[14px]', className)}>
	{#if items}
		{#each items as item (item.value)}
			<button {...group.item({ value: item.value, disabled: item.disabled || disabled })} aria-label={item['aria-label']} class={api.itemClass(item.value)}>
				{@render item.icon?.()}
				{#if item.label}{item.label}{/if}
			</button>
		{/each}
	{:else}
		{@render children?.(api)}
	{/if}
	{#if name}
		{#each pressedValues as v (v)}
			<input type="hidden" {name} value={v} {disabled} />
		{/each}
	{/if}
</div>
