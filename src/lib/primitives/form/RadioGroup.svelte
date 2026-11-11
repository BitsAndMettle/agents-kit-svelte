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
	import { untrack } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { RadioGroup as RadioGroupBehavior } from '../../headless/patterns/groups.svelte';
	import { cn } from '../../ui/cn';
	import { DANGER_TEXT } from './classes';
	import { fieldControlAttrs, getFieldContext, joinIds } from './field';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'role' | 'defaultValue'> {
		options: RadioOption[];
		/** The checked value, or null. Bindable. */
		value?: string | null;
		/** Starting value when `value` is not given, and what a form reset restores (defaults to the starting value). */
		defaultValue?: string | null;
		/** Posts the value with a `<form>` under this name. */
		name?: string;
		/** A form will not submit while nothing is checked; focus then goes to the group. */
		required?: boolean;
		/**
		 * Shown when a submit is blocked because nothing is checked and no Field error is showing.
		 * Defaults to the browser's own (localised) validation message.
		 */
		requiredMessage?: string;
		disabled?: boolean;
		/** Marks the group invalid (a surrounding Field with an error does too). */
		invalid?: boolean;
		/** Layout. Every arrow key moves either way, as in a native radio group. */
		orientation?: 'vertical' | 'horizontal';
		onValueChange?: (value: string | null) => void;
		/** The element with `role="radiogroup"`. Bindable. */
		ref?: HTMLDivElement | null;
		/** Classes for the box around the group. Attributes go on the radiogroup element. */
		class?: string;
	}

	let {
		options,
		defaultValue,
		value = $bindable(defaultValue ?? null),
		name,
		required = false,
		requiredMessage,
		disabled = false,
		invalid = false,
		orientation = 'vertical',
		onValueChange,
		ref = $bindable(null),
		id,
		'aria-describedby': describedBy,
		'aria-label': ariaLabel,
		'aria-labelledby': labelledBy,
		class: className = '',
		...rest
	}: Props = $props();

	const uid = $props.id();
	const field = getFieldContext();
	const messageId = `${uid}-message`;

	// Set when a submit was blocked because nothing is checked; cleared by a choice or a reset.
	let missing = $state('');
	const showMissing = $derived(Boolean(missing) && value === null && !field?.errorId);
	const control = $derived(
		fieldControlAttrs(
			field,
			{ id, describedBy: joinIds(describedBy, showMissing ? messageId : undefined), invalid: invalid || showMissing, required, disabled },
			'group'
		)
	);
	const errorMessage = $derived(control['aria-errormessage'] ?? (showMissing ? messageId : undefined));
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

	// The headless group resets to the value it started with; `defaultValue` wins when given.
	const resetTo = untrack(() => defaultValue);
	$effect(() => {
		const form = ref?.closest('form');
		if (!form) return;
		const onReset = () => {
			missing = '';
			if (resetTo !== undefined && value !== resetTo) {
				value = resetTo;
				onValueChange?.(resetTo);
			}
		};
		form.addEventListener('reset', onReset);
		return () => form.removeEventListener('reset', onReset);
	});

	/** The browser reports a blocked submit on the hidden proxy radio; show it on the group instead. */
	function onInvalid(event: Event): void {
		const proxy = event.currentTarget as HTMLInputElement;
		missing = requiredMessage ?? proxy.validationMessage;
	}

	/** The proxy only takes focus when the browser reports it invalid: hand focus to the visible radio. */
	function onProxyFocus(): void {
		ref?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')?.focus();
	}
</script>

<div class={cn('min-w-0', className)}>
	<div {...rest}
		{...group.root}
		bind:this={ref}
		id={control.id}
		aria-label={ariaLabel}
		aria-labelledby={labelledByField}
		aria-describedby={control['aria-describedby']}
		aria-invalid={control['aria-invalid']}
		aria-errormessage={errorMessage}
		aria-orientation={orientation}
		class={['group/radios relative flex gap-x-5 gap-y-2.5', orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap']}
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
		{#if formInput}<input {...formInput} oninvalid={onInvalid} onfocus={onProxyFocus} class="sr-only" />{/if}
	</div>
	<div id={messageId} aria-live="polite" class={['mt-1.5 text-xs leading-5 font-medium empty:mt-0', DANGER_TEXT]}>{#if showMissing}<p>{missing}</p>{/if}</div>
</div>
