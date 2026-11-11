<script lang="ts" generics="Multiple extends boolean = false">
	import { untrack } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Check, ChevronDown } from '@lucide/svelte';
	import { Select } from '../../headless/patterns/listbox.svelte';
	import type { Placement } from '../../headless/logic/placement';
	import type { ChangeReason } from '../../headless/runtime/parts';
	import { cn } from '../../ui/cn';
	import { badgeClass, INPUT_CLASS } from '../../ui/styles';
	import { GROUP_LABEL, PICKER_LABEL, PICKER_LIST, PICKER_OPTION } from './classes';
	import { groupBy } from './helpers';
	import type { PickerOption, PickerValue } from './types';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		/** Visible label; names the control. */
		label: string;
		options: PickerOption[];
		/** Several values, toggled one by one; the list stays open while choosing. */
		multiple?: Multiple;
		/** Bindable. A value, or a list of values with `multiple`. */
		value?: PickerValue<Multiple>;
		onValueChange?: (value: PickerValue<Multiple>) => void;
		/** Bindable. */
		open?: boolean;
		onOpenChange?: (open: boolean, reason: ChangeReason) => void;
		/** Shown while nothing is chosen. */
		placeholder?: string;
		/** With `multiple`: chips for each choice, or "3 selected". Default `chips`. */
		display?: 'chips' | 'count';
		/** Form field name: one hidden input per chosen value; form reset restores the first value. */
		name?: string;
		/** Blocks form submission while nothing is chosen. */
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
		multiple,
		value = $bindable(),
		onValueChange,
		open = $bindable(false),
		onOpenChange,
		placeholder = 'Choose…',
		display = 'chips',
		name,
		required = false,
		disabled = false,
		hideLabel = false,
		placement,
		class: className = '',
		...rest
	}: Props = $props();

	type AnyValue = string[] | string | null;
	const many = (): boolean => multiple === true;
	const current = (): AnyValue => value ?? (many() ? [] : null);

	const id = $props.id();
	const select = new Select<boolean>({
		id,
		multiple: untrack(() => many()),
		name: untrack(() => name),
		value: current,
		onValueChange: (next) => {
			value = next as PickerValue<Multiple>;
			onValueChange?.(next as PickerValue<Multiple>);
		},
		open: () => open,
		onOpenChange: (next, reason) => {
			open = next;
			onOpenChange?.(next, reason);
		},
		placement: () => placement ?? {}
	});

	const chosen = $derived.by(() => {
		const v = current();
		const values = Array.isArray(v) ? v : v === null ? [] : [v];
		return values.map((x) => options.find((o) => o.value === x) ?? { value: x, label: x });
	});
	const sections = $derived(groupBy(options));
</script>

<div {...rest} class={cn('grid min-w-0 gap-1.5', className)}>
	<span {...select.label} class={cn(PICKER_LABEL, hideLabel && 'sr-only')}>{label}</span>
	<div class="relative min-w-0">
		<button
			{...select.trigger}
			{disabled}
			class={cn(
				INPUT_CLASS,
				'flex h-auto min-h-8 items-center gap-2 py-1 text-left disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:border-accent-primary/50'
			)}
		>
			<span class="flex min-w-0 flex-1 flex-wrap items-center gap-1">
				{#if chosen.length === 0}
					<span class="truncate text-fg-light">{placeholder}</span>
				{:else if !many()}
					<span class="truncate">{chosen[0].label}</span>
				{:else if display === 'count'}
					<span class="truncate">{chosen.length === 1 ? chosen[0].label : `${chosen.length} selected`}</span>
				{:else}
					{#each chosen as option (option.value)}
						<span class={badgeClass('neutral', 'max-w-full truncate')}>{option.label}</span>
					{/each}
				{/if}
			</span>
			<ChevronDown aria-hidden="true" class="size-4 shrink-0 text-fg-light" />
		</button>
		{#if required}
			<!-- Validation only: posts nothing; sits under the trigger so the browser's message points at it. -->
			<input
				tabindex="-1"
				aria-hidden="true"
				required
				{disabled}
				value={chosen.length > 0 ? 'chosen' : ''}
				class="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
			/>
		{/if}
	</div>
	<div {...select.list} class={PICKER_LIST}>
		{#each sections as section (section.name)}
			{#if section.name === null}
				{#each section.items as option (option.value)}{@render row(option)}{/each}
			{:else}
				{@const group = select.group(section.name)}
				<div {...group.root}>
					<div {...group.label} class={GROUP_LABEL}>{section.name}</div>
					{#each section.items as option (option.value)}{@render row(option)}{/each}
				</div>
			{/if}
		{/each}
	</div>
	{#if !disabled}
		{#each select.formInputs as input (input.value)}<input {...input} />{/each}
	{/if}
</div>

{#snippet row(option: PickerOption)}
	<div {...select.option({ value: option.value, disabled: option.disabled, textValue: option.label })} class={PICKER_OPTION}>
		<span class="min-w-0 flex-1">
			<span class="block truncate">{option.label}</span>
			{#if option.description}<span class="block text-xs text-fg-light">{option.description}</span>{/if}
		</span>
		<Check aria-hidden="true" class="size-4 text-accent-primary invisible group-data-selected:visible" />
	</div>
{/snippet}
