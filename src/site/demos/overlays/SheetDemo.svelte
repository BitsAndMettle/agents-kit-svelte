<script lang="ts">
	import { Sheet, type SheetSide } from '$lib/primitives/overlays';
	import { buttonClass } from '$lib/ui/styles';

	const sides: SheetSide[] = ['right', 'left', 'bottom', 'top'];
	const filters = ['Waiting on a person', 'Running', 'Failed', 'Done today'];
	let chosen = $state<string[]>(['Waiting on a person']);
</script>

<div class="flex flex-wrap items-center gap-2">
	{#each sides as side (side)}
		<Sheet {side} title="Filter runs" description="Show only the runs you need.">
			{#snippet trigger(t)}
				<button {...t} class={buttonClass('secondary', 'md')}>Open {side} sheet</button>
			{/snippet}
			<fieldset class="grid gap-2">
				<legend class="sr-only">Status</legend>
				{#each filters as filter (filter)}
					<label class="flex items-center gap-2">
						<input type="checkbox" value={filter} bind:group={chosen} class="size-4" />
						{filter}
					</label>
				{/each}
			</fieldset>
			{#snippet footer(close)}
				<button type="button" class={buttonClass('ghost', 'md')} onclick={() => (chosen = [])}>Clear</button>
				<button type="button" class={buttonClass('primary', 'md')} onclick={close}>Show {chosen.length} filters</button>
			{/snippet}
		</Sheet>
	{/each}
</div>
