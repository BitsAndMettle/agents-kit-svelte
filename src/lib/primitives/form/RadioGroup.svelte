<script lang="ts" module>
	/** One choice in a RadioGroup. */
	export interface RadioOption {
		value: string;
		label: string;
		/** Smaller text under the label, read as the radio's description. */
		description?: string;
		disabled?: boolean;
	}
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { RadioGroup as RadioGroupBehavior } from '../../headless/patterns/groups.svelte';
	import { cn } from '../../ui/cn';
	import { fieldControlAttrs, getFieldContext } from './field';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'role'> {
		options: RadioOption[];
		/** The checked value, or null. Bindable. */
		value?: string | null;
		/** Posts the value with a `<form>` under this name. */
		name?: string;
		/** A form will not submit while nothing is checked. */
		required?: boolean;
		disabled?: boolean;
		/** Marks the group invalid (a surrounding Field with an error does too). */
		invalid?: boolean;
		/** Layout. Every arrow key moves either way, as in a native radio group. */
		orientation?: 'vertical' | 'horizontal';
		onValueChange?: (value: string | null) => void;
		class?: string;
	}

	let {
		options,
		value = $bindable(null),
		name,
		required = false,
		disabled = false,
		invalid = false,
		orientation = 'vertical',
		onValueChange,
		id,
		'aria-describedby': describedBy,
		'aria-label': ariaLabel,
		'aria-labelledby': labelledBy,
		class: className = '',
		...rest
	}: Props = $props();

	const uid = $props.id();
	const field = getFieldContext();
	const control = $derived(fieldControlAttrs(field, { id, describedBy, invalid, required, disabled }, 'group'));
	// A field's label names the group unless the group was named directly.
	const labelledByField = $derived(ariaLabel || labelledBy ? labelledBy : field?.labelId);

	const group = new RadioGroupBehavior({
		id: uid,
		value: () => value,
		onValueChange: (next) => {
			value = next;
			onValueChange?.(next);
		},
		name: () => name ?? '',
		required: () => Boolean(control['aria-required']),
		disabled: () => Boolean(control.disabled)
	});
	const formInput = $derived(name ? group.formInput : null);
</script>

<div {...rest}
	{...group.root}
	id={control.id}
	aria-label={ariaLabel}
	aria-labelledby={labelledByField}
	aria-describedby={control['aria-describedby']}
	aria-invalid={control['aria-invalid']}
	aria-errormessage={control['aria-errormessage']}
	aria-orientation={orientation}
	class={cn('group/radios relative flex gap-x-5 gap-y-2.5', orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap', className)}
>
	{#each options as option, index (option.value)}
		{@const itemId = `${uid}-option-${index}`}
		<div
			{...group.item({ value: option.value, disabled: option.disabled })}
			aria-labelledby="{itemId}-label"
			aria-describedby={option.description ? `${itemId}-description` : undefined}
			class="group/radio grid cursor-pointer grid-cols-[auto_1fr] items-start gap-x-2 gap-y-0.5 rounded-control text-[13px] outline-offset-4 data-disabled:cursor-not-allowed data-disabled:opacity-50"
		>
			<span aria-hidden="true" class="mt-0.5 grid size-4 place-items-center rounded-full border border-fg-light/60 bg-card-bg motion-safe:transition-colors group-data-[state=checked]/radio:border-accent-primary group-data-[state=checked]/radio:bg-accent-primary group-aria-invalid/radios:border-status-danger">
				<span class="size-1.5 scale-0 rounded-full bg-fg-inverse motion-safe:transition-transform group-data-[state=checked]/radio:scale-100"></span>
			</span>
			<span id="{itemId}-label" class={['min-w-0 leading-5 text-fg-main', option.description && 'font-medium']}>{option.label}</span>
			{#if option.description}
				<span id="{itemId}-description" class="col-start-2 text-xs leading-5 text-fg-light">{option.description}</span>
			{/if}
		</div>
	{/each}
	{#if formInput}<input {...formInput} class="sr-only" />{/if}
</div>
