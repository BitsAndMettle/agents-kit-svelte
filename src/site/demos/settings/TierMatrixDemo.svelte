<script lang="ts">
	import { Card } from '$lib/primitives/display';
	import type { RadioOption } from '$lib/primitives/form';
	import { TierMatrix, type Tier, type TierPreset } from '$lib/settings';

	type Choice = 'ask' | 'merge';
	type Choices = { low: Choice; medium: Choice; high: Choice; critical: 'ask' };

	const tiers: Tier[] = [
		{ id: 'low', label: 'Low risk', description: 'Docs, comments and tests.' },
		{ id: 'medium', label: 'Medium risk', description: 'Ordinary code.' },
		{ id: 'high', label: 'High risk', description: 'Migrations and money.' },
		{ id: 'critical', label: 'Critical', description: 'Deploys and permissions. Always asks.', locked: true }
	];
	const options: RadioOption[] = [
		{ value: 'ask', label: 'Ask' },
		{ value: 'merge', label: 'Merge' }
	];
	const presets: TierPreset<Choices>[] = [
		{ id: 'careful', label: 'Careful', value: { low: 'ask', medium: 'ask', high: 'ask' } },
		{ id: 'balanced', label: 'Balanced', value: { low: 'merge', medium: 'merge', high: 'ask' } }
	];

	let choices = $state<Choices>({ low: 'merge', medium: 'ask', high: 'ask', critical: 'ask' });
	let merging = $derived(Object.entries(choices).flatMap(([tier, choice]) => (choice === 'merge' ? [tier] : [])));

	/** A slow server that stores every change. */
	async function save(next: Choices): Promise<void> {
		await new Promise((resolve) => setTimeout(resolve, 800));
		choices = next;
	}
</script>

<div class="mx-auto grid max-w-xl gap-2">
	<Card title="Autonomy" description="What merges on its own, per risk tier." headingLevel={4}>
		<TierMatrix {tiers} {options} {presets} value={choices} onChange={save} />
	</Card>
	<p role="status" class="m-0 px-1 text-xs text-fg-light">Merges on its own: {merging.join(', ') || 'nothing'}.</p>
</div>
