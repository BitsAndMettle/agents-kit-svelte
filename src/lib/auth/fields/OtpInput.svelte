<script lang="ts">
	import { tick, untrack } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { fieldControlAttrs, getFieldContext, type FormControlSize } from '../../primitives/form';
	import { activeCells, caretForClick, normalizeCode, startsGroup } from './otp';

	export interface Props extends Omit<HTMLInputAttributes, 'class' | 'children' | 'size' | 'value' | 'defaultValue' | 'type' | 'maxlength' | 'minlength' | 'pattern' | 'inputmode'> {
		/** The code as typed. Bindable. */
		value?: string;
		/** Starting value when `value` is not given, and what a form reset restores. */
		defaultValue?: string;
		/** The accessible name when no `Field` (and no `aria-label` or `aria-labelledby`) names the input. */
		codeLabel?: string;
		/** Number of characters, and of cells drawn. */
		length?: number;
		/** Cells per visual group, for a wider gap in the middle (3 gives 3 + 3). 0 means no groups. */
		groupSize?: number;
		/** Accept letters as well as digits. */
		alphanumeric?: boolean;
		/** Field name in the form post. */
		name?: string;
		size?: FormControlSize;
		/** Marks the input invalid (a surrounding Field with an error does too). */
		invalid?: boolean;
		/** Called with the new code on every edit. */
		onValueChange?: (value: string) => void;
		/** Called once when typing, pasting or autofill fills every cell. */
		onComplete?: (code: string) => void;
		/** Submits the owning form (with `requestSubmit`, so validation and submit handlers run) as soon as the code is complete. */
		autoSubmit?: boolean;
		/** The one real `<input>`. Bindable. */
		ref?: HTMLInputElement | null;
		class?: string;
	}

	let {
		defaultValue,
		value = $bindable(defaultValue ?? ''),
		length = 6,
		groupSize = 0,
		alphanumeric = false,
		name = 'code',
		codeLabel = 'One-time code',
		size = 'md',
		invalid = false,
		onValueChange,
		onComplete,
		autoSubmit = false,
		ref = $bindable(null),
		id,
		required,
		disabled,
		autocomplete = 'one-time-code',
		'aria-describedby': describedBy,
		class: className = '',
		...rest
	}: Props = $props();

	const field = getFieldContext();
	const control = $derived(fieldControlAttrs(field, { id, describedBy, invalid, required: Boolean(required), disabled: Boolean(disabled) }));

	let focused = $state(false);
	let start = $state(0);
	let end = $state(0);
	/** Whether the code was full at the last edit, so completion fires once per fill and never on mount. */
	let wasFull = false;

	// Whatever comes in (value, defaultValue, a bound parent) is cleaned the same way typed text is.
	const initialValue = untrack(() => normalizeCode(value, length, alphanumeric));
	const clean = $derived(normalizeCode(value, length, alphanumeric));
	const cleanDefault = $derived(defaultValue === undefined ? undefined : normalizeCode(defaultValue, length, alphanumeric));
	$effect.pre(() => {
		if (clean !== value) value = clean;
		wasFull = length > 0 && clean.length >= length;
	});

	const chars = $derived(Array.from({ length }, (_, i) => clean[i] ?? ''));
	const active = $derived(focused && !control.disabled ? activeCells(start, end, length) : Array<boolean>(length).fill(false));
	const pattern = $derived(`[${alphanumeric ? '0-9A-Za-z' : '0-9'}]{${length}}`);

	/** A group Field has no `for` label to name the input, so it needs its own name like a standalone one. */
	const needsName = $derived(!field || field.group);

	const CELLS: Record<FormControlSize, string> = {
		sm: 'h-9 w-8 text-base',
		md: 'h-11 w-10 text-lg',
		lg: 'h-12 w-11 text-xl'
	};

	function readSelection(): void {
		if (!ref) return;
		start = ref.selectionStart ?? ref.value.length;
		end = ref.selectionEnd ?? start;
	}

	/** Reads the selection after the browser has moved the caret for a key press. */
	function readSelectionSoon(): void {
		requestAnimationFrame(readSelection);
	}

	function setCaret(position: number): void {
		if (!ref) return;
		ref.setSelectionRange(position, position);
		readSelection();
	}

	/** Puts a cleaned code in the input and tells the caller. */
	function commit(next: string, caret?: number): void {
		const changed = next !== value;
		if (ref && ref.value !== next) ref.value = next;
		value = next;
		if (caret !== undefined) setCaret(caret);
		else readSelection();
		if (changed) onValueChange?.(next);
		const full = length > 0 && next.length >= length;
		const justFilled = full && !wasFull;
		wasFull = full;
		if (!justFilled) return;
		onComplete?.(next);
		if (autoSubmit) {
			const form = ref?.form;
			if (form) void tick().then(() => form.requestSubmit());
		}
	}

	/** Cleans what the input holds now. Not while an IME composition is open: rewriting would break it. */
	function handleInput(event: Event & { currentTarget: HTMLInputElement }): void {
		if ((event as unknown as InputEvent).isComposing) {
			(rest.oninput as ((e: Event) => void) | undefined)?.(event);
			return;
		}
		const input = event.currentTarget;
		const raw = input.value;
		const caret = input.selectionStart ?? raw.length;
		const clean = normalizeCode(raw, length, alphanumeric);
		commit(clean, normalizeCode(raw.slice(0, caret), length, alphanumeric).length);
		(rest.oninput as ((e: Event) => void) | undefined)?.(event);
	}

	function handleCompositionEnd(event: CompositionEvent & { currentTarget: HTMLInputElement }): void {
		(rest.oncompositionend as ((e: CompositionEvent) => void) | undefined)?.(event);
		const input = event.currentTarget;
		const raw = input.value;
		const caret = input.selectionStart ?? raw.length;
		if (normalizeCode(raw, length, alphanumeric) === raw) return;
		commit(normalizeCode(raw, length, alphanumeric), normalizeCode(raw.slice(0, caret), length, alphanumeric).length);
	}

	/** The browser would cut a pasted "123 456" at the length before we could clean it, so we place the text ourselves. */
	function handlePaste(event: ClipboardEvent & { currentTarget: HTMLInputElement }): void {
		(rest.onpaste as ((e: ClipboardEvent) => void) | undefined)?.(event);
		if (event.defaultPrevented) return;
		const text = event.clipboardData?.getData('text');
		if (text === undefined || text === '') return;
		event.preventDefault();
		const input = event.currentTarget;
		const from = input.selectionStart ?? input.value.length;
		const to = input.selectionEnd ?? from;
		const pasted = normalizeCode(text, length, alphanumeric);
		const next = normalizeCode(input.value.slice(0, from) + pasted + input.value.slice(to), length, alphanumeric);
		commit(next, Math.min(from + pasted.length, next.length));
		// We placed the text ourselves, so no native input event came: tell the form (it clears a field error on input).
		input.dispatchEvent(new Event('input', { bubbles: true }));
	}

	/** A click goes to the clicked cell (never past the end of the text), as the cells are what the person sees. */
	function handleMouseDown(event: MouseEvent & { currentTarget: HTMLInputElement }): void {
		(rest.onmousedown as ((e: MouseEvent) => void) | undefined)?.(event);
		if (event.defaultPrevented || event.button !== 0 || control.disabled) return;
		const input = event.currentTarget;
		const box = input.getBoundingClientRect();
		event.preventDefault();
		input.focus();
		setCaret(caretForClick(event.clientX - box.left, box.width, length, input.value.length));
	}

	// A form reset restores the starting value, but the native reset gives us no event on the input.
	$effect(() => {
		const form = ref?.form;
		if (!form) return;
		const onReset = () =>
			setTimeout(() => {
				if (!ref) return;
				value = normalizeCode(ref.value, length, alphanumeric);
				wasFull = length > 0 && value.length >= length;
				readSelection();
			});
		form.addEventListener('reset', onReset);
		return () => form.removeEventListener('reset', onReset);
	});
