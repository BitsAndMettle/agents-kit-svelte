<script lang="ts">
	import { tick, untrack } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { fieldControlAttrs, getFieldContext, type FormControlSize } from '../../primitives/form';
	import { activeCells, applyEdit, caretForClick, normalizeCode, startsGroup } from './otp';

	export interface Props extends Omit<HTMLInputAttributes, 'class' | 'children' | 'size' | 'value' | 'defaultValue' | 'type' | 'maxlength' | 'minlength' | 'pattern' | 'inputmode'> {
		/** The code as typed. Bindable. */
		value?: string;
		/** Starting value when `value` is not given, and what a form reset restores. */
		defaultValue?: string;
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
	/** True while an IME composition is open: the input then holds raw composed text we must not rewrite. */
	let composing = $state(false);
	/** The cleaned composed text, drawn in the cells while composing so typed characters are visible. */
	let composed = $state('');
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

	const shown = $derived(composing ? composed : clean);
	const chars = $derived(Array.from({ length }, (_, i) => shown[i] ?? ''));
	const active = $derived(focused && !control.disabled ? activeCells(start, end, length) : Array<boolean>(length).fill(false));
	const pattern = $derived(`[${alphanumeric ? '0-9A-Za-z' : '0-9'}]{${length}}`);

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

	/** Insert types the browser lets us cancel and place ourselves. Deletions stay native. */
	const INSERT_TYPES = new Set(['insertText', 'insertFromPaste', 'insertFromDrop', 'insertReplacementText', 'insertFromYank']);

	/** Tells the form about an edit we placed ourselves (no native input event came), so `AuthSubmit` and Field errors react. */
	function announceInput(input: HTMLInputElement, inputType: string, data: string): void {
		input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType, data }));
	}

	/** Places `text` at the current selection through `applyEdit`, the one edit rule. */
	function insert(input: HTMLInputElement, text: string, inputType: string): void {
		const prev = input.value;
		const from = input.selectionStart ?? prev.length;
		const to = input.selectionEnd ?? from;
		const { value: next, caret } = applyEdit(prev, from, to, text, length, alphanumeric);
		commit(next, caret);
		if (next !== prev) announceInput(input, inputType, text);
	}

	/** Every cancelable insert is placed by `applyEdit`, so a full code, a selection and separators all behave the same way. */
	function handleBeforeInput(event: InputEvent & { currentTarget: HTMLInputElement }): void {
		(rest.onbeforeinput as ((e: InputEvent) => void) | undefined)?.(event);
		if (event.defaultPrevented || !event.cancelable || composing || event.isComposing || !INSERT_TYPES.has(event.inputType)) return;
		const text = event.data ?? (event.dataTransfer ? event.dataTransfer.getData('text/plain') || event.dataTransfer.getData('text') : null);
		// No text to read (a drop of something else): let the browser insert it, and the input handler cleans it.
		if (!text) return;
		event.preventDefault();
		insert(event.currentTarget, text, event.inputType);
	}

	/**
	 * Deletions, and inserts the browser would not let us cancel (some autofill), land here: the text is
	 * cleaned and cut to length. While an IME composition is open the input is left alone (rewriting it
	 * would break the composition) and the cells draw the cleaned composed text instead.
	 */
	function handleInput(event: Event & { currentTarget: HTMLInputElement }): void {
		const input = event.currentTarget;
		const raw = input.value;
		if (composing || (event as unknown as InputEvent).isComposing) {
			composed = normalizeCode(raw, length, alphanumeric);
			readSelection();
		} else {
			const next = normalizeCode(raw, length, alphanumeric);
			const caret = normalizeCode(raw.slice(0, input.selectionStart ?? raw.length), length, alphanumeric).length;
			commit(next, Math.min(caret, next.length));
		}
		(rest.oninput as ((e: Event) => void) | undefined)?.(event);
	}

	function handleCompositionStart(event: CompositionEvent & { currentTarget: HTMLInputElement }): void {
		composed = clean;
		composing = true;
		(rest.oncompositionstart as ((e: CompositionEvent) => void) | undefined)?.(event);
	}

	/** Input events during the composition were not committed, so commit the cleaned text here always, even when it is already clean. */
	function handleCompositionEnd(event: CompositionEvent & { currentTarget: HTMLInputElement }): void {
		composing = false;
		const input = event.currentTarget;
		const raw = input.value;
		const next = normalizeCode(raw, length, alphanumeric);
		const caret = normalizeCode(raw.slice(0, input.selectionStart ?? raw.length), length, alphanumeric).length;
		commit(next, Math.min(caret, next.length));
		(rest.oncompositionend as ((e: CompositionEvent) => void) | undefined)?.(event);
	}

	/** A paste event lets us place the text before any browser cut; it goes through the same `applyEdit` as every insert. */
	function handlePaste(event: ClipboardEvent & { currentTarget: HTMLInputElement }): void {
		(rest.onpaste as ((e: ClipboardEvent) => void) | undefined)?.(event);
		if (event.defaultPrevented) return;
		const text = event.clipboardData?.getData('text/plain') || event.clipboardData?.getData('text');
		if (!text) return;
		event.preventDefault();
		insert(event.currentTarget, text, 'insertFromPaste');
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
		type="text"
		inputmode={alphanumeric ? 'text' : 'numeric'}
		{pattern}
		autocapitalize="off"
		autocorrect="off"
		spellcheck="false"
		onbeforeinput={handleBeforeInput}
		oninput={handleInput}
		oncompositionstart={handleCompositionStart}
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
