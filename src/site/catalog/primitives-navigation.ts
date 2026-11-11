import type { CatalogItemMeta } from '../catalog-registry.ts';

const SOURCE = 'Agents Kit Svelte · Primitives';

/** Catalogue entries for the Primitives collection. Navigation and disclosure: Tabs, Accordion, Breadcrumb, Pagination. Category: 'Primitives'. */
export const PRIMITIVES_NAVIGATION: CatalogItemMeta[] = [
	{
		slug: 'tabs',
		name: 'Tabs',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/navigation/Tabs.svelte',
		upstreamSource: SOURCE,
		description:
			'Tabbed panels in an underline or segmented look, horizontal or vertical. Arrow keys, Home and End move between tabs; automatic activation selects as you move, manual waits for Enter or Space. Tab labels can be rich snippets, and panels can stay mounted, mount lazily or mount only while selected.',
		usageSnippet: `<script lang="ts">
  import { Tabs } from 'agents-kit-svelte/primitives';

  let value = $state('runs');
</script>

{#snippet runs()}<p>Recent runs</p>{/snippet}
{#snippet logs()}<p>Logs from the last run</p>{/snippet}

<Tabs
  label="Card sections"
  variant="segmented"
  bind:value
  items={[
    { value: 'runs', label: 'Runs', content: runs },
    { value: 'logs', label: 'Logs', content: logs }
  ]}
/>`
	},
	{
		slug: 'accordion',
		name: 'Accordion',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/navigation/Accordion.svelte',
		upstreamSource: SOURCE,
		description:
			'Stacked sections that open and close, one at a time or several together. Headers sit inside real headings at the level you choose, and closed panels stay searchable: the browser opens the matching section when find-in-page hits it.',
		usageSnippet: `<script lang="ts">
  import { Accordion } from 'agents-kit-svelte/primitives';

  let value = $state<string | string[] | null>('what');
</script>

{#snippet what()}<p>A run is one agent session on a card.</p>{/snippet}
{#snippet where()}<p>Logs stay on the machine that ran the agent.</p>{/snippet}

<Accordion
  bind:value
  headingLevel={3}
  items={[
    { value: 'what', title: 'What is a run?', content: what },
    { value: 'where', title: 'Where do logs go?', content: where }
  ]}
/>`
	},
	{
		slug: 'breadcrumb',
		name: 'Breadcrumb',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/navigation/Breadcrumb.svelte',
		upstreamSource: SOURCE,
		description:
			'A trail showing where the page sits. The last item is marked as the current page, separators are hidden from screen readers, and on narrow screens the middle folds into a "…" button that reveals it.',
		usageSnippet: `<script lang="ts">
  import { Breadcrumb } from 'agents-kit-svelte/primitives';
</script>

<Breadcrumb
  items={[
    { label: 'Workspace', href: '/' },
    { label: 'Projects', href: '/projects' },
    { label: 'Trailside', href: '/projects/trailside' },
    { label: 'Runs', href: '/projects/trailside/runs' },
    { label: 'Run 42' }
  ]}
/>`
	},
	{
		slug: 'pagination',
		name: 'Pagination',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/navigation/Pagination.svelte',
		upstreamSource: SOURCE,
		description:
			'Previous and next with numbered pages and ellipses, as buttons or as links from an href builder. The current page is marked for screen readers, and on phones the numbers give way to "Page 3 of 12". The ellipsis maths is exported as paginationRange.',
		usageSnippet: `<script lang="ts">
  import { Pagination } from 'agents-kit-svelte/primitives';

  let page = $state(3);
</script>

<Pagination
  bind:page
  pageCount={12}
  siblings={1}
  boundaries={1}
  label="Run pages"
  onPageChange={(next) => console.log('page', next)}
/>`
	}
];
