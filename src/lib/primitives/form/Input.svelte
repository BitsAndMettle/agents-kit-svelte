<script lang="ts" module>
	import type { FormControlSize } from './classes';
	export type InputSize = FormControlSize;
</script>

<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { X } from '@lucide/svelte';
	import { cn } from '../../ui/cn';
	import { INPUT_CLASS } from '../../ui/styles';
	import { fieldControlAttrs, getFieldContext } from './field';

	export interface Props extends Omit<HTMLInputAttributes, 'class' | 'children' | 'size' | 'value' | 'defaultValue' | 'type'> {
		/** The text. Bindable. */
		value?: string | number | null;
		/** Starting value when `value` is not given, and what a form reset restores (defaults to the starting value). */
		defaultValue?: string | number | null;
		/** Native input type (text, email, search, number, password, url, tel…). Not checkbox, radio or range: use Checkbox, RadioGroup or Slider. */
		type?: Exclude<HTMLInputAttributes['type'], 'checkbox' | 'radio' | 'range' | 'file' | 'hidden' | 'submit' | 'reset' | 'button' | 'image'>;
		size?: InputSize;
		/** Marks the input invalid (a surrounding Field with an error does too). */
		invalid?: boolean;
		/** Content before the text, e.g. an icon or "https://". Decorative unless you label it. */
		leading?: Snippet;
		/** Content after the text, e.g. a unit. */
		trailing?: Snippet;
		/** Shows a clear button while there is text; it clears and puts focus back in the input. */
		clearable?: boolean;
		/** Accessible name of the clear button. */
		clearLabel?: string;
		/** Called with the new value on every edit and on clear. */
		onValueChange?: (value: string) => void;
		/** The `<input>` element. Bindable. */
		ref?: HTMLInputElement | null;
		/** Classes for the box around the input (width, margins…). Attributes go on the `<input>`. */
		class?: string;
	}

	let {
		defaultValue,
		value = $bindable(defaultValue ?? ''),
		type = 'text',
		size = 'md',
		invalid = false,
		leading,
		trailing,
		clearable = false,
		clearLabel = 'Clear',
		onValueChange,
		ref = $bindable(null),
		id,
		required,
		disabled,
		'aria-describedby': describedBy,
		class: className = '',
		...rest
	}: Props = $props();

	const field = getFieldContext();
	// A form reset restores `defaultValue`, or the value the input started with.
	const initialValue = untrack(() => value);
	const control = $derived(fieldControlAttrs(field, { id, describedBy, invalid, required: Boolean(required), disabled: Boolean(disabled) }));
	const filled = $derived(value !== null && value !== undefined && String(value) !== '');

	const SIZES: Record<InputSize, string> = {
		sm: 'h-7 px-2.5 text-xs gap-1.5 [&_svg]:size-3.5',
		md: 'h-8 px-3 text-[13px] gap-2 [&_svg]:size-3.5',
		lg: 'h-10 px-3.5 text-sm gap-2 [&_svg]:size-4'
	};

	// The box wears the INPUT_CLASS look; focus is shown while the input inside has it.
	const BOX = INPUT_CLASS.replaceAll('focus:', 'focus-within:');

	/** Clears the text the way typing would (so `oninput` listeners hear it) and refocuses. */
	function clear(): void {
		if (!ref) return;
		ref.value = '';
		ref.dispatchEvent(new Event('input', { bubbles: true }));
		ref.focus();
	}
</script>

<div
	data-invalid={control['aria-invalid'] ? '' : undefined}
	data-disabled={control.disabled ? '' : undefined}
	class={cn('relative flex items-center', BOX, SIZES[size], 'data-invalid:border-status-danger/70 data-disabled:opacity-50 data-disabled:cursor-not-allowed', className)}
>
	{#if leading}
		<span class="flex shrink-0 items-center text-fg-light">{@render leading()}</span>
	{/if}
	<input {...rest}
		{...control}
		bind:this={ref}
		bind:value
		defaultValue={defaultValue ?? initialValue}
		{type}
		oninput={(event) => {
			onValueChange?.(event.currentTarget.value);
			rest.oninput?.(event);
		}}
		class="h-full w-full min-w-0 flex-1 bg-transparent text-fg-main placeholder:text-fg-light focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed [&::-webkit-search-cancel-button]:appearance-none"
	/>
	{#if clearable && filled && !control.disabled && !rest.readonly}
		<button type="button" aria-label={clearLabel} onclick={clear} class="-mr-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-fg-light transition-colors hover:bg-canvas-secondary hover:text-fg-main">
			<X aria-hidden="true" />
		</button>
	{/if}
	{#if trailing}
		<span class="flex shrink-0 items-center text-fg-light">{@render trailing()}</span>
	{/if}
</div>
