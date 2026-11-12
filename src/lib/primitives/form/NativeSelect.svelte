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

	/** `default` is a full-width form field; `pill` is a compact chip sized to the chosen option, for a role in a list row or a filter. */
	export type NativeSelectVariant = 'default' | 'pill';
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
		/**
		 * `default`: a full-width field. `pill`: a compact chip as wide as the chosen option's text, with the
		 * native select laid over it (so the picker, keyboard and form post stay native). Give a pill an
		 * `aria-label` (or a Field) like any select. Default `default`.
		 */
		variant?: NativeSelectVariant;
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
		variant = 'default',
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

	/** Pill face per size: height, padding (room for the chevron on the right) and text. */
	const PILL_SIZES: Record<NativeSelectSize, string> = {
		sm: 'h-6 pl-2.5 pr-6 text-[11px]',
		md: 'h-7 pl-3 pr-7 text-xs',
		lg: 'h-8 pl-3.5 pr-8 text-[13px]'
	};

	function findLabel(entries: (NativeSelectOption | NativeSelectOptionGroup)[], wanted: string): string | undefined {
		for (const entry of entries) {
			if ('options' in entry) {
				const found = entry.options.find((option) => option.value === wanted);
				if (found) return found.label;
			} else if (entry.value === wanted) return entry.label;
		}
		return undefined;
	}

	// The pill's face is as wide as the chosen option's text. With `options` that text is known on the
	// server; with `<option>` children it is read from the element once mounted.
	let childLabel = $state<string | undefined>(undefined);
	$effect(() => {
		if (variant !== 'pill' || !ref) return;
		void value;
		childLabel = ref.selectedOptions[0]?.text;
	});
	const pillLabel = $derived((value ? findLabel(options, value) : undefined) ?? childLabel ?? (value || placeholder || ''));
</script>

{#snippet entries()}
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
{/snippet}

{#if variant === 'pill'}
	<!--
		The face is an invisible copy of the chosen text that sizes the chip; the select lies over it and
		draws its own text, so without JavaScript a new choice still shows (at worst clipped).
	-->
	<div
		class={cn(
			'relative inline-flex max-w-full min-w-0 items-center rounded-full border border-transparent bg-canvas-secondary font-medium text-fg-main transition-colors hover:bg-canvas-primary hover:border-card-border has-[select:focus-visible]:outline-2 has-[select:focus-visible]:outline-offset-2 has-[select:focus-visible]:outline-accent-primary/70 has-[select:disabled]:opacity-50 has-[select:disabled]:hover:border-transparent has-[select:disabled]:hover:bg-canvas-secondary has-[select[aria-invalid=true]]:border-status-danger/70',
			PILL_SIZES[size],
			className
		)}
	>
		<span aria-hidden="true" class="invisible block min-w-[2ch] truncate whitespace-pre">{pillLabel}</span>
		<select {...rest}
			{...control}
			bind:this={ref}
			bind:value
			defaultValue={defaultValue ?? initialValue}
			onchange={(event) => {
				childLabel = event.currentTarget.selectedOptions[0]?.text;
				onValueChange?.(event.currentTarget.value);
				rest.onchange?.(event);
			}}
			class={cn('absolute inset-0 m-0 w-full min-w-0 cursor-pointer appearance-none truncate rounded-full border-0 bg-transparent font-medium text-fg-main focus:outline-none [&_option]:bg-card-bg [&_option]:text-fg-main disabled:cursor-not-allowed', PILL_SIZES[size], 'h-full')}
		>
			{@render entries()}
		</select>
		<ChevronDown aria-hidden="true" class={['pointer-events-none absolute top-1/2 -translate-y-1/2 text-fg-light', size === 'sm' ? 'right-1.5 size-3' : size === 'lg' ? 'right-2.5 size-3.5' : 'right-2 size-3']} />
	</div>
{:else}
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
			{@render entries()}
		</select>
		<ChevronDown aria-hidden="true" class={['pointer-events-none absolute top-1/2 -translate-y-1/2 text-fg-light', size === 'lg' ? 'right-3 size-4' : 'right-2.5 size-3.5']} />
	</div>
{/if}
