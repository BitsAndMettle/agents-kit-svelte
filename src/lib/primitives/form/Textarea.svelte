<script lang="ts">
	import { untrack } from 'svelte';
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { INPUT_CLASS } from '../../ui/styles';
	import { DANGER_TEXT, type FormControlSize } from './classes';
	import { fieldControlAttrs, getFieldContext, joinIds } from './field';
	import { counterMessage, formatCharacterCount, formatCharactersLeft, nearLimitThreshold, type CharacterCountFormatter } from './text-count';

	export interface Props extends Omit<HTMLTextareaAttributes, 'class' | 'children' | 'value' | 'defaultValue'> {
		/** The text. Bindable. */
		value?: string | null;
		/** Starting text when `value` is not given, and what a form reset restores (defaults to the starting text). */
		defaultValue?: string | null;
		size?: FormControlSize;
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
		/** Words for the count read with the description, e.g. "45 of 120 characters used". */
		formatCount?: CharacterCountFormatter;
		/** Words announced near the limit, e.g. "5 characters left" (receives `left: 0` at the limit). */
		formatRemaining?: CharacterCountFormatter;
		/** Called with the new value on every edit. */
		onValueChange?: (value: string) => void;
		/** The `<textarea>` element. Bindable. */
		ref?: HTMLTextAreaElement | null;
		/** Classes for the wrapper (width, margins…). Attributes go on the `<textarea>`. */
		class?: string;
	}

	let {
		defaultValue,
		value = $bindable(defaultValue ?? ''),
		size = 'md',
		autoGrow = false,
		maxRows = 12,
		invalid = false,
		hideCount = false,
		announceAt,
		formatCount = formatCharacterCount,
		formatRemaining = formatCharactersLeft,
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
	// A form reset restores `defaultValue`, or the text the textarea started with.
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
		const message = max === undefined ? '' : counterMessage(length, max, threshold, formatRemaining);
		if (!edited) return;
		const timer = setTimeout(() => (spoken = message), 700);
		return () => clearTimeout(timer);
	});

	const SIZES: Record<FormControlSize, string> = {
		sm: 'px-2.5 text-xs leading-4',
		md: 'px-3 text-[13px] leading-5',
		lg: 'px-3.5 text-sm leading-6'
	};

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
		defaultValue={defaultValue ?? initialValue}
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
			'h-auto min-h-16 resize-y py-2 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-status-danger/70',
			SIZES[size],
			autoGrow && 'max-h-(--ak-textarea-max) resize-none [field-sizing:content]'
		)}
	></textarea>
	{#if max !== undefined}
		<p id={countId} class={['self-end text-[11px] tabular-nums', length >= max ? `font-medium ${DANGER_TEXT}` : length >= max - threshold ? 'font-medium text-fg-main' : 'text-fg-light']}>
			<span aria-hidden="true">{length}/{max}</span><span class="sr-only">{formatCount({ length, max, left: Math.max(0, max - length) })}</span>
		</p>
		<p aria-live="polite" class="sr-only">{spoken}</p>
	{/if}
</div>
