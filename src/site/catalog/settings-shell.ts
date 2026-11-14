import type { CatalogItemMeta } from '../catalog-registry.ts';

const UPSTREAM = 'Agents Kit Svelte · Settings';

/** Catalogue entries for the Settings collection (shell group): SettingsLayout, SettingsNav, SettingsPage, SettingsSearch, AttentionList. Category: 'Settings'. */
export const SETTINGS_SHELL: CatalogItemMeta[] = [
	{
		slug: 'settings-layout',
		name: 'SettingsLayout',
		category: 'Settings',
		sveltePath: 'src/lib/settings/shell/SettingsLayout.svelte',
		upstreamSource: UPSTREAM,
		description:
			'The whole settings area in one DOM tree. In a wide container it shows a navigation rail beside the page; in a narrow one it shows either the grouped index (with an optional attention slot on top) or the current page alone, chosen by `current` and `mode`. With nothing current, every width shows the index on its own, attention on top (set `headingLevel={1}` when it is the whole page). It sets the settings container and the not-yet-hydrated gate for everything below, and draws the navigation once. It reports nothing: your app owns routing, loads the section and passes it in as children, and sets the document title.',
		usageSnippet: `<script lang="ts">
  import { SettingsLayout, SettingsPage, type SettingsNavGroup } from 'agents-kit-svelte/settings';

  // In SvelteKit, pass these from the route: params.section and url.searchParams.get('q').
  let { section = null, query = '' }: { section?: string | null; query?: string } = $props();

  const groups: SettingsNavGroup[] = [
    { id: 'account', label: 'Account', items: [
      { id: 'profile', label: 'Profile', href: '/settings/profile' },
      { id: 'notifications', label: 'Notifications', href: '/settings/notifications', badge: 2 }
    ] },
    { id: 'team', label: 'Team', items: [
      { id: 'members', label: 'Members', href: '/settings/members', dirty: true },
      { id: 'billing', label: 'Billing', href: '/settings/billing', lock: 'permission' }
    ] }
  ];
  const current = $derived(groups.flatMap((g) => g.items).find((link) => link.id === section));
</script>

<SettingsLayout {groups} current={section} filter={{ value: query }}>
  {#if current}
    <SettingsPage title={current.label} backHref="/settings">
      <p>The {current.label} section goes here.</p>
    </SettingsPage>
  {/if}
</SettingsLayout>`
	},
	{
		slug: 'settings-nav',
		name: 'SettingsNav',
		category: 'Settings',
		sveltePath: 'src/lib/settings/shell/SettingsNav.svelte',
		upstreamSource: UPSTREAM,
		description:
			'Grouped settings links as a compact rail or a phone-style index (44px rows with an icon tile, description, meta and chevron, optionally two up). A link is named by its label alone and described by its count badge, unsaved-changes dot, lock mark, description and meta; `columns={2}` sets the index look two up (in `auto` too, until the rail takes over); the current one gets aria-current and an accent bar; an unavailable one is plain text with its reason, never a dead link. The optional filter is a GET form (`?q=`) that also filters in place and reports through onFilterChange. It navigates only through its links: your app renders the destination.',
		usageSnippet: `<script lang="ts">
  import { SettingsNav, type SettingsNavGroup } from 'agents-kit-svelte/settings';

  let query = $state('');
  const groups: SettingsNavGroup[] = [
    { id: 'account', label: 'Account', items: [
      { id: 'profile', label: 'Profile', href: '/settings/profile', description: 'Name, photo and email.' },
      { id: 'appearance', label: 'Appearance', href: '/settings/appearance', keywords: ['theme', 'dark mode'] }
    ] },
    { id: 'team', label: 'Team', items: [
      { id: 'general', label: 'General', href: '/settings/general', dirty: true },
      { id: 'security', label: 'Security', href: '/settings/security', disabled: 'Available on the Business plan.' }
    ] }
  ];
</script>

<SettingsNav {groups} current="general" variant="rail" filter={{ value: query }} onFilterChange={(q) => (query = q)} />
<SettingsNav {groups} current="general" variant="index" title="Settings" aria-label="Settings index" />`
	},
	{
		slug: 'settings-page',
		name: 'SettingsPage',
		category: 'Settings',
		sveltePath: 'src/lib/settings/shell/SettingsPage.svelte',
		upstreamSource: UPSTREAM,
		description:
			'The frame of one settings page: a back link that shows only in a narrow container, a breadcrumb for sub-pages, an icon tile, the heading with badges, a one-sentence lead and trailing actions, then an optional banner, the body and a footnote. A `scope` adds a non-dismissible note about the whole page (preview, read-only, sample) with up to two actions; with `scope.lock` every control below is locked and described by the visible reason (settings rows read it from context; plain controls get it from the children snippet). Scope actions are links, posts (`intent`, from a small post form that works without JavaScript) or callbacks; a callback’s returned `{ error }` or rejection is shown under the note as an alert. The page itself reports nothing.',
		usageSnippet: `<script lang="ts">
  import { SettingsPage, lockAttrs, type SettingsPageScope } from 'agents-kit-svelte/settings';
  import { Switch } from 'agents-kit-svelte/primitives';

  let requested = $state(false);
  const scope: SettingsPageScope = $derived({
    label: 'Read-only for your role',
    lock: { kind: 'permission', reason: 'Only admins can change data settings.' },
    actions: [requested
      ? { label: 'Access requested', unavailable: 'An admin has your request.' }
      : { label: 'Request access', onSelect: async () => { await fetch('/access-requests', { method: 'POST' }); requested = true; } }]
  });
</script>

<SettingsPage title="Data" lead="Retention, exports and deletion." backHref="/settings" {scope}>
  {#snippet children(pageScope)}
    <Switch label="Keep deleted items for 30 days" {...lockAttrs(pageScope.lock?.lock, pageScope.lock?.reasonId)} />
  {/snippet}
</SettingsPage>`
	},
	{
		slug: 'settings-search',
		name: 'SettingsSearch',
		category: 'Settings',
		sveltePath: 'src/lib/settings/shell/SettingsSearch.svelte',
		upstreamSource: UPSTREAM,
		description:
			'Search across individual settings, not just sections. It is a GET form (`?q=`): render it on the server with `value` set and the results arrive as plain links. With JavaScript it ranks as you type (label start, then label word, then keyword, then anywhere; case and accents ignored), marks the matched text, names the section each result lives in, offers a clear button, moves through results with the arrow keys and reports the chosen one through onSelect before the link navigates. `inline` sits at the top of a rail; `page` is a results page. The same entries feed a CommandPalette through toPaletteCommands.',
		usageSnippet: `<script lang="ts">
  import { SettingsSearch, type SettingsSearchEntry } from 'agents-kit-svelte/settings';

  let query = $state('');
  const entries: SettingsSearchEntry[] = [
    { id: 'display-name', label: 'Display name', section: 'Profile', href: '/settings/profile#display-name' },
    { id: 'theme', label: 'Theme', section: 'Appearance', href: '/settings/appearance#theme', keywords: ['dark mode'] },
    { id: 'retention', label: 'Data retention', section: 'Data', href: '/settings/data#retention', description: 'How long activity is kept.' }
  ];

  function opened(entry: SettingsSearchEntry) {
    console.log('Opening', entry.href);
  }
</script>

<SettingsSearch {entries} bind:value={query} action="/settings/search" shortcut="/" onSelect={opened} />`
	},
	{
		slug: 'attention-list',
		name: 'AttentionList',
		category: 'Settings',
		sveltePath: 'src/lib/settings/shell/AttentionList.svelte',
		upstreamSource: UPSTREAM,
		description:
			'A data-driven "needs attention" list. The count is always the number of items; each item shows a tone tile (with the tone spoken), a label, one line and one action, and the whole item follows that action without nesting controls. An action is a link (`href`) or a callback (`onSelect`): a returned promise marks the item busy, and a returned `{ error }` or a rejection is shown in the item. Wide containers show boxed cards, narrow ones rows. A dismissible item reports onDismiss(id) (a promise shows loading; a returned `{ error }` or a rejection keeps the item and says why). Dismissing needs JavaScript, so the dismiss button appears once the page is ready; your app removes it and focus moves to the next item, the previous one or the heading. With no items the list is hidden. Your app decides what needs attention.',
		usageSnippet: `<script lang="ts">
  import { AttentionList, type AttentionItem } from 'agents-kit-svelte/settings';

  let items = $state<AttentionItem[]>([
    { id: 'seats', tone: 'warning', label: 'Almost out of seats', description: '42 of 50 seats used.', action: { label: 'Add seats', href: '/settings/billing#seats' }, dismissible: true },
    { id: 'email', tone: 'neutral', label: 'Confirm your contact email', action: { label: 'Send link', href: '/settings/profile#email' } }
  ]);

  async function dismiss(id: string) {
    await fetch('/attention/' + id, { method: 'DELETE' });
    items = items.filter((item) => item.id !== id);
  }
</script>

<AttentionList {items} onDismiss={dismiss} />`
	}
];
