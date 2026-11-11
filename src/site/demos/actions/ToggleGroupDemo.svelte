<script lang="ts">
	import { AlignCenter, AlignLeft, AlignRight } from '@lucide/svelte';
	import { ToggleGroup } from '../../../lib/primitives/actions';

	let view = $state<string | string[] | null>('list');
	let marks = $state<string | string[] | null>(['bold']);
	let posted = $state('');
	let align = $state<string | string[] | null>('left');
</script>

{#snippet left()}<AlignLeft />{/snippet}
{#snippet center()}<AlignCenter />{/snippet}
{#snippet right()}<AlignRight />{/snippet}

<div class="space-y-4 text-sm">
	<div class="flex flex-wrap items-center gap-4">
		<ToggleGroup
			aria-label="View"
			bind:value={view}
			items={[
				{ value: 'list', label: 'List' },
				{ value: 'board', label: 'Board' },
				{ value: 'timeline', label: 'Timeline', disabled: true },
				{ value: 'graph', label: 'Graph' }
			]}
		/>
		<ToggleGroup
			aria-label="Text marks"
			multiple
			bind:value={marks}
			items={[
				{ value: 'bold', label: 'Bold' },
				{ value: 'italic', label: 'Italic' },
				{ value: 'code', label: 'Code' }
			]}
		/>
		<ToggleGroup
			aria-label="Alignment"
			bind:value={align}
			items={[
				{ value: 'left', icon: left, 'aria-label': 'Align left' },
				{ value: 'center', icon: center, 'aria-label': 'Align center' },
				{ value: 'right', icon: right, 'aria-label': 'Align right' }
			]}
		/>
		<ToggleGroup aria-label="Sort order" orientation="vertical" value="newest">
			{#snippet children({ item, itemClass })}
				{#each ['newest', 'oldest'] as v (v)}
					<button {...item({ value: v })} class={itemClass(v)}>{v}</button>
				{/each}
			{/snippet}
		</ToggleGroup>
	</div>
	<form
		class="flex flex-wrap items-center gap-2"
		data-testid="toggle-form"
		onsubmit={(e) => {
			e.preventDefault();
			posted = new URLSearchParams(new FormData(e.currentTarget) as unknown as Record<string, string>).toString();
		}}
	>
		<ToggleGroup aria-label="Notify me by" name="notify" multiple defaultValue={['email']} items={[{ value: 'email', label: 'Email' }, { value: 'push', label: 'Push' }]} />
		<button type="submit" class="text-xs underline">Submit</button>
		<button type="reset" class="text-xs underline">Reset</button>
		<span class="text-xs text-fg-light" data-testid="posted">{posted}</span>
	</form>
	<p class="text-xs text-fg-light" data-testid="view-state">
		View {view ?? 'none'}, marks {Array.isArray(marks) ? marks.join(', ') || 'none' : marks}, align {align ?? 'none'}
	</p>
</div>
