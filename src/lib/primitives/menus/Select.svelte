<script lang="ts" generics="Multiple extends boolean = false">
	import { untrack } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { Check, ChevronDown } from '@lucide/svelte';
	import { Select } from '../../headless/patterns/listbox.svelte';
	import { cn } from '../../ui/cn';
	import { badgeClass, INPUT_CLASS } from '../../ui/styles';
	import { fieldControlAttrs, getFieldContext } from '../form/field';
	import { toPlacement } from '../placement';
	import { GROUP_LABEL, PICKER_INVALID, PICKER_LABEL, PICKER_LIST, PICKER_OPTION, PICKER_SIZES } from './classes';
	import { groupBy } from './helpers';
	import type { PickerOption, PickerValue, SelectProps } from './types';

	interface Props extends Omit<HTMLButtonAttributes, keyof SelectProps<Multiple>>, SelectProps<Multiple> {}

	let {
		label,
		options,
		multiple,
		value = $bindable(),
		defaultValue,
		onValueChange,
		open = $bindable(),
		defaultOpen = false,
		onOpenChange,
		placeholder = 'Choose…',
		display = 'chips',
		formatCount = (count: number) => `${count} selected`,
		name,
		required = false,
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

	type AnyValue = string[] | string | null;
	const many = (): boolean => multiple === true;
	// `defaultValue` seeds an unbound value; the headless pattern restores this start on form reset.
	if (untrack(() => value) === undefined) value = untrack(() => defaultValue ?? ((many() ? [] : null) as PickerValue<Multiple>));
	if (untrack(() => open) === undefined) open = untrack(() => defaultOpen);
	const current = (): AnyValue => value ?? (many() ? [] : null);

	const field = getFieldContext();
	const inField = field !== undefined && !field.group;
	// Inside a Field its label names the trigger; otherwise our own label, or the caller's aria-label(ledby).
	const labelledBy = untrack(() => (inField ? field.labelId : label !== undefined ? undefined : (labelledByProp ?? false)));

	const uid = $props.id();
	const select = new Select<boolean>({
		id: uid,
		multiple: untrack(() => many()),
		name: untrack(() => name),
		labelledBy,
		value: current,
		onValueChange: (next) => {
			value = next as PickerValue<Multiple>;
			onValueChange?.(next as PickerValue<Multiple>);
		},
		open: () => open ?? false,
		onOpenChange: (next, reason) => {
			open = next;
			onOpenChange?.(next, reason);
		},
		placement: () => toPlacement(placement, { side: 'bottom', align: 'start', offset: 4 })
	});

	const chosen = $derived.by(() => {
		const v = current();
		const values = Array.isArray(v) ? v : v === null ? [] : [v];
		return values.map((x) => options.find((o) => o.value === x) ?? { value: x, label: x });
	});
	const sections = $derived(groupBy(options));

	/** Set when a submit was blocked for want of a value; choosing one clears the invalid look. */
	let blocked = $state(false);
	const control = $derived(
		fieldControlAttrs(field, {
			id,
			describedBy,
			invalid: invalid || (blocked && chosen.length === 0),
			required,
			disabled
		})
	);
	// A button cannot be `required`; the validation proxy below enforces it.
	const triggerAttrs = $derived.by(() => {
		const { required: needed, ...attrs } = control;
		return { ...attrs, 'aria-required': needed ? ('true' as const) : undefined };
	});
	const listName = $derived(labelledBy === false ? rest['aria-label'] : undefined);
</script>

<div class={cn('grid min-w-0 gap-1.5', className)}>
	{#if label !== undefined && !inField}
		<span {...select.label} class={cn(PICKER_LABEL, hideLabel && 'sr-only')}>{label}</span>
	{/if}
	<div class="relative min-w-0">
		<button {...rest}
			{...select.trigger}
			{...triggerAttrs}
			bind:this={ref}
			class={cn(
				INPUT_CLASS,
				PICKER_SIZES[size],
				PICKER_INVALID,
				'flex h-auto items-center gap-2 py-1 text-left disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:border-accent-primary/50'
			)}
		>
			<span class="flex min-w-0 flex-1 flex-wrap items-center gap-1">
				{#if chosen.length === 0}
					<span class="truncate text-fg-light">{placeholder}</span>
				{:else if !many()}
					<span class="truncate">{chosen[0].label}</span>
				{:else if display === 'count'}
					<span class="truncate">{chosen.length === 1 ? chosen[0].label : formatCount(chosen.length)}</span>
				{:else}
					{#each chosen as option (option.value)}
						<span class={badgeClass('neutral', 'max-w-full truncate')}>{option.label}</span>
					{/each}
				{/if}
			</span>
			<ChevronDown aria-hidden="true" class="size-4 shrink-0 text-fg-light" />
		</button>
		{#if control.required}
			<!-- Validation only: posts nothing. An invalid submit focuses it; it hands focus to the trigger. -->
			<input
				tabindex="-1"
				aria-hidden="true"
				required
				disabled={control.disabled}
				value={chosen.length > 0 ? 'chosen' : ''}
				oninvalid={() => (blocked = true)}
				onfocus={() => ref?.focus()}
				class="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
			/>
		{/if}
	</div>
	<div {...select.list} aria-label={listName} class={PICKER_LIST}>
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
	{#if !control.disabled}
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
