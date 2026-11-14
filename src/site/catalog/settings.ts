import type { CatalogItemMeta } from '../catalog-registry.ts';

const UPSTREAM = 'Agents Kit Svelte · Settings';

/** Catalogue entries for the Settings collection: SettingsForm, TierMatrix. Category: 'Settings'. */
export const SETTINGS: CatalogItemMeta[] = [
	{
		slug: 'settings-form',
		name: 'SettingsForm',
		category: 'Settings',
		sveltePath: 'src/lib/settings/SettingsForm.svelte',
		upstreamSource: UPSTREAM,
		description:
			'A form generated from a list of settings. Each row gets the control its value calls for: a switch for a boolean, a number box for a number, a select or a text box for a string. A change is reported at once and shows while your promise saves it; a change you refuse snaps back.',
		usageSnippet: `<script lang="ts">
  import { SettingsForm, type Setting } from 'agents-kit-svelte/settings';

  let saved = $state({ holds: true, limit: 40 });

  let settings = $derived<Setting[]>([
    { id: 'holds', label: 'Hold protected changes', description: 'A change to a protected path waits for you.', value: saved.holds },
    { id: 'limit', label: 'Daily run limit', description: 'The most runs started per day.', value: saved.limit, min: 0 }
  ]);

  // Save one change, then update what you pass in. If the server refuses, change nothing: the row snaps back.
  async function save(id: string, value: Setting['value']) {
    const response = await fetch('/settings', { method: 'POST', body: JSON.stringify({ id, value }) });
    if (response.ok) saved = { ...saved, [id]: value };
  }
</script>

<SettingsForm {settings} onChange={save} />`
	},
	{
		slug: 'tier-matrix',
		name: 'TierMatrix',
		category: 'Settings',
		sveltePath: 'src/lib/settings/TierMatrix.svelte',
		upstreamSource: UPSTREAM,
		description:
			'One choice per tier, with presets. Every tier picks one of the same options; a preset sets several tiers in one press and stays pressed while they match. A locked tier shows its choice and cannot be changed. A change shows at once while your promise saves it, and snaps back if you refuse it.',
		usageSnippet: `<script lang="ts">
  import { TierMatrix, type Tier, type TierPreset } from 'agents-kit-svelte/settings';

  type Choices = { low: 'ask' | 'merge'; high: 'ask' | 'merge'; critical: 'ask' };

  const tiers: Tier[] = [
    { id: 'low', label: 'Low risk', description: 'Docs and tests.' },
    { id: 'high', label: 'High risk', description: 'Migrations and money.' },
    { id: 'critical', label: 'Critical', description: 'Deploys. Always asks.', locked: true }
  ];
  const presets: TierPreset<Choices>[] = [
    { id: 'careful', label: 'Careful', value: { low: 'ask', high: 'ask' } },
    { id: 'balanced', label: 'Balanced', value: { low: 'merge', high: 'ask' } }
  ];

  let choices = $state<Choices>({ low: 'merge', high: 'merge', critical: 'ask' });

  // The matrix hands back the whole value, typed as yours. Save it, then update what you pass in.
  async function save(next: Choices) {
    await fetch('/autonomy', { method: 'PUT', body: JSON.stringify(next) });
    choices = next;
  }
</script>

<TierMatrix
  {tiers}
  {presets}
  options={[{ value: 'ask', label: 'Ask' }, { value: 'merge', label: 'Merge' }]}
  value={choices}
  onChange={save}
/>`
	}
];
