<script lang="ts">
	import { Card } from '$lib/primitives/display';
	import { SettingsForm, type Setting } from '$lib/settings';

	let saved = $state<Record<string, Setting['value']>>({ holds: true, limit: 40, model: 'balanced', prefix: 'agent/', share: false });
	let note = $state('Nothing changed yet.');

	let settings = $derived<Setting[]>([
		{ id: 'holds', label: 'Hold protected changes', description: 'A change to a protected path waits for your approval.', value: saved.holds },
		{ id: 'limit', label: 'Daily run limit', description: 'The most runs started per day, up to 500.', value: saved.limit, min: 0, max: 500 },
		{
			id: 'model',
			label: 'Model',
			description: 'What new runs think with.',
			value: saved.model,
			options: [
				{ value: 'fast', label: 'Fast' },
				{ value: 'balanced', label: 'Balanced' },
				{ value: 'deep', label: 'Deep' }
			]
		},
		{ id: 'prefix', label: 'Branch prefix', value: saved.prefix },
		{ id: 'share', label: 'Share runs publicly', description: 'This server refuses it, so the switch snaps back.', value: saved.share }
	]);

	/** A slow server that stores every change but one. */
	async function save(id: string, value: Setting['value']): Promise<void> {
		await new Promise((resolve) => setTimeout(resolve, 800));
		if (id === 'share') {
			note = 'Refused: runs stay private.';
			return;
		}
		saved = { ...saved, [id]: value };
		note = `Saved ${id}: ${value}`;
	}
</script>

<div class="mx-auto grid max-w-xl gap-2">
	<Card title="Limits" headingLevel={4}>
		<SettingsForm {settings} onChange={save} />
	</Card>
	<p role="status" class="m-0 px-1 text-xs text-fg-light">{note}</p>
</div>
