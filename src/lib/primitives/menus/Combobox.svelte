<script lang="ts">
	import { flushSync, untrack } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { Check, LoaderCircle, X } from '@lucide/svelte';
	import { Combobox as HeadlessCombobox } from '../../headless/patterns/listbox.svelte';
	import type { ChangeReason } from '../../headless/runtime/parts';
	import { cn } from '../../ui/cn';
	import { INPUT_CLASS } from '../../ui/styles';
	import { fieldControlAttrs, getFieldContext } from '../form/field';
	import { toPlacement, type OverlayPlacement } from '../placement';
	import { GROUP_LABEL, PICKER_INVALID, PICKER_LABEL, PICKER_LIST, PICKER_OPTION, PICKER_SIZES } from './classes';
	import { groupBy, matchesQuery } from './helpers';
	import type { PickerOption, PickerSize } from './types';

	export interface Props extends Omit<HTMLInputAttributes, 'class' | 'children' | 'value' | 'defaultValue' | 'size' | 'type' | 'name' | 'form' | 'list'> {
		/** Visible label. Optional inside a `Field`, which names the input instead; standalone use without it takes `aria-label`. */
		label?: string;
		options: PickerOption[];
		/** Bindable. The chosen option's value, or (with `allowCustom`) the text typed. */
		value?: string | null;
		/** Starting value when `value` is not bound; a form reset restores it. */
		defaultValue?: string | null;
		onValueChange?: (value: string | null) => void;
		/** Bindable. The text in the input; load async options from it. */
		query?: string;
		onQueryChange?: (query: string) => void;
		/**
		 * Which options the text matches. Default: every word appears in the label,
		 * description or group, ignoring case. `false` shows `options` as given (filtered
		 * by you, e.g. on a server).
		 */
		filter?: ((option: PickerOption, query: string) => boolean) | false;
		/** Bindable. */
		open?: boolean;
		defaultOpen?: boolean;
		onOpenChange?: (open: boolean, reason: ChangeReason) => void;
		/** Shown under the input when nothing matches. */
		emptyText?: string;
		/** Options are being fetched: the list is marked busy and a spinner shows. */
		loading?: boolean;
		loadingText?: string;
		/** A button that clears the text and the value. Default true. */
		clearable?: boolean;
		/** Accessible name of the clear button. */
		clearLabel?: string;
		/**
		 * Accept text that matches no option: Enter or leaving the field commits it as the
		 * value. Without it, leaving the field puts back the chosen option's label.
		 */
		allowCustom?: boolean;
		/** Form field name: a hidden input holds the value. */
		name?: string;
		/** Blocks form submission until a value is chosen (text alone does not count); focus goes to the input. */
		required?: boolean;
		/** The browser's message when `required` blocks a submit. */
		requiredMessage?: string;
		disabled?: boolean;
		/** Marks the input invalid (a surrounding Field with an error does too). */
		invalid?: boolean;
		/** Default `md`. */
		size?: PickerSize;
		/** Keep the label for screen readers only. */
		hideLabel?: boolean;
		/** `'bottom-start'` (default), `'top-start'`, … or a full placement. The list always matches the input's width. */
		placement?: OverlayPlacement;
		/** The `<input>`. Bindable. */
		ref?: HTMLInputElement | null;
		/** Classes for the outer box (label, input and list). */
		class?: string;
	}

	let {
		label,
		options,
		value = $bindable(),
		defaultValue = null,
		onValueChange,
		query = $bindable(),
		onQueryChange,
		filter,
		open = $bindable(),
		defaultOpen = false,
		onOpenChange,
		emptyText = 'No matches',
		loading = false,
		loadingText = 'Loading…',
		clearable = true,
		clearLabel = 'Clear',
		allowCustom = false,
		name,
		required = false,
		requiredMessage = allowCustom ? 'Fill in this field.' : 'Choose an option from the list.',
		disabled = false,
		invalid = false,
		size = 'md',
		hideLabel = false,
		placement,
		ref = $bindable(null),
		id,
		'aria-describedby': describedBy,
		'aria-labelledby': labelledByProp,
		class: className = '',
		...rest
	}: Props = $props();

	if (untrack(() => value) === undefined) value = untrack(() => defaultValue);
	if (untrack(() => open) === undefined) open = untrack(() => defaultOpen);

	/** The text that stands for a value: its option's label, or custom text as typed. */
	function labelOf(v: string | null | undefined): string {
		if (v === null || v === undefined) return '';
		return options.find((o) => o.value === v)?.label ?? (allowCustom ? v : '');
	}

	// Start with the chosen option's label in the input unless the caller gave text.
	if (untrack(() => query) === undefined) query = untrack(() => labelOf(value));
	const text = (): string => query ?? '';
	const current = (): string | null => value ?? null;

	function setQuery(next: string): void {
		if (next === text()) return;
		query = next;
		onQueryChange?.(next);
	}

	const field = getFieldContext();
	const inField = field !== undefined && !field.group;
	// Inside a Field its label names the input; otherwise our own label, or the caller's aria-label(ledby).
	const labelledBy = untrack(() => (inField ? field.labelId : label !== undefined ? undefined : (labelledByProp ?? false)));

	const uid = $props.id();
	const box = new HeadlessCombobox({
		id: uid,
		name: untrack(() => name),
		labelledBy,
		value: current,
		onValueChange: (next) => {
			value = next;
			setQuery(labelOf(next));
			onValueChange?.(next);
		},
		open: () => open ?? false,
		onOpenChange: (next, reason) => {
			open = next;
			onOpenChange?.(next, reason);
		},
		// Free text: nothing is highlighted until the person arrows down, so Enter keeps the text.
		autoHighlight: () => !allowCustom,
		placement: () => toPlacement(placement, { side: 'bottom', align: 'start', offset: 4 })
	});

	const shown = $derived.by(() => {
		const q = text();
		if (filter === false || q === labelOf(value)) return options;
		return options.filter((o) => (filter ? filter(o, q) : matchesQuery([o.label, o.description, o.group], q)));
	});
	const sections = $derived(groupBy(shown));
	const status = $derived(!open ? '' : loading ? loadingText : shown.length === 0 ? emptyText : '');

	/** Set when a submit was blocked for want of a value; choosing one clears the invalid look. */
	let blocked = $state(false);
	const control = $derived(
		fieldControlAttrs(field, { id, describedBy, invalid: invalid || (blocked && current() === null), required, disabled })
	);
	const inputId = $derived(control.id ?? `${uid}-input`);
	const listName = $derived(labelledBy === false ? rest['aria-label'] : undefined);

	// `required` means a committed value, not just text: typed text that matches nothing must not submit.
	$effect(() => {
		ref?.setCustomValidity(control.required && current() === null ? requiredMessage : '');
	});

	// A value set from outside (or options that arrive later) shows its label, unless the
	// person is typing.
	$effect(() => {
		const next = labelOf(value);
		untrack(() => {
			if (document.activeElement !== ref) setQuery(next);
		});
	});

	/** Free text: the typed text becomes the value (an option whose label it matches, else the text). */
	function commitText(): void {
		const typed = text().trim();
		const match = options.find((o) => o.label.toLowerCase() === typed.toLowerCase());
		const next = typed === '' ? null : match ? match.value : typed;
		if (next !== current()) box.value = next;
		else setQuery(labelOf(next));
	}

	function onkeydown(event: KeyboardEvent & { currentTarget: HTMLInputElement }): void {
		rest.onkeydown?.(event);
		// The headless layer already handled Enter on a highlighted option (default prevented).
		if (!allowCustom || event.key !== 'Enter' || event.defaultPrevented || event.isComposing) return;
		commitText();
		box.open = false;
		// Let a surrounding form submit (and validate) the committed value.
		flushSync();
	}

	function onfocusout(event: FocusEvent & { currentTarget: HTMLInputElement }): void {
		rest.onfocusout?.(event);
		if (allowCustom) commitText();
		else setQuery(labelOf(value));
	}

	function oninput(event: Event & { currentTarget: HTMLInputElement }): void {
		rest.oninput?.(event);
		onQueryChange?.(text());
	}

	function oninvalid(event: Event & { currentTarget: HTMLInputElement }): void {
		rest.oninvalid?.(event);
		blocked = true;
	}

	function clear(): void {
		setQuery('');
		if (current() !== null) box.value = null;
		ref?.focus();
	}
