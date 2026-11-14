<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { SvelteMap } from 'svelte/reactivity';
	import { cn } from '../ui/cn';
	import { ROW } from '../ui/styles';
	import { Input, NativeSelect, Switch } from '../primitives/form';
	import { Draft } from './draft.svelte';
	import type { Setting } from './types';

	export interface Props extends Omit<HTMLAttributes<HTMLUListElement>, 'class' | 'children' | 'onchange'> {
		/** The rows, in order. */
		settings: Setting[];
		/**
		 * Called with one change as soon as the person makes it: there is nothing to submit. The new
		 * value shows at once. Return the promise that saves it and the form stays busy until it
		 * settles, then shows the setting's `value` again: update it before you resolve, and a change
		 * you refuse snaps back. A rejection is yours to handle.
		 */
		onChange: (id: string, value: Setting['value']) => unknown;
		/** Turns every control off, e.g. for someone who may only look. */
		disabled?: boolean;
		class?: string;
	}

	let { settings, onChange, disabled = false, class: className = '', ...rest }: Props = $props();

	const uid = $props.id();
	/** One draft per setting, made on its first change, so a change to one setting never lets go of another. */
	const drafts = new SvelteMap<string, Draft<Setting['value']>>();
	let saving = $derived([...drafts.values()].some((draft) => draft.value !== undefined));

	function change(id: string, value: Setting['value']): void {
		const draft = drafts.get(id) ?? new Draft<Setting['value']>();
		drafts.set(id, draft);
		void draft.hold(value, () => onChange(id, value));
	}
</script>

<ul {...rest} aria-busy={saving} class={cn('m-0 list-none p-0', className)}>
	{#each settings as setting, index (setting.id)}
		{@const id = `${uid}-${index}`}
		{@const value = drafts.get(setting.id)?.value ?? setting.value}
		{@const describedBy = setting.description ? `${id}-description` : undefined}
		{@const off = disabled || setting.disabled}
		<li class={ROW.root}>
			<div class="min-w-0 flex-1">
				<!-- Only as wide as its words: empty space in a row changes nothing. -->
				<label for={id} class={cn(ROW.title, 'w-fit')}>{setting.label}</label>
				{#if setting.description}<p id={describedBy} class={ROW.description}>{setting.description}</p>{/if}
			</div>
			{#if typeof value === 'boolean'}
				<Switch {id} checked={value} disabled={off} aria-describedby={describedBy} class="shrink-0" onCheckedChange={(next) => change(setting.id, next)} />
			{:else if typeof value === 'number'}
				<!-- The browser checks the number and says what is wrong with it, in the person's language. -->
				<Input
					{id}
					type="number"
					{value}
					min={setting.min}
					max={setting.max}
					step={setting.step}
					required
					disabled={off}
					aria-describedby={describedBy}
					class="w-24 shrink-0 has-[:user-invalid]:border-status-danger/70"
					onchange={({ currentTarget }) => currentTarget.reportValidity() && change(setting.id, currentTarget.valueAsNumber)}
				/>
			{:else if setting.options}
				<NativeSelect {id} {value} options={setting.options} disabled={off} aria-describedby={describedBy} class="w-auto max-w-[50%] shrink-0" onValueChange={(next) => change(setting.id, next)} />
			{:else}
				<Input {id} {value} disabled={off} aria-describedby={describedBy} class="w-48 max-w-[50%] shrink-0" onchange={({ currentTarget }) => change(setting.id, currentTarget.value)} />
			{/if}
		</li>
	{/each}
</ul>
