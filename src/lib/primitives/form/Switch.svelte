<script lang="ts" module>
	import type { FormControlSize } from './classes';

	export type SwitchSize = FormControlSize;
</script>

<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { fieldControlAttrs, getFieldContext, joinIds } from './field';

	export interface Props extends Omit<HTMLInputAttributes, 'class' | 'children' | 'type' | 'checked' | 'defaultChecked' | 'role' | 'size'> {
		/** On or off. Bindable. */
		checked?: boolean;
		/** Starting state when `checked` is not given, and what a form reset restores (defaults to the starting state). */
		defaultChecked?: boolean;
		/** Label text; or pass content as children. */
		label?: string;
		/** Smaller text under the label, read as the switch's description. */
		description?: string | Snippet;
		/** Puts the label before the switch (a settings row) instead of after it. */
		labelFirst?: boolean;
		size?: SwitchSize;
		/** Marks the switch invalid (a surrounding Field with an error does too). */
		invalid?: boolean;
		onCheckedChange?: (checked: boolean) => void;
		/** The `<input>` element. Bindable. */
		ref?: HTMLInputElement | null;
		/** Rich label content, instead of `label`. */
		children?: Snippet;
		/** Classes for the row around the switch and its label. Attributes go on the `<input>`. */
		class?: string;
	}

	let {
		defaultChecked,
		checked = $bindable(defaultChecked ?? false),
		label,
		description,
		labelFirst = false,
		size = 'md',
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
	// A form reset restores `defaultChecked`, or the state the control started in.
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
	// In a plain Field the input takes the Field's id, so the Field's <label for> points at it too.
	// The inline label stays the one accessible name: never "Field label + own label".
	const labelId = `${uid}-label`;
	const labelledBy = $derived(
		rest['aria-labelledby'] ?? (field && !field.group && (label || children) && !rest['aria-label'] ? labelId : undefined)
	);

	const TRACK: Record<SwitchSize, string> = { sm: 'h-4 w-7', md: 'h-5 w-9', lg: 'h-6 w-11' };
	const THUMB: Record<SwitchSize, string> = {
		sm: 'size-3 peer-checked:translate-x-3',
		md: 'size-4 peer-checked:translate-x-4',
		lg: 'size-5 peer-checked:translate-x-5'
	};
</script>

<div class={cn('inline-grid items-start gap-x-2.5 gap-y-0.5 has-disabled:opacity-60', size === 'lg' ? 'text-sm' : 'text-[13px]', labelFirst ? 'grid-cols-[1fr_auto]' : 'grid-cols-[auto_1fr]', className)}>
	<span class={['relative row-start-1 grid items-center', labelFirst ? 'col-start-2' : 'col-start-1', size === 'sm' ? 'mt-0.5' : '']}>
		<input {...rest}
			{...control}
			id={inputId}
			type="checkbox"
			role="switch"
			bind:this={ref}
			bind:checked
			defaultChecked={defaultChecked ?? initialChecked}
			aria-labelledby={labelledBy}
			onchange={(event) => {
				onCheckedChange?.(event.currentTarget.checked);
				rest.onchange?.(event);
			}}
			class={['peer col-start-1 row-start-1 m-0 cursor-pointer appearance-none rounded-full border border-transparent bg-fg-light/45 motion-safe:transition-colors checked:bg-accent-primary aria-invalid:border-status-danger disabled:cursor-not-allowed', TRACK[size]]}
		/>
		<span aria-hidden="true" class={['pointer-events-none col-start-1 row-start-1 ml-0.5 rounded-full bg-white ak-shadow-btn motion-safe:transition-transform motion-safe:duration-200', THUMB[size]]}></span>
	</span>
	{#if label || children}
		<label id={labelId} for={inputId} class={['row-start-1 min-w-0 cursor-pointer text-fg-main', size === 'lg' ? 'leading-6' : 'leading-5', labelFirst ? 'col-start-1' : 'col-start-2', description && 'font-medium']}>
			{#if children}{@render children()}{:else}{label}{/if}
		</label>
	{/if}
	{#if description}
		<p id={descriptionId} class={['row-start-2 text-xs leading-5 text-fg-light', labelFirst ? 'col-start-1' : 'col-start-2']}>
			{#if typeof description === 'string'}{description}{:else}{@render description()}{/if}
		</p>
	{/if}
</div>
