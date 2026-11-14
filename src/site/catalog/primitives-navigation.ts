import type { CatalogItemMeta } from '../catalog-registry.ts';

const SOURCE = 'Agents Kit Svelte · Primitives';

/** Catalogue entries for the Primitives collection. Navigation and disclosure: Tabs, Accordion, Breadcrumb, Pagination, AppShell. Category: 'Primitives'. */
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
  aria-label="Card sections"
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
    { value: 'what', label: 'What is a run?', content: what },
    { value: 'where', label: 'Where do logs go?', content: where }
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
    { label: 'Teams', href: '/teams' },
    { label: 'Acme', href: '/teams/acme' },
    { label: 'Reports', href: '/teams/acme/reports' },
    { label: 'Report 42' }
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
  bind:value={page}
  pageCount={12}
  siblings={1}
  boundaries={1}
  aria-label="Run pages"
  onValueChange={(next) => console.log('page', next)}
/>`
	},
	{
		slug: 'app-shell',
		name: 'AppShell',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/navigation/AppShell.svelte',
		upstreamSource: SOURCE,
		description:
			'The frame of an app: one bar with its name, the places to go and your controls, over the page. The item the current path is under is marked as the current page, and a count after a label says what it counts. The page scrolls with the document and the bar stays in view; a place marked fill gives its page exactly the space under the bar instead, for a chat that does its own scrolling. On a phone the places are a row of their own.',
		usageSnippet: `<script lang="ts">
  import { AppShell, Button, type AppShellItem } from 'agents-kit-svelte/primitives';

  // From your router, e.g. page.url.pathname in SvelteKit.
  let path = $state('/acme/board');
  let notices = $state(2);

  let items = $derived<AppShellItem[]>([
    { label: 'Board', href: '/acme/board' },
    // The chat's page takes h-full and gets exactly the space under the bar.
    { label: 'Chat', href: '/acme/chat', fill: true },
    { label: 'Settings', href: '/acme/settings', count: notices, countLabel: 'open notices' }
  ]);
</script>

<AppShell title="Acme" {items} {path}>
  {#snippet actions()}
    <Button size="sm" variant="ghost" onclick={() => console.log('sign out')}>Sign out</Button>
  {/snippet}
  <p class="p-6">The page for {path}</p>
</AppShell>`
	}
];
