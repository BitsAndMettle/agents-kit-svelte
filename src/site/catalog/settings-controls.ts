import type { CatalogItemMeta } from '../catalog-registry.ts';

const UPSTREAM = 'Agents Kit Svelte · Settings';

/** Catalogue entries for the Settings collection (controls group): ChoiceCards, NotificationMatrix, SettingsItemList, UsageMeter, CopyValue. Category: 'Settings'. */
export const SETTINGS_CONTROLS: CatalogItemMeta[] = [
	{
		slug: 'choice-cards',
		name: 'ChoiceCards',
		category: 'Settings',
		sveltePath: 'src/lib/settings/controls/ChoiceCards.svelte',
		upstreamSource: UPSTREAM,
		description:
			'One choice from a few, drawn as cards (with an optional preview, icon, badge and Current / Changed caption), rows, a segmented control, or `auto` (cards that turn segmented in a narrow settings container). Native radios, so arrow keys and form posts work without JavaScript. It reports each choice through onValueChange; with onCommit it saves instantly (saving, saved, Undo, and a revert with "Couldn\'t save. Changed back." on failure), and inside a SettingsForm it is staged and saved with the form. A locked option or group shows its reason as text. Your app saves the value.',
		usageSnippet: `<script lang="ts">
  import { ChoiceCards, type ChoiceOption } from 'agents-kit-svelte/settings';

  const options: ChoiceOption[] = [
    { value: 'system', label: 'System', description: 'Follows your device.' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'contrast', label: 'High contrast', lock: { kind: 'plan', reason: 'Available on the Business plan.' } }
  ];
  let theme = $state('system');

  // Instant: save each choice. Return { error } (or throw) and the choice is changed back.
  async function saveTheme(value: string) {
    const response = await fetch('/api/preferences/theme', { method: 'PUT', body: value });
    if (!response.ok) return { error: "Couldn't save the theme. Changed back." };
  }
</script>

<p id="theme-label">Theme</p>
<ChoiceCards
  name="theme"
  aria-labelledby="theme-label"
  {options}
  bind:value={theme}
  savedValue={theme}
  onCommit={saveTheme}
  action="?/theme"
/>`
	},
	{
		slug: 'notification-matrix',
		name: 'NotificationMatrix',
		category: 'Settings',
		sveltePath: 'src/lib/settings/controls/NotificationMatrix.svelte',
		upstreamSource: UPSTREAM,
		description:
			'An events by channels grid of native checkboxes, one per cell, each named "Mentions by Email". Cells can be locked (Always on / Always off with a reason), a channel can be unavailable with a reason or gated by browser permission (an Allow button reports onRequestPermission), and each column can get an all / some / none toggle (a strip above the events in the narrow layout). In a narrow settings container (or layout="list") each event stacks with labelled cells. Natively each cell that is on posts notify=event:channel, locked cells through hidden inputs. It reports onValueChange, onCellCommit(event, channel, on) for instant saving per cell (every failed cell keeps its own alert until changed again), or saves staged inside a SettingsForm. Your app stores the preferences and asks the browser for permission.',
		usageSnippet: `<script lang="ts">
  import { NotificationMatrix, type NotificationChannel, type NotificationEvent } from 'agents-kit-svelte/settings';

  const events: NotificationEvent[] = [
    { id: 'mention', label: 'Mentions' },
    { id: 'reply', label: 'Replies' },
    { id: 'security', label: 'Security alerts' }
  ];
  let pushPermission = $state<NotificationChannel['permission']>('prompt');
  const channels = $derived<NotificationChannel[]>([
    { id: 'email', label: 'Email' },
    { id: 'push', label: 'Push', permission: pushPermission },
    { id: 'sms', label: 'Text', unavailable: 'Add a verified phone number first.' }
  ]);
  let cells = $state(['mention:email', 'security:email']);

  async function saveCell(event: string, channel: string, on: boolean) {
    const response = await fetch('/api/notifications', { method: 'PATCH', body: JSON.stringify({ event, channel, on }) });
    if (!response.ok) return { error: "Couldn't save that. Changed back." };
  }
  async function askForPush() {
    pushPermission = (await Notification.requestPermission()) === 'granted' ? 'granted' : 'denied';
  }
</script>

<NotificationMatrix
  {events}
  {channels}
  bind:value={cells}
  locked={{ 'security:email': { checked: true, reason: 'Needed to keep your account safe.' } }}
  onCellCommit={saveCell}
  onRequestPermission={askForPush}
  columnToggle
/>`
	},
	{
		slug: 'settings-item-list',
		name: 'SettingsItemList',
		category: 'Settings',
		sveltePath: 'src/lib/settings/controls/SettingsItemList.svelte',
		upstreamSource: UPSTREAM,
		description:
			'A managed list of things (members, devices, folders, keys) in a section card: avatar or icon, label, badges, meta, status, a trailing control (a Switch, a NativeSelect pill for a role) and row actions, which collapse into a menu when there are more than two. Actions can ask first in an AlertDialog; a returned promise shows loading on the row and a failure is announced politely on it. Optional sub-groups (Invited), a filter (a GET form without JavaScript, keeping the query parameters you pass in filter.hidden), an empty state, an add footer with a visible reason when unavailable, and opt-in multi-select with locked rows, a summary ("3 selected · frees 2.9 GB") and bulk actions. Without JavaScript row buttons post actionId=itemId to formAction; an action that asks first never posts unconfirmed: with an href (a confirmation route) it is a link until the page is ready, otherwise it waits. Locked rows and unavailable actions never post. Your app removes items; focus then moves to the next row, the previous, then the heading.',
		usageSnippet: `<script lang="ts">
  import { SettingsItemList, type SettingsItem, type SettingsItemAction } from 'agents-kit-svelte/settings';
  import { NativeSelect } from 'agents-kit-svelte/primitives';

  type Member = SettingsItem & { role: string };
  let members = $state<Member[]>([
    { id: 'u1', label: 'Ada Park', description: 'ada@example.com', avatar: { name: 'Ada Park' }, role: 'owner', current: true },
    { id: 'u2', label: 'Ben Ortiz', description: 'ben@example.com', avatar: { name: 'Ben Ortiz' }, role: 'admin' },
    { id: 'i1', label: 'erin@example.com', group: 'invited', role: 'member', meta: ['Invited 2 days ago'] }
  ]);
  const roles = [{ value: 'owner', label: 'Owner' }, { value: 'admin', label: 'Admin' }, { value: 'member', label: 'Member' }];

  const actions = (item: Member): SettingsItemAction[] => [
    { id: 'remove', label: 'Remove', tone: 'danger', confirm: { title: \`Remove \${item.label}?\`, description: 'They lose access at once.' } }
  ];
  async function onAction(actionId: string, item: Member) {
    if (actionId !== 'remove') return;
    await fetch(\`/api/members/\${item.id}\`, { method: 'DELETE' });
    members = members.filter((m) => m.id !== item.id);
  }
</script>

<SettingsItemList
  title="Members"
  items={members}
  groups={[{ id: 'invited', label: 'Invited' }]}
  filter={{ name: 'q' }}
  {actions}
  {onAction}
  formAction="?/members"
  labels={{ current: 'You' }}
>
  {#snippet trailing(item)}
    <NativeSelect variant="pill" size="sm" aria-label={\`Role for \${item.label}\`} options={roles} value={item.role} />
  {/snippet}
</SettingsItemList>`
	},
	{
		slug: 'usage-meter',
		name: 'UsageMeter',
		category: 'Settings',
		sveltePath: 'src/lib/settings/controls/UsageMeter.svelte',
		upstreamSource: UPSTREAM,
		description:
			'Usage against a limit as role="meter" with value, range and value text. The tone follows thresholds (warning at 80%, danger at 100% by default) and is always said in words too ("Near the limit", "Over the limit", "8 seats left"). Supports unlimited, no data yet, a reset period, a marker tick (a pause floor), a projected value, stacked segments with a legend, a shared scale for a table of row meters, a compact tile, and one optional action. It reports nothing but that action; your app supplies the numbers.',
		usageSnippet: `<script lang="ts">
  import { UsageMeter, type MeterSegment } from 'agents-kit-svelte/settings';

  const seatsUsed = 42;
  const storage: MeterSegment[] = [
    { id: 'files', label: 'Files', value: 18.2, tone: 'accent' },
    { id: 'history', label: 'History', value: 6.4, tone: 'neutral' },
    { id: 'cache', label: 'Cache', value: 3.1, tone: 'muted' }
  ];
  const gb = (n: number) => \`\${n.toFixed(1)} GB\`;
</script>

<UsageMeter
  label="Seats"
  value={seatsUsed}
  limit={50}
  unit="seats"
  period={{ label: 'This month', resetsAt: '2026-12-01T00:00:00Z' }}
  action={{ label: 'Add seats', href: '/settings/billing#seats' }}
/>
<UsageMeter label="Storage" segments={storage} limit={30} format={gb} marker={{ value: 28.5, label: 'Uploads pause at' }} />`
	},
	{
		slug: 'copy-value',
		name: 'CopyValue',
		category: 'Settings',
		sveltePath: 'src/lib/settings/controls/CopyValue.svelte',
		upstreamSource: UPSTREAM,
		description:
			'A read-only value to copy (an ID, a URL, a command with a `$` prompt, a token), selectable before the page is ready. Copy feedback is announced politely; if the clipboard refuses, the text is selected so a keyboard copy works (a hidden value says to reveal it first). masked hides the value behind dots (it is not in the page until Reveal); showOnce adds a "You won\'t see this again" warning, a local Download, an optional acknowledgement and Done; expiresAt removes the value once passed. onCopy, onReveal, onDownload and onDone are notifications: copying and downloading happen locally, and the value never goes into data attributes, the URL, the console or storage.',
		usageSnippet: `<script lang="ts">
  import { CopyValue } from 'agents-kit-svelte/settings';

  // The secret your server just created: show it once, then forget it.
  let secret = $state<string | null>('whsec_example_value');
  const expiresAt = Date.now() + 15 * 60_000;

  function forget() {
    secret = null;
  }
</script>

<CopyValue label="Install command" prompt="$" value="npx example-cli connect" />
{#if secret}
  <CopyValue label="Signing secret" value={secret} showOnce requireAcknowledge {expiresAt} onDone={forget} />
{/if}`
	}
];
