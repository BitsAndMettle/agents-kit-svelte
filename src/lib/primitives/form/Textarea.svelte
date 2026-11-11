<script lang="ts">
	import { untrack } from 'svelte';
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { INPUT_CLASS } from '../../ui/styles';
	import { fieldControlAttrs, getFieldContext, joinIds } from './field';
	import { counterMessage, nearLimitThreshold } from './text-count';

	export interface Props extends Omit<HTMLTextareaAttributes, 'class' | 'children' | 'value'> {
		/** The text. Bindable. */
		value?: string | null;
		/** Grows with its content (CSS `field-sizing: content`, with a script fallback) up to `maxRows`. */
		autoGrow?: boolean;
		/** Tallest an auto-growing textarea gets before it scrolls. */
		maxRows?: number;
		/** Marks the textarea invalid (a surrounding Field with an error does too). */
		invalid?: boolean;
		/** Hide the character count that `maxlength` turns on. */
		hideCount?: boolean;
		/** Characters left at which screen readers start hearing the count; defaults to 10% of `maxlength` (at least 10). */
		announceAt?: number;
		/** Called with the new value on every edit. */
		onValueChange?: (value: string) => void;
		/** The `<textarea>` element. Bindable. */
		ref?: HTMLTextAreaElement | null;
		/** Classes for the wrapper (width, margins…). Attributes go on the `<textarea>`. */
		class?: string;
	}

	let {
		value = $bindable(''),
		autoGrow = false,
		maxRows = 12,
		invalid = false,
		hideCount = false,
		announceAt,
		onValueChange,
		ref = $bindable(null),
		rows = 3,
		maxlength,
		id,
		required,
		disabled,
		'aria-describedby': describedBy,
		class: className = '',
		...rest
	}: Props = $props();

	const uid = $props.id();
	const field = getFieldContext();
	// A form reset restores the text the textarea started with (or your own `defaultValue`).
	const initialValue = untrack(() => value);
	const max = $derived(typeof maxlength === 'number' && maxlength > 0 && !hideCount ? maxlength : undefined);
	const countId = `${uid}-count`;
	const control = $derived(
		fieldControlAttrs(field, {
			id,
			describedBy: joinIds(describedBy, max === undefined ? undefined : countId),
			invalid,
			required: Boolean(required),
			disabled: Boolean(disabled)
		})
	);
	const length = $derived((value ?? '').length);
	const threshold = $derived(max === undefined ? 0 : (announceAt ?? nearLimitThreshold(max)));

	// The polite announcement waits for a pause in typing and only speaks near the limit.
	let spoken = $state('');
	let edited = false;
	$effect(() => {
		const message = max === undefined ? '' : counterMessage(length, max, threshold);
		if (!edited) return;
		const timer = setTimeout(() => (spoken = message), 700);
		return () => clearTimeout(timer);
	});

	// Fallback for browsers without `field-sizing`: size to the content on every edit.
	const sizesItself = typeof CSS !== 'undefined' && CSS.supports?.('field-sizing', 'content');
	function fit(el: HTMLTextAreaElement): void {
		if (!autoGrow || sizesItself) return;
		el.style.height = 'auto';
		el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
	}
	$effect(() => {
		void value;
		if (ref) fit(ref);
	});
</script>

<div class={cn('flex w-full min-w-0 flex-col gap-1', className)}>
	<textarea {...rest}
		{...control}
		bind:this={ref}
		bind:value
		defaultValue={rest.defaultValue ?? initialValue}
		{rows}
		{maxlength}
		oninput={(event) => {
			edited = true;
			onValueChange?.(event.currentTarget.value);
			rest.oninput?.(event);
		}}
		style:--ak-textarea-max={`${maxRows}lh`}
		class={cn(
			INPUT_CLASS,
			'h-auto min-h-16 resize-y py-2 leading-5 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-status-danger/70',
			autoGrow && 'max-h-(--ak-textarea-max) resize-none [field-sizing:content]'
		)}
	></textarea>
	{#if max !== undefined}
		<p id={countId} class="self-end text-[11px] tabular-nums text-fg-light data-near:font-medium data-near:text-fg-main data-full:text-status-danger" data-near={length >= max - threshold ? '' : undefined} data-full={length >= max ? '' : undefined}>
			<span aria-hidden="true">{length}/{max}</span><span class="sr-only">{length} of {max} characters used</span>
		</p>
		<p aria-live="polite" class="sr-only">{spoken}</p>
	{/if}
</div>
