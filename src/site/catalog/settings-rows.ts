import type { CatalogItemMeta } from '../catalog-registry.ts';

const UPSTREAM = 'Agents Kit Svelte · Settings';

/** Catalogue entries for the Settings collection (rows group): SettingsSection, SettingsRow, SettingsFacts, SettingsToggle, RequestedChange, LockReason. Category: 'Settings'. */
export const SETTINGS_ROWS: CatalogItemMeta[] = [
	{
		slug: 'settings-section',
		name: 'SettingsSection',
		category: 'Settings',
		sveltePath: 'src/lib/settings/rows/SettingsSection.svelte',
		upstreamSource: UPSTREAM,
		description:
			'The card every settings page is made of: a header with title, description, count, status badge and your actions, then a flush list of rows, an optional footer strip and a footnote. tone="danger" draws a danger zone; lock disables every row inside and explains why once in the header; aside puts an explainer beside the card on wide containers and below it on narrow ones; layout="columns" lays nested sections side by side, and a section inside a section becomes a sub-group with the next heading level. The empty snippet shows, even without JavaScript, while the list has no rows. It reports nothing: rows and controls report themselves.',
		usageSnippet: `<script lang="ts">
  import { SettingsRow, SettingsSection, SettingsToggle } from 'agents-kit-svelte/settings';
  import { Button } from 'agents-kit-svelte/primitives';

  async function saveDigest(on: boolean) {
    const response = await fetch('/api/settings/digest', { method: 'PUT', body: JSON.stringify({ on }) });
    if (!response.ok) return { error: "Couldn't save. Changed back." };
  }
</script>

<SettingsSection title="Notifications" description="What we tell you about, and where." count={2}>
  {#snippet actions()}
    <Button href="/settings/notifications/history" size="sm">History</Button>
  {/snippet}
  <SettingsToggle label="Weekly digest" checked={true} onCommit={saveDigest} />
  <SettingsRow label="Contact email" value="ada@example.com" action={{ label: 'Change', href: '?dialog=email' }} />
</SettingsSection>

<SettingsSection title="Danger zone" tone="danger">
  <SettingsRow label="Delete team" description="Deletes every document and member." action={{ label: 'Delete team', href: '?dialog=delete', tone: 'danger' }} />
</SettingsSection>`
	},
	{
		slug: 'settings-row',
		name: 'SettingsRow',
		category: 'Settings',
		sveltePath: 'src/lib/settings/rows/SettingsRow.svelte',
		upstreamSource: UPSTREAM,
		description:
			'One setting: label and description on the left, a control, read-only value or badge on the right, optional leading icon and trailing actions (more than two collapse into a menu, except links and form intents, which stay buttons). An action onSelect may return a promise (the button loads) or {error}; a failure or rejection shows in the row alert. Kit controls placed in it keep one label and are described by the description, status and lock reason. Inside a staged form, a row with name registers itself, so editing shows "Unsaved" and "was 90 days" plus the impact line, and form errors for that name appear in place. status shows saving, saved or an error for instant changes; lock disables the control and shows the reason (or points at a shared one with reasonId). Below 32rem it stacks; summary plus editHref swaps the control for a summary and an Edit link there. It reports nothing itself: the control does.',
		usageSnippet: `<script lang="ts">
  import { SettingsRow, SettingsSection } from 'agents-kit-svelte/settings';
  import { NativeSelect } from 'agents-kit-svelte/primitives';

  const options = [
    { value: '30', label: '30 days' },
    { value: '90', label: '90 days' },
    { value: '365', label: '1 year' }
  ];
  const days = (raw: string | string[]) => options.find((o) => o.value === raw)?.label ?? String(raw);
</script>

<!-- Inside a SettingsForm, the row registers "retention" and shows "was 90 days" after an edit. -->
<SettingsSection title="Data">
  <SettingsRow name="retention" label="Data retention" description="How long activity is kept." format={days} impact="Older activity is deleted tonight.">
    {#snippet control()}
      <NativeSelect name="retention" defaultValue="90" {options} />
    {/snippet}
  </SettingsRow>
  <SettingsRow label="Team ID" value="tm_8f3k2q9x" mono />
  <SettingsRow label="Audit export" lock={{ kind: 'plan', action: { label: 'Compare plans', href: '/plans' } }} value="Off" />
</SettingsSection>`
	},
	{
		slug: 'settings-facts',
		name: 'SettingsFacts',
		category: 'Settings',
		sveltePath: 'src/lib/settings/rows/SettingsFacts.svelte',
		upstreamSource: UPSTREAM,
		description:
			'Read-only facts as a description list: label and value side by side (stacked on narrow containers), or a grid of tiles. A fact can be monospace, carry a tone dot, a detail line, a "managed elsewhere" source caption, a shorter value for narrow containers, a copy button and one action (a link, a callback, or an unavailable action with its reason). Copying happens locally; onCopy(id, ok) says whether the clipboard took it, and a refused copy says so and shows the exact text to copy, selected. A callback action loads while its promise runs and shows a returned {error}, or a generic line when it rejects. Nothing is sent anywhere.',
		usageSnippet: `<script lang="ts">
  import { SettingsFacts, SettingsSection, type SettingsFact } from 'agents-kit-svelte/settings';

  const facts: SettingsFact[] = [
    { id: 'status', label: 'Status', value: 'Connected', tone: 'success' },
    { id: 'team-id', label: 'Team ID', value: 'tm_8f3k2q9x', mono: true, copy: true },
    { id: 'region', label: 'Region', value: 'Frankfurt', source: 'Set by your administrator' },
    { id: 'version', label: 'Version', value: '4.12.0', mono: true, detail: 'Released 3 days ago' }
  ];

  function copied(id: string, ok: boolean) {
    console.info(ok ? 'Copied ' + id : 'Copy refused for ' + id);
  }
</script>

<SettingsSection title="Connection" list={false}>
  <SettingsFacts items={facts} onCopy={copied} />
</SettingsSection>`
	},
	{
		slug: 'settings-toggle',
		name: 'SettingsToggle',
		category: 'Settings',
		sveltePath: 'src/lib/settings/rows/SettingsToggle.svelte',
		upstreamSource: UPSTREAM,
		description:
			'A boolean setting as a row with a switch. Outside a form it is instant: it applies at once and calls onCommit(checked); a promise shows Saving, a returned {error} or a rejection switches it back and says so with Retry, and success offers one Undo (onUndo, or onCommit with the old value). The bindable checked only ever holds saved values. Inside a SettingsForm it is staged and uncontrolled, posting name=false then true (read it with readBoolean). With action and no JavaScript it renders its own small post form with an Apply button. A switch flipped before the page is interactive is committed once it is. A lock disables it and shows the reason; lock.badge ("Always on") replaces the switch on screen while a disabled switch stays for assistive technology.',
		usageSnippet: `<script lang="ts">
  import { SettingsSection, SettingsToggle } from 'agents-kit-svelte/settings';

  let reduceMotion = $state(false);

  async function save(on: boolean) {
    const response = await fetch('/api/preferences/motion', { method: 'PUT', body: JSON.stringify({ on }) });
    if (!response.ok) return { error: "Couldn't save. Changed back." };
  }
</script>

<SettingsSection title="Accessibility">
  <SettingsToggle
    name="reduceMotion"
    label="Reduce motion"
    description="Fewer animations."
    bind:checked={reduceMotion}
    onCommit={save}
    action="/settings/accessibility"
  />
  <SettingsToggle label="Security alerts" checked lock={{ kind: 'readonly', badge: 'Always on' }} />
</SettingsSection>`
	},
	{
		slug: 'requested-change',
		name: 'RequestedChange',
		category: 'Settings',
		sveltePath: 'src/lib/settings/rows/RequestedChange.svelte',
		upstreamSource: UPSTREAM,
		description:
			'A change that waits for approval elsewhere (on a device, by an admin, at a provider): the value in effect against the value asked for, who it waits on, how long ago it was asked (with an injected now) and optional instructions. It offers Send again (onResend) and Cancel request (onCancelRequest), or posts intent=resend|cancel to action without JavaScript (hidden fields always ride in the query of action, so read them from url.searchParams; inside a SettingsForm without JavaScript the fields of the outer form go along, and with JavaScript the row posts its intent alone). It never shows success on click: approved, declined and expired appear only when your app passes a new status.',
		usageSnippet: `<script lang="ts">
  import { RequestedChange, SettingsSection } from 'agents-kit-svelte/settings';

  let status = $state<'awaiting' | 'approved' | 'declined' | 'expired'>('awaiting');
  const requestedAt = Date.now() - 12 * 60_000;

  async function resend() {
    await fetch('/api/requests/rq_1/resend', { method: 'POST' });
  }
  async function cancel() {
    await fetch('/api/requests/rq_1', { method: 'DELETE' });
  }
</script>

<SettingsSection title="Device limits">
  <RequestedChange label="Parallel runs" effective="2" requested="3" waitingOn="the device owner" {requestedAt} {status} onResend={resend} onCancelRequest={cancel} />
</SettingsSection>`
	},
	{
		slug: 'lock-reason',
		name: 'LockReason',
		category: 'Settings',
		sveltePath: 'src/lib/settings/rows/LockReason.svelte',
		upstreamSource: UPSTREAM,
		description:
			"The one explanation of why something cannot be changed: an icon per kind (permission, plan, managed, inherited, read-only, unsupported, awaiting approval), the reason or the kind's default sentence, who holds the lock, and a way forward: lock.action (Upgrade, Open the managing place) or a Request access button that calls onRequest and moves through sending, sent or failed. Its id names only the sentence, so any number of disabled controls can point aria-describedby at one visible reason. variant is inline, a boxed note, or hidden (screen-reader only).",
		usageSnippet: `<script lang="ts">
  import { LockReason, type SettingLock } from 'agents-kit-svelte/settings';
  import { Switch } from 'agents-kit-svelte/primitives';

  const lock: SettingLock = { kind: 'managed', reason: 'Managed by your organisation.', source: 'Northwind IT' };

  async function requestAccess() {
    await fetch('/api/access-requests', { method: 'POST', body: JSON.stringify({ setting: 'two-step' }) });
  }
</script>

<LockReason id="security-lock" variant="note" {lock} onRequest={requestAccess} />
<Switch label="Two-step sign-in" disabled aria-describedby="security-lock" />
<Switch label="Remember devices" disabled aria-describedby="security-lock" />`
	}
];