</script>

<div
	data-invalid={control['aria-invalid'] ? '' : undefined}
	data-disabled={control.disabled ? '' : undefined}
	class={cn('relative inline-flex max-w-full data-disabled:cursor-not-allowed data-disabled:opacity-50', className)}
>
	<div aria-hidden="true" class="pointer-events-none flex min-w-0 max-w-full">
		{#each chars as char, i (i)}
			<span
				data-otp-cell
				data-active={active[i] ? '' : undefined}
				data-filled={char ? '' : undefined}
				class={cn(
					'relative flex min-w-0 shrink items-center justify-center rounded-control border border-card-border bg-card-bg font-medium tabular-nums text-fg-main transition-[border-color,box-shadow]',
					CELLS[size],
					i > 0 && (startsGroup(i, groupSize) ? 'ml-4' : 'ml-1.5'),
					'data-active:border-accent-primary/60 data-active:ring-[3px] data-active:ring-accent-primary/20',
					control['aria-invalid'] && 'border-status-danger/70'
				)}
			>
				{char}
				{#if active[i] && !char && start === end}
					<span class="h-5 w-px animate-pulse bg-fg-main motion-reduce:animate-none"></span>
				{/if}
			</span>
		{/each}
	</div>
	<input {...rest}
		{...control}
		bind:this={ref}
		value={clean}
		defaultValue={cleanDefault ?? initialValue}
		{name}
		{autocomplete}
		aria-label={rest['aria-label'] ?? (needsName && rest['aria-labelledby'] === undefined ? codeLabel : undefined)}
		type="text"
		inputmode={alphanumeric ? 'text' : 'numeric'}
		{pattern}
		autocapitalize="off"
		autocorrect="off"
		spellcheck="false"
		oninput={handleInput}
		oncompositionend={handleCompositionEnd}
		onpaste={handlePaste}
		onmousedown={handleMouseDown}
		onkeydown={(event) => {
			readSelectionSoon();
			rest.onkeydown?.(event);
		}}
		onkeyup={(event) => {
			readSelection();
			rest.onkeyup?.(event);
		}}
		onselect={(event) => {
			readSelection();
			rest.onselect?.(event);
		}}
		onfocus={(event) => {
			focused = true;
			readSelection();
			rest.onfocus?.(event);
		}}
		onblur={(event) => {
			focused = false;
			rest.onblur?.(event);
		}}
		class="absolute inset-0 size-full cursor-text bg-transparent p-0 text-transparent caret-transparent opacity-100 selection:bg-transparent selection:text-transparent focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed"
	/>
</div>
