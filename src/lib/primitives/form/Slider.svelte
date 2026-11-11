<script lang="ts">
	import { untrack } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { fieldControlAttrs, getFieldContext } from './field';
	import { sliderRatio } from './slider-ratio';

	export interface Props extends Omit<HTMLInputAttributes, 'class' | 'children' | 'type' | 'value' | 'defaultValue' | 'min' | 'max' | 'step' | 'required'> {
		/** Bindable. */
		value?: number;
		/** Starting value when `value` is not given, and what a form reset restores (defaults to the starting value). */
		defaultValue?: number;
		min?: number;
		max?: number;
		step?: number;
		/** Shows the current value next to the track. */
		showValue?: boolean;
		/** Formats the shown value; also given to screen readers as `aria-valuetext`. */
		formatValue?: (value: number) => string;
		/** Marks the slider invalid (a surrounding Field with an error does too). */
		invalid?: boolean;
		onValueChange?: (value: number) => void;
		/** The `<input>` element. Bindable. */
		ref?: HTMLInputElement | null;
		/** Classes for the row around the slider (width, margins…). Attributes go on the `<input>`. */
		class?: string;
	}

	let {
		defaultValue,
		value = $bindable(defaultValue ?? 50),
		min = 0,
		max = 100,
		step = 1,
		showValue = false,
		formatValue,
		invalid = false,
		onValueChange,
		ref = $bindable(null),
		id,
		disabled,
		'aria-describedby': describedBy,
		class: className = '',
		...rest
	}: Props = $props();

	const field = getFieldContext();
	// A form reset restores `defaultValue`, or the value the slider started at.
	const initialValue = untrack(() => value);
	// A range always has a value, so `required` does not apply to it.
	const control = $derived.by(() => {
		const { required: _required, ...attrs } = fieldControlAttrs(field, { id, describedBy, invalid, disabled: Boolean(disabled) });
		return attrs;
	});
	const shown = $derived(formatValue ? formatValue(value) : String(value));
</script>

<div class={cn('flex w-full min-w-0 items-center gap-3', className)}>
	<input {...rest}
		{...control}
		type="range"
		bind:this={ref}
		bind:value
		defaultValue={defaultValue ?? initialValue}
		{min}
		{max}
		{step}
		aria-valuetext={formatValue ? shown : rest['aria-valuetext']}
		oninput={(event) => {
			onValueChange?.(Number(event.currentTarget.value));
			rest.oninput?.(event);
		}}
		style:--ak-slider-ratio={sliderRatio(value, min, max)}
		class="ak-slider min-w-0 flex-1"
	/>
	{#if showValue}
		<span aria-hidden="true" class="min-w-8 shrink-0 text-right text-xs font-medium tabular-nums text-fg-main">{shown}</span>
	{/if}
</div>

<style>
	.ak-slider {
		--ak-slider-thumb: 16px;
		--ak-slider-track: 6px;
		--ak-slider-filled: calc(var(--ak-slider-thumb) / 2 + (100% - var(--ak-slider-thumb)) * var(--ak-slider-ratio, 0.5));
		appearance: none;
		height: 20px;
		margin: 0;
		background: transparent;
		cursor: pointer;
	}

	.ak-slider:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.ak-slider::-webkit-slider-runnable-track {
		height: var(--ak-slider-track);
		border-radius: 9999px;
		background: linear-gradient(
			to right,
			var(--ak-color-accent) var(--ak-slider-filled),
			var(--ak-color-border) var(--ak-slider-filled)
		);
	}

	.ak-slider::-moz-range-track {
		height: var(--ak-slider-track);
		border-radius: 9999px;
		background: var(--ak-color-border);
	}

	.ak-slider::-moz-range-progress {
		height: var(--ak-slider-track);
		border-radius: 9999px;
		background: var(--ak-color-accent);
	}

	.ak-slider::-webkit-slider-thumb {
		appearance: none;
		width: var(--ak-slider-thumb);
		height: var(--ak-slider-thumb);
		margin-top: calc((var(--ak-slider-track) - var(--ak-slider-thumb)) / 2);
		border: 2px solid var(--ak-color-accent);
		border-radius: 9999px;
		background: var(--ak-color-surface);
		box-shadow: var(--ak-shadow-btn);
	}

	.ak-slider::-moz-range-thumb {
		box-sizing: border-box;
		width: var(--ak-slider-thumb);
		height: var(--ak-slider-thumb);
		border: 2px solid var(--ak-color-accent);
		border-radius: 9999px;
		background: var(--ak-color-surface);
		box-shadow: var(--ak-shadow-btn);
	}

	.ak-slider[aria-invalid='true']::-webkit-slider-thumb {
		border-color: var(--ak-color-danger);
	}

	.ak-slider[aria-invalid='true']::-moz-range-thumb {
		border-color: var(--ak-color-danger);
	}

	.ak-slider:focus-visible::-webkit-slider-thumb {
		box-shadow: 0 0 0 4px color-mix(in oklch, var(--ak-color-accent) 25%, transparent);
	}

	.ak-slider:focus-visible::-moz-range-thumb {
		box-shadow: 0 0 0 4px color-mix(in oklch, var(--ak-color-accent) 25%, transparent);
	}

	@media (prefers-reduced-motion: no-preference) {
		.ak-slider::-webkit-slider-thumb {
			transition: box-shadow 150ms ease;
		}

		.ak-slider::-moz-range-thumb {
			transition: box-shadow 150ms ease;
		}
	}
</style>
