<script lang="ts" module>
	export type SwitchSize = 'sm' | 'md';
</script>

<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { fieldControlAttrs, getFieldContext, joinIds } from './field';

	export interface Props extends Omit<HTMLInputAttributes, 'class' | 'children' | 'type' | 'checked' | 'role' | 'size'> {
		/** On or off. Bindable. */
		checked?: boolean;
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
		checked = $bindable(false),
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

	const TRACK: Record<SwitchSize, string> = { sm: 'h-4 w-7', md: 'h-5 w-9' };
	const THUMB: Record<SwitchSize, string> = { sm: 'size-3 peer-checked:translate-x-3', md: 'size-4 peer-checked:translate-x-4' };
</script>

<div class={cn('inline-grid items-start gap-x-2.5 gap-y-0.5 text-[13px] has-disabled:opacity-60', labelFirst ? 'grid-cols-[1fr_auto]' : 'grid-cols-[auto_1fr]', className)}>
	<span class={['relative row-start-1 grid items-center', labelFirst ? 'col-start-2' : 'col-start-1', size === 'sm' ? 'mt-0.5' : '']}>
		<input {...rest}
			{...control}
			id={inputId}
			type="checkbox"
			role="switch"
			bind:this={ref}
			bind:checked
			defaultChecked={rest.defaultChecked ?? initialChecked}
			onchange={(event) => {
				onCheckedChange?.(event.currentTarget.checked);
				rest.onchange?.(event);
			}}
			class={['peer col-start-1 row-start-1 m-0 cursor-pointer appearance-none rounded-full border border-transparent bg-fg-light/45 motion-safe:transition-colors checked:bg-accent-primary aria-invalid:border-status-danger disabled:cursor-not-allowed', TRACK[size]]}
		/>
		<span aria-hidden="true" class={['pointer-events-none col-start-1 row-start-1 ml-0.5 rounded-full bg-white ak-shadow-btn motion-safe:transition-transform motion-safe:duration-200', THUMB[size]]}></span>
	</span>
	{#if label || children}
		<label for={inputId} class={['row-start-1 min-w-0 cursor-pointer leading-5 text-fg-main', labelFirst ? 'col-start-1' : 'col-start-2', description && 'font-medium']}>
			{#if children}{@render children()}{:else}{label}{/if}
		</label>
	{/if}
	{#if description}
		<p id={descriptionId} class={['row-start-2 text-xs leading-5 text-fg-light', labelFirst ? 'col-start-1' : 'col-start-2']}>
			{#if typeof description === 'string'}{description}{:else}{@render description()}{/if}
		</p>
	{/if}
</div>
