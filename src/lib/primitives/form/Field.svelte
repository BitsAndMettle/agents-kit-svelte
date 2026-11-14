<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { DANGER_TEXT } from './classes';
	import { createFieldState, fieldControlAttrs, setFieldContext, type FieldControlAttrs, type FieldState } from './field';

	export interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children'> {
		/** Visible label. In a plain field it is a `<label for>` the control; in a group field, the `<legend>`. */
		label?: string | Snippet;
		/** Help text under the label, read as the control's description. */
		description?: string | Snippet;
		/** Error message. Shown in place, announced politely, and marks the control invalid. */
		error?: string | Snippet;
		/** Marks the control invalid without a message. */
		invalid?: boolean;
		/** Passes `required` to the control and shows a required mark after the label. */
		required?: boolean;
		/** Shows "Optional" after the label (ignored when `required`). */
		optional?: boolean;
		/** Disables the control (a group field disables its `<fieldset>`). */
		disabled?: boolean;
		/** Renders a `<fieldset>` and `<legend>` for a RadioGroup or several checkboxes. */
		group?: boolean;
		/** The id the control gets; defaults to a generated one. Set it here, not on the control. */
		controlId?: string;
		/** Text of the optional mark. */
		optionalLabel?: string;
		/** The control. Kit controls read the field themselves; the argument wires any other element. */
		children: Snippet<[FieldControlAttrs]>;
		class?: string;
	}

	let {
		label,
		description,
		error,
		invalid = false,
		required = false,
		optional = false,
		disabled = false,
		group = false,
		controlId,
		optionalLabel = 'Optional',
		children,
		class: className = '',
		...rest
	}: Props = $props();

	const uid = $props.id();

	const field: FieldState = createFieldState({
		id: uid,
		controlId: () => controlId,
		description: () => Boolean(description),
		error: () => Boolean(error),
		invalid: () => invalid,
		required: () => required,
		disabled: () => disabled,
		group: () => group
	});
	setFieldContext(field);

	const control = $derived(fieldControlAttrs(field));
	const groupDescribedBy = $derived(group ? [field.descriptionId, field.errorId].filter(Boolean).join(' ') || undefined : undefined);
</script>

{#snippet text(value: string | Snippet)}
	{#if typeof value === 'string'}{value}{:else}{@render value()}{/if}
{/snippet}

{#snippet mark()}
	{#if required}
		<span aria-hidden="true" class="text-status-danger">*</span>
	{:else if optional}
		<span class="text-xs font-normal text-fg-light">({optionalLabel})</span>
	{/if}
{/snippet}

{#snippet body()}
	{#if description}
		<p id={field.descriptionId} class="text-xs leading-5 text-fg-light">{@render text(description)}</p>
	{/if}
	{@render children(control)}
	<!-- Always rendered, so the message is announced when it appears; referenced only while it has one. -->
	<div id="{uid}-error" aria-live="polite" class={['text-xs leading-5 font-medium empty:-mt-1.5', DANGER_TEXT]}>{#if error}<p>{@render text(error)}</p>{/if}</div>
{/snippet}

{#if group}
	<fieldset {...rest} {disabled} aria-describedby={groupDescribedBy} data-invalid={field.invalid ? '' : undefined} class={cn('m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0', className)}>
		{#if label}
			<legend id={field.labelId} class="mb-1.5 flex items-center gap-1 p-0 text-[13px] font-medium text-fg-main">{@render text(label)}{@render mark()}</legend>
		{/if}
		{@render body()}
	</fieldset>
{:else}
	<div {...rest} data-invalid={field.invalid ? '' : undefined} data-disabled={disabled ? '' : undefined} class={cn('flex min-w-0 flex-col gap-1.5', className)}>
		{#if label}
			<label id={field.labelId} for={field.controlId} class="flex items-center gap-1 text-[13px] font-medium text-fg-main">{@render text(label)}{@render mark()}</label>
		{/if}
		{@render body()}
	</div>
{/if}
