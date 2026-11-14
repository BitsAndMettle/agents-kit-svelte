<script lang="ts" generics="V extends Record<string, string>">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../ui/cn';
	import { ROW, SEGMENT_GROUP_CLASS, segmentClass } from '../ui/styles';
	import { RadioGroup } from '../primitives/form';
	import { Draft } from './draft.svelte';
	import type { TierMatrixProps, TierPreset } from './types';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onchange' | keyof TierMatrixProps<V>>, TierMatrixProps<V> {}

	let { tiers, options, value, presets = [], onChange, disabled = false, presetsLabel = 'Presets', class: className = '', ...rest }: Props = $props();

	const uid = $props.id();
	const draft = new Draft<V>();
	let shown = $derived(draft.value ?? value);

	function matches(preset: TierPreset<V>): boolean {
		return Object.entries(preset.value).every(([tier, option]) => shown[tier] === option);
	}

	function change(next: V): void {
		void draft.hold(next, onChange);
	}
</script>

<div {...rest} aria-busy={draft.value !== undefined} class={cn('flex flex-col gap-3', className)}>
	{#if presets.length}
		<div role="group" aria-label={presetsLabel} class={cn(SEGMENT_GROUP_CLASS, 'self-start')}>
			{#each presets as preset (preset.id)}
				{@const pressed = matches(preset)}
				<button
					type="button"
					aria-pressed={pressed}
					{disabled}
					onclick={() => pressed || change({ ...shown, ...preset.value })}
					class={cn(segmentClass(pressed), 'cursor-pointer disabled:cursor-not-allowed disabled:opacity-50')}
				>
					{preset.label}
				</button>
			{/each}
		</div>
	{/if}
	<ul class="m-0 list-none p-0">
		{#each tiers as tier, index (tier.id)}
			{@const id = `${uid}-${index}`}
			<li class={ROW.root}>
				<div class="min-w-0 flex-1">
					<p {id} class={ROW.title}>{tier.label}</p>
					{#if tier.description}<p id="{id}-description" class={ROW.description}>{tier.description}</p>{/if}
				</div>
				<RadioGroup
					{options}
					value={shown[tier.id]}
					orientation="horizontal"
					disabled={disabled || tier.locked}
					aria-labelledby={id}
					aria-describedby={tier.description ? `${id}-description` : undefined}
					class="shrink-0"
					onValueChange={(option) => option && change({ ...shown, [tier.id]: option })}
				/>
			</li>
		{/each}
	</ul>
</div>
