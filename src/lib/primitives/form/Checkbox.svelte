<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { Check, Minus } from '@lucide/svelte';
	import { cn } from '../../ui/cn';
	import { fieldControlAttrs, getFieldContext, joinIds } from './field';

	export interface Props extends Omit<HTMLInputAttributes, 'class' | 'children' | 'type' | 'checked' | 'indeterminate'> {
		/** Bindable. */
		checked?: boolean;
		/** Shows a dash and reads as "mixed"; cleared when the user toggles. Bindable. */
		indeterminate?: boolean;
		/** Label text; or pass content as children. */
		label?: string;
		/** Smaller text under the label, read as the checkbox's description. */
		description?: string | Snippet;
		/** Marks the checkbox invalid (a surrounding Field with an error does too). */
		invalid?: boolean;
		onCheckedChange?: (checked: boolean) => void;
		/** The `<input>` element. Bindable. */
		ref?: HTMLInputElement | null;
		/** Rich label content, instead of `label`. */
		children?: Snippet;
		/** Classes for the row around the checkbox and its label. Attributes go on the `<input>`. */
		class?: string;
	}

	let {
		checked = $bindable(false),
		indeterminate = $bindable(false),
		label,
		description,
		invalid = false,
		onCheckedChange,
		ref = $bindable(null),
		children,
		id,
		required,
		disabled,
		'aria-describedby': describedBy,
		class: className = '',
		...rest
	}: Props = $props();

	const uid = $props.id();
	const field = getFieldContext();
	// A form reset restores the state the control started in (or your own `defaultChecked`).
	const initialChecked = untrack(() => checked);
	const descriptionId = `${uid}-description`;
	const control = $derived(
		fieldControlAttrs(field, {
			id,
			describedBy: joinIds(describedBy, description ? descriptionId : undefined),
			invalid,
			required: Boolean(required),
			disabled: Boolean(disabled)
		})
	);
	const inputId = $derived(control.id ?? `${uid}-input`);
</script>

<div class={cn('inline-grid grid-cols-[auto_1fr] items-start gap-x-2 gap-y-0.5 text-[13px] has-disabled:opacity-60', className)}>
	<span class="relative mt-0.5 grid size-4 place-items-center">
		<input {...rest}
			{...control}
			id={inputId}
			type="checkbox"
			bind:this={ref}
			bind:checked
			defaultChecked={rest.defaultChecked ?? initialChecked}
			bind:indeterminate
			onchange={(event) => {
				onCheckedChange?.(event.currentTarget.checked);
				rest.onchange?.(event);
			}}
			class="peer col-start-1 row-start-1 m-0 size-4 cursor-pointer appearance-none rounded-[5px] border border-fg-light/60 bg-card-bg motion-safe:transition-colors checked:border-accent-primary checked:bg-accent-primary indeterminate:border-accent-primary indeterminate:bg-accent-primary aria-invalid:border-status-danger disabled:cursor-not-allowed"
		/>
		<Check aria-hidden="true" strokeWidth={3} class="pointer-events-none col-start-1 row-start-1 size-3 text-fg-inverse opacity-0 motion-safe:transition-opacity peer-checked:opacity-100 peer-indeterminate:opacity-0" />
		<Minus aria-hidden="true" strokeWidth={3} class="pointer-events-none col-start-1 row-start-1 size-3 text-fg-inverse opacity-0 motion-safe:transition-opacity peer-indeterminate:opacity-100" />
	</span>
	{#if label || children}
		<label for={inputId} class={['min-w-0 cursor-pointer leading-5 text-fg-main', description && 'font-medium']}>
			{#if children}{@render children()}{:else}{label}{/if}
		</label>
	{/if}
	{#if description}
		<p id={descriptionId} class="col-start-2 text-xs leading-5 text-fg-light">
			{#if typeof description === 'string'}{description}{:else}{@render description()}{/if}
		</p>
	{/if}
</div>
