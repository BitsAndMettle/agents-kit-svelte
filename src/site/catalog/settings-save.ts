import type { CatalogItemMeta } from '../catalog-registry.ts';

const UPSTREAM = 'Agents Kit Svelte · Settings';

/** Catalogue entries for the Settings collection (save group): SettingsForm, SaveBar, ChangeNotice, ConflictResolver, ConsequenceList, ConsequenceDialog. Category: 'Settings'. */
export const SETTINGS_SAVE: CatalogItemMeta[] = [
	{
		slug: 'settings-form',
		name: 'SettingsForm',
		category: 'Settings',
		sveltePath: 'src/lib/settings/save/SettingsForm.svelte',
		upstreamSource: UPSTREAM,
		description:
			'The staged settings form: a real <form method="post"> whose controls stay uncontrolled, so edits made before hydration still count. It works out what is unsaved by comparing the controls with their server-rendered defaults (or takes a controlled changes list), posts a hidden revision, and reports onSubmit(values, { changes, revision }); return {errors}, {error} or {conflict} and it shows them, keeping the draft. Rows and controls inside switch to staged mode and drop their own forms. While anything is unsaved it holds tab closes, and your router can call controller.guard.request(proceed) from beforeNavigate to get a "Save and leave / Leave / Keep editing" dialog. Your app saves with optimistic concurrency and re-renders with the new defaults.',
		usageSnippet: `<script lang="ts">
  import { SettingsForm, SaveBar, type SettingsDraft, type SettingsResult } from 'agents-kit-svelte/settings';

  let revision = $state(7);
  let controller = $state<SettingsDraft>();
  const fields = [
    { name: 'teamName', label: 'Team name' },
    { name: 'retention', label: 'Data retention' }
  ];

  async function save(values: Record<string, unknown>, context: { revision?: string | number }): Promise<SettingsResult | void> {
    const response = await fetch('/api/settings', { method: 'PUT', body: JSON.stringify({ ...values, revision: context.revision }) });
    if (response.status === 409) return { conflict: { message: 'Someone else saved these settings. Your changes are kept.' } };
    if (!response.ok) return { error: 'Could not save. Try again.' };
    revision += 1;
  }
</script>

<SettingsForm action="?/save" {fields} {revision} onSubmit={save} bind:controller>
  <label>Team name <input name="teamName" value="Northwind Studio" /></label>
  <label>
    Data retention
    <select name="retention">
      <option value="30">30 days</option>
      <option value="90" selected>90 days</option>
    </select>
  </label>
  <SaveBar layout="sticky" />
</SettingsForm>`
	},
	{
		slug: 'save-bar',
		name: 'SaveBar',
		category: 'Settings',
		sveltePath: 'src/lib/settings/save/SaveBar.svelte',
		upstreamSource: UPSTREAM,
		description:
			'The face of a staged form: "N unsaved changes", a short from → to summary (then "+N more"; hidden in a narrow container), an optional impact line, Discard (a native reset) and Save (a native submit, loading while it saves). It shows a failed save as an alert, a stale save as a conflict with Review (reviewHref or onReviewConflict), and a saved notice. Layouts: footer (always shown), sticky and floating (shown only while something is unsaved; floating sits at --ak-settings-bar-offset). Without JavaScript it always shows, with Save enabled. When its buttons go away, focus returns to the control edited last.',
		usageSnippet: `<script lang="ts">
  import { SettingsForm, SaveBar } from 'agents-kit-svelte/settings';

  const fields = [{ name: 'digest', label: 'Weekly digest' }];
  let reviewing = $state(false);
  async function save(): Promise<void> {
    await fetch('/api/notifications', { method: 'PUT' });
  }
</script>

<SettingsForm {fields} onSubmit={save}>
  <label><input type="checkbox" name="digest" checked /> Weekly digest</label>
  <SaveBar layout="floating" impact="Applies to everyone on the team." onReviewConflict={() => (reviewing = true)} />
</SettingsForm>`
	},
	{
		slug: 'change-notice',
		name: 'ChangeNotice',
		category: 'Settings',
		sveltePath: 'src/lib/settings/save/ChangeNotice.svelte',
		upstreamSource: UPSTREAM,
		description:
			'The inline result after an instant change or a finished action: a bold lead, a detail line, Undo, an optional second action and Dismiss, announced politely and never hidden on a timer. Undo is owned by a token: pass the token of this change and the token that owns the undo point now (an InstantSetting undoToken); once they differ, Undo is unavailable and says a newer change replaced it, so a stale notice can never reverse a newer change. It reports onUndo(token) (loading, then "Undone" or a failure) or, without JavaScript, posts intent=undo and token to undoAction. Your app keeps the snapshot. After Undo, focus stays on the notice; after Dismiss it moves to the next notice or the nearest control (refocus overrides).',
		usageSnippet: `<script lang="ts">
  import { ChangeNotice, InstantSetting } from 'agents-kit-svelte/settings';

  let saved = $state('comfortable');
  const density = new InstantSetting<string>({
    value: () => saved,
    commit: () => async (next) => {
      await fetch('/api/preferences', { method: 'PUT', body: JSON.stringify({ density: next }) });
    }
  });
  let shown = $state<number | undefined>(undefined);
</script>

<button type="button" onclick={() => density.set('compact').then(() => (shown = density.undoToken))}>Compact</button>
{#if shown !== undefined}
  <ChangeNotice
    lead="Density set to compact"
    detail="Lists now show more rows."
    undoToken={shown}
    currentToken={density.undoToken ?? null}
    onUndo={(token) => density.undo(token as number).then(() => undefined)}
    onDismiss={() => (shown = undefined)}
  />
{/if}`
	},
	{
		slug: 'conflict-resolver',
		name: 'ConflictResolver',
		category: 'Settings',
		sveltePath: 'src/lib/settings/save/ConflictResolver.svelte',
		upstreamSource: UPSTREAM,
		description:
			'The end of a stale save. For each setting someone else changed it shows your value against the latest one and a Keep choice: Yours, Latest, or Both where a merge makes sense (when Both is not offered, the reason is shown and linked). Each setting is one named radio group of native radios posting keep.<field>, so it works without JavaScript inside a SettingsForm or your own dialog form; the chosen side is highlighted. A table in a wide container, stacked groups in a narrow one. It reports onValueChange and can preview the merged result; your app merges and resubmits against the new revision.',
		usageSnippet: `<script lang="ts">
  import { ConflictResolver, type ConflictField, type ConflictKeep } from 'agents-kit-svelte/settings';

  const fields: ConflictField[] = [
    { name: 'teamName', label: 'Team name', mine: 'Northwind Design', theirs: 'Northwind Studio Ltd' },
    { name: 'channels', label: 'Channels', mine: 'Email, Chat', theirs: 'Email, Phone', allowBoth: true },
    { name: 'retention', label: 'Data retention', mine: '30 days', theirs: '1 year', bothReason: 'Only one retention period can apply.' }
  ];
  let keep = $state<Record<string, ConflictKeep>>({});
</script>

<form method="post" action="?/resolve">
  <ConflictResolver {fields} bind:value={keep} changedBy={{ name: 'Ben Ortiz', at: Date.now() - 5 * 60_000 }} />
  <button type="submit">Save with these choices</button>
</form>`
	},
	{
		slug: 'consequence-list',
		name: 'ConsequenceList',
		category: 'Settings',
		sveltePath: 'src/lib/settings/save/ConsequenceList.svelte',
		upstreamSource: UPSTREAM,
		description:
			'A list of effects whose tone is spoken, not only coloured: ok, no, warn and info each carry an icon and a screen-reader prefix ("Yes:", "No:", "Caution:", "Note:"), with an optional description and a short fact on the right. Pass one list (items) or titled groups that sit side by side once the settings container is wide (What changes / What stays, Can / Can\'t, Shared / Never shared). It reports nothing.',
		usageSnippet: `<script lang="ts">
  import { ConsequenceList, type ConsequenceGroup } from 'agents-kit-svelte/settings';

  const groups: ConsequenceGroup[] = [
    { label: 'Viewers can', items: [{ tone: 'ok', label: 'Open shared documents' }, { tone: 'ok', label: 'Leave comments' }] },
    { label: 'Viewers can’t', items: [{ tone: 'no', label: 'Edit or delete documents' }, { tone: 'no', label: 'Invite people' }] }
  ];
</script>

<ConsequenceList
  heading="What a viewer can do"
  {groups}
  headingLevel={3}
/>`
	},
	{
		slug: 'consequence-dialog',
		name: 'ConsequenceDialog',
		category: 'Settings',
		sveltePath: 'src/lib/settings/save/ConsequenceDialog.svelte',
		upstreamSource: UPSTREAM,
		description:
			'The confirmed change model: a consequence review inside a real <form method="post">, usually a route (?dialog=… opened by a link, closed by closeHref; Escape and the backdrop follow that link, and focus returns to the opener). It lists what happens and what stays, can ask who takes over each dependent (reassign: a select per item, posted as reassign.<id>, with a live summary), and can require a typed phrase for unrecoverable loss (native required and pattern, so the gate holds without JavaScript, and the button says why it is blocked). One filled danger button, a Cancel link and a footnote saying whether it can be undone; a bottom sheet on phones; ssrOpen renders it open on the server. It reports onConfirm({ typed, reassign, data }) or posts natively, and errors stay inside. Your server checks the phrase again and navigates on success. Other attributes and enhance go on its <form>. Inside a SettingsForm it never nests a form: its fields join a form of its own outside the page form, and without JavaScript Confirm posts the page form to its action with its intent, so there form attributes and enhance belong on the SettingsForm (other attributes are not applied, and development warns).',
		usageSnippet: `<script lang="ts">
  import { ConsequenceDialog, type SettingsResult } from 'agents-kit-svelte/settings';

  // In SvelteKit, derive this from page.url.searchParams.get('dialog').
  let open = $state(false);
  async function deleteTeam({ typed }: { typed?: string }): Promise<SettingsResult | void> {
    const response = await fetch('/api/team', { method: 'DELETE', body: JSON.stringify({ confirm: typed }) });
    if (!response.ok) return { error: 'The team could not be deleted. Nothing was changed.' };
    open = false;
  }
</script>

<a href="?dialog=delete-team">Delete team…</a>
<ConsequenceDialog
  bind:open
  ssrOpen
  closeHref="./"
  title="Delete Northwind Studio?"
  description="Everything in the team is deleted for everyone."
  consequences={[{ tone: 'no', label: 'All documents and their history are deleted' }, { tone: 'ok', label: 'Invoices stay with the billing contact' }]}
  confirmPhrase="Northwind Studio"
  confirmLabel="Delete team"
  reversible={false}
  onConfirm={deleteTeam}
/>`
	}
];
