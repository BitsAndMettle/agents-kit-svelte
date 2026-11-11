<script lang="ts" module>
	import type { FormControlSize } from './classes';

	/** One `<option>` of a NativeSelect. */
	export interface NativeSelectOption {
		value: string;
		label: string;
		disabled?: boolean;
	}

	/** A labelled `<optgroup>` of options. */
	export interface NativeSelectOptionGroup {
		label: string;
		options: NativeSelectOption[];
		disabled?: boolean;
	}

	export type NativeSelectSize = FormControlSize;
</script>

<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import { ChevronDown } from '@lucide/svelte';
	import { cn } from '../../ui/cn';
	import { INPUT_CLASS } from '../../ui/styles';
	import { fieldControlAttrs, getFieldContext } from './field';

	export interface Props extends Omit<HTMLSelectAttributes, 'class' | 'children' | 'value' | 'defaultValue' | 'size' | 'multiple'> {
		/** Options and option groups; or pass `<option>` elements as children. */
		options?: (NativeSelectOption | NativeSelectOptionGroup)[];
		/** The selected value; '' while the placeholder shows. Bindable. */
		value?: string;
		/** Starting value when `value` is not given, and what a form reset restores (defaults to the starting value). */
		defaultValue?: string;
		/** A first, unselectable option shown while nothing is chosen. With `required`, the form will not submit until a real option is picked. */
		placeholder?: string;
		size?: NativeSelectSize;
		/** Marks the select invalid (a surrounding Field with an error does too). */
		invalid?: boolean;
		onValueChange?: (value: string) => void;
		/** The `<select>` element. Bindable. */
		ref?: HTMLSelectElement | null;
		/** `<option>` and `<optgroup>` elements, instead of `options`. */
		children?: Snippet;
		/** Classes for the box around the select (width, margins…). Attributes go on the `<select>`. */
		class?: string;
	}

	let {
		options = [],
		defaultValue,
		value = $bindable(defaultValue ?? ''),
		placeholder,
		size = 'md',
		invalid = false,
		onValueChange,
		ref = $bindable(null),
		children,
		id,
		required,
		disabled,
		'aria-describedby': describedBy,
		class: className = '',
		...rest
	}: Props = $props();

	const field = getFieldContext();
	// A form reset restores `defaultValue`, or the option selected at the start.
	const initialValue = untrack(() => value);
	const control = $derived(fieldControlAttrs(field, { id, describedBy, invalid, required: Boolean(required), disabled: Boolean(disabled) }));

	const SIZES: Record<NativeSelectSize, string> = {
		sm: 'h-7 pl-2.5 pr-7 text-xs',
		md: 'h-8 pl-3 pr-8 text-[13px]',
		lg: 'h-10 pl-3.5 pr-9 text-sm'
	};
</script>

<div class={cn('relative w-full min-w-0', className)}>
	<select {...rest}
		{...control}
		bind:this={ref}
		bind:value
		defaultValue={defaultValue ?? initialValue}
		onchange={(event) => {
			onValueChange?.(event.currentTarget.value);
			rest.onchange?.(event);
		}}
		class={cn(INPUT_CLASS, 'cursor-pointer appearance-none truncate [&_option]:bg-card-bg [&_option]:text-fg-main aria-invalid:border-status-danger/70 disabled:cursor-not-allowed disabled:opacity-50', !value && placeholder && 'text-fg-light', SIZES[size])}
	>
		{#if placeholder !== undefined}
			<option value="" disabled>{placeholder}</option>
		{/if}
		{#if children}
			{@render children()}
		{:else}
			{#each options as entry, index (index)}
				{#if 'options' in entry}
					<optgroup label={entry.label} disabled={entry.disabled}>
						{#each entry.options as option (option.value)}
							<option value={option.value} disabled={option.disabled}>{option.label}</option>
						{/each}
					</optgroup>
				{:else}
					<option value={entry.value} disabled={entry.disabled}>{entry.label}</option>
				{/if}
			{/each}
		{/if}
	</select>
	<ChevronDown aria-hidden="true" class={['pointer-events-none absolute top-1/2 -translate-y-1/2 text-fg-light', size === 'lg' ? 'right-3 size-4' : 'right-2.5 size-3.5']} />
</div>