</script>

<div class={cn('grid min-w-0 gap-1.5', className)}>
	{#if label !== undefined && !inField}
		<label {...box.label} for={inputId} class={cn(PICKER_LABEL, hideLabel && 'sr-only')}>{label}</label>
	{/if}
	<div class="relative min-w-0">
		<input {...rest}
			{...box.input}
			{...control}
			bind:this={ref}
			bind:value={() => text(), (next) => (query = next)}
			{oninput}
			{onkeydown}
			{onfocusout}
			{oninvalid}
			class={cn(
				INPUT_CLASS,
				PICKER_SIZES[size],
				PICKER_INVALID,
				'h-auto disabled:cursor-not-allowed disabled:opacity-50',
				(clearable || loading) && 'pr-9'
			)}
		/>
		<span class="absolute inset-y-0 right-1 flex items-center gap-0.5">
			{#if loading}
				<LoaderCircle aria-hidden="true" class="size-4 animate-spin text-fg-light motion-reduce:animate-none" />
			{/if}
			{#if clearable && text() !== '' && !control.disabled}
				<button
					type="button"
					tabindex="-1"
					aria-label={clearLabel}
					onmousedown={(event) => event.preventDefault()}
					onclick={clear}
					class="inline-flex size-6 items-center justify-center rounded-full text-fg-light hover:bg-chat-user hover:text-fg-main"
				>
					<X aria-hidden="true" class="size-3.5" />
				</button>
			{/if}
		</span>
		<!-- Outside the listbox, which may only own options and groups. -->
		<p
			role="status"
			class={status && shown.length === 0
				? 'pointer-events-none absolute inset-x-0 top-full z-10 mt-1 flex items-center gap-2 rounded-card border border-card-border bg-card-bg px-3 py-2 text-[13px] text-fg-light ak-shadow-soft'
				: 'sr-only'}
		>
			{status}
		</p>
	</div>
	<div {...box.list} aria-label={listName} aria-busy={loading} class={cn(PICKER_LIST, shown.length === 0 && 'invisible')}>
		{#each sections as section (section.name)}
			{#if section.name === null}
				{#each section.items as option (option.value)}{@render row(option)}{/each}
			{:else}
				{@const group = box.group(section.name)}
				<div {...group.root}>
					<div {...group.label} class={GROUP_LABEL}>{section.name}</div>
					{#each section.items as option (option.value)}{@render row(option)}{/each}
				</div>
			{/if}
		{/each}
	</div>
	{#if !control.disabled}
		{#each box.formInputs as hidden (hidden.value)}<input {...hidden} />{/each}
	{/if}
</div>

{#snippet row(option: PickerOption)}
	<div {...box.option({ value: option.value, disabled: option.disabled, textValue: option.label })} class={PICKER_OPTION}>
		<span class="min-w-0 flex-1">
			<span class="block truncate">{option.label}</span>
			{#if option.description}<span class="block text-xs text-fg-light">{option.description}</span>{/if}
		</span>
		<Check aria-hidden="true" class="size-4 text-accent-primary invisible group-data-selected:visible" />
	</div>
{/snippet}
