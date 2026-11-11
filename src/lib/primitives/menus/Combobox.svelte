<script lang="ts">
	import { flushSync, untrack } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Check, LoaderCircle, X } from '@lucide/svelte';
	import { Combobox } from '../../headless/patterns/listbox.svelte';
	import type { Placement } from '../../headless/logic/placement';
	import type { ChangeReason } from '../../headless/runtime/parts';
	import { cn } from '../../ui/cn';
	import { INPUT_CLASS } from '../../ui/styles';
	import { GROUP_LABEL, PICKER_LABEL, PICKER_LIST, PICKER_OPTION } from './classes';
	import { groupBy, matchesQuery } from './helpers';
	import type { PickerOption } from './types';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		/** Visible label; names the input. */
		label: string;
		options: PickerOption[];
		/** Bindable. The chosen option's value, or (with `allowCustom`) the text typed. */
		value?: string | null;
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
		onOpenChange?: (open: boolean, reason: ChangeReason) => void;
		placeholder?: string;
		/** Shown under the input when nothing matches. */
		emptyText?: string;
		/** Options are being fetched: the list is marked busy and a spinner shows. */
		loading?: boolean;
		loadingText?: string;
		/** A button that clears the text and the value. Default true. */
		clearable?: boolean;
		/**
		 * Accept text that matches no option: Enter or leaving the field commits it as the
		 * value. Without it, leaving the field puts back the chosen option's label.
		 */
		allowCustom?: boolean;
		/** Form field name: a hidden input holds the value; form reset restores the first value. */
		name?: string;
		required?: boolean;
		disabled?: boolean;
		/** Keep the label for screen readers only. */
		hideLabel?: boolean;
		/** Merged over `{ side: 'bottom', align: 'start', matchWidth: true }`. */
		placement?: Placement;
		class?: string;
	}

	let {
		label,
		options,
		value = $bindable(null),
		onValueChange,
		query = $bindable(),
		onQueryChange,
		filter,
		open = $bindable(false),
		onOpenChange,
		placeholder,
		emptyText = 'No matches',
		loading = false,
		loadingText = 'Loading…',
		clearable = true,
		allowCustom = false,
		name,
		required = false,
		disabled = false,
		hideLabel = false,
		placement,
		class: className = '',
		...rest
	}: Props = $props();

	/** The text that stands for a value: its option's label, or custom text as typed. */
	function labelOf(v: string | null): string {
		if (v === null) return '';
		return options.find((o) => o.value === v)?.label ?? (allowCustom ? v : '');
	}

	// Start with the chosen option's label in the input unless the caller gave text.
	if (untrack(() => query) === undefined) query = untrack(() => labelOf(value));
	const text = (): string => query ?? '';

	function setQuery(next: string): void {
		if (next === text()) return;
		query = next;
		onQueryChange?.(next);
	}

	const id = $props.id();
	const box = new Combobox({
		id,
		name: untrack(() => name),
		value: () => value,
		onValueChange: (next) => {
			value = next;
			setQuery(labelOf(next));
			onValueChange?.(next);
		},
		open: () => open,
		onOpenChange: (next, reason) => {
			open = next;
			onOpenChange?.(next, reason);
		},
		// Free text: nothing is highlighted until the person arrows down, so Enter keeps the text.
		autoHighlight: () => !allowCustom,
		placement: () => placement ?? {}
	});

	const shown = $derived.by(() => {
		const q = text();
		if (filter === false || q === labelOf(value)) return options;
		return options.filter((o) => (filter ? filter(o, q) : matchesQuery([o.label, o.description, o.group], q)));
	});
	const sections = $derived(groupBy(shown));
	const status = $derived(!open ? '' : loading ? loadingText : shown.length === 0 ? emptyText : '');

	let input = $state<HTMLInputElement>();

	// A value set from outside (or options that arrive later) shows its label, unless the
	// person is typing.
	$effect(() => {
		const next = labelOf(value);
		untrack(() => {
			if (document.activeElement !== input) setQuery(next);
		});
	});

	/** Free text: the typed text becomes the value (an option whose label it matches, else the text). */
	function commitText(): void {
		const typed = text().trim();
		const match = options.find((o) => o.label.toLowerCase() === typed.toLowerCase());
		const next = typed === '' ? null : match ? match.value : typed;
		if (next !== value) box.value = next;
		else setQuery(labelOf(next));
	}

	function onkeydown(event: KeyboardEvent): void {
		// The headless layer already handled Enter on a highlighted option (default prevented).
		if (!allowCustom || event.key !== 'Enter' || event.defaultPrevented || event.isComposing) return;
		commitText();
		box.open = false;
		// Let a surrounding form submit the committed value.
		flushSync();
	}

	function onfocusout(): void {
		if (allowCustom) commitText();
		else setQuery(labelOf(value));
	}

	function clear(): void {
		setQuery('');
		if (value !== null) box.value = null;
		input?.focus();
	}
</script>

<div {...rest} class={cn('grid min-w-0 gap-1.5', className)}>
	<label {...box.label} class={cn(PICKER_LABEL, hideLabel && 'sr-only')}>{label}</label>
	<div class="relative min-w-0">
		<input
			{...box.input}
			bind:this={input}
			bind:value={() => text(), (next) => (query = next)}
			oninput={() => onQueryChange?.(text())}
			{onkeydown}
			{onfocusout}
			{placeholder}
			{required}
			{disabled}
			class={cn(INPUT_CLASS, 'disabled:cursor-not-allowed disabled:opacity-50', (clearable || loading) && 'pr-9')}
		/>
		<span class="absolute inset-y-0 right-1 flex items-center gap-0.5">
			{#if loading}
				<LoaderCircle aria-hidden="true" class="size-4 animate-spin text-fg-light motion-reduce:animate-none" />
			{/if}
			{#if clearable && text() !== '' && !disabled}
				<button
					type="button"
					tabindex="-1"
					aria-label="Clear {label}"
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
				? 'absolute inset-x-0 top-full z-10 mt-1 flex items-center gap-2 rounded-card border border-card-border bg-card-bg px-3 py-2 text-[13px] text-fg-light ak-shadow-soft'
				: 'sr-only'}
		>
			{status}
		</p>
	</div>
	<div {...box.list} aria-busy={loading} class={cn(PICKER_LIST, shown.length === 0 && 'invisible')}>
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
	{#if !disabled}
		{#each box.formInputs as field (field.value)}<input {...field} />{/each}
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
