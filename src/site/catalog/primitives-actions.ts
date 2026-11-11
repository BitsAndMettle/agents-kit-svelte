import type { CatalogItemMeta } from '../catalog-registry.ts';

const SOURCE = 'Agents Kit Svelte · Primitives';

/** Catalogue entries for the Primitives collection. Actions: Button, IconButton, ButtonGroup, Toggle, ToggleGroup. Category: 'Primitives'. */
export const PRIMITIVES_ACTIONS: CatalogItemMeta[] = [
	{
		slug: 'button',
		name: 'Button',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/actions/Button.svelte',
		upstreamSource: SOURCE,
		description:
			'The kit button in five variants and four sizes, with an optional pill shape, icons before and after the label, and a loading state that keeps its width and stays focusable. Renders a link when given an href.',
		usageSnippet: `<script lang="ts">
  import { Button } from 'agents-kit-svelte/primitives';
  import { Send } from '@lucide/svelte';

  let saving = $state(false);
</script>

<Button variant="primary" loading={saving} onclick={() => (saving = true)}>
  {#snippet leading()}<Send />{/snippet}
  Send
</Button>
<Button href="/docs" variant="ghost">Read the docs</Button>`
	},
	{
		slug: 'icon-button',
		name: 'IconButton',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/actions/IconButton.svelte',
		upstreamSource: SOURCE,
		description:
			'A square button that holds only an icon. The accessible label is required and becomes the aria-label; it supports the same variants and loading state as Button.',
		usageSnippet: `<script lang="ts">
  import { IconButton } from 'agents-kit-svelte/primitives';
  import { Trash2 } from '@lucide/svelte';

  let removing = $state(false);
</script>

<IconButton aria-label="Delete run" variant="danger" loading={removing} onclick={() => (removing = true)}>
  <Trash2 />
</IconButton>`
	},
	{
		slug: 'button-group',
		name: 'ButtonGroup',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/actions/ButtonGroup.svelte',
		upstreamSource: SOURCE,
		description:
			'Lays several buttons out as one named group, joined into a single bar or spaced apart, horizontally or vertically.',
		usageSnippet: `<script lang="ts">
  import { Button, ButtonGroup } from 'agents-kit-svelte/primitives';
</script>

<ButtonGroup aria-label="Run controls">
  <Button>Pause</Button>
  <Button>Retry</Button>
  <Button variant="danger">Stop</Button>
</ButtonGroup>`
	},
	{
		slug: 'toggle',
		name: 'Toggle',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/actions/Toggle.svelte',
		upstreamSource: SOURCE,
		description:
			'A single button that is either pressed or not. It reports its state with aria-pressed and can be bound with bind:pressed.',
		usageSnippet: `<script lang="ts">
  import { Toggle } from 'agents-kit-svelte/primitives';
  import { Bold } from '@lucide/svelte';

  let bold = $state(false);
</script>

<Toggle bind:pressed={bold} onPressedChange={(on) => console.log('bold', on)}>
  {#snippet leading()}<Bold />{/snippet}
  Bold
</Toggle>`
	},
	{
		slug: 'toggle-group',
		name: 'ToggleGroup',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/actions/ToggleGroup.svelte',
		upstreamSource: SOURCE,
		description:
			'A segmented set of toggles with one tab stop and arrow-key movement. Pick one value or several, bind the value, and give items as an array or render them yourself.',
		usageSnippet: `<script lang="ts">
  import { ToggleGroup } from 'agents-kit-svelte/primitives';

  let view = $state<string | string[] | null>('list');
</script>

<ToggleGroup
  aria-label="View"
  bind:value={view}
  items={[
    { value: 'list', label: 'List' },
    { value: 'board', label: 'Board' },
    { value: 'timeline', label: 'Timeline' }
  ]}
/>`
	}
];
