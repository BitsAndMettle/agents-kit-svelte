<!--
	Browser-test fixture (tests/browser/settings/composed.spec.ts). Not part of the catalogue.
	Every Settings component composed the way an app would build one settings area, using only
	public props: a layout with navigation, search and attention; a page with a scope that locks
	everything when you view it as a viewer; instant controls; a staged SettingsForm with the same
	controls inside it, a conflict, and a typed-phrase danger action in route mode (`?dialog=`).
	The fake server answers after 600 ms; "Play a sound" always fails, and dismissing the storage
	attention item always answers with a conflict.
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import { beforeNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Bell, Building2, CreditCard, LifeBuoy, ScrollText, SlidersHorizontal, Sparkles, Trash2, UserRound, Users } from '@lucide/svelte';
	import { Button } from '$lib/primitives/actions';
	import { Input, NativeSelect } from '$lib/primitives/form';
	import {
		AttentionList,
		ChangeNotice,
		ChoiceCards,
		ConflictResolver,
		ConsequenceDialog,
		ConsequenceList,
		CopyValue,
		LockReason,
		NotificationMatrix,
		RequestedChange,
		SaveBar,
		SettingsFacts,
		SettingsForm,
		SettingsItemList,
		SettingsLayout,
		SettingsPage,
		SettingsRow,
		SettingsSearch,
		SettingsSection,
		SettingsToggle,
		UsageMeter,
		rememberOpener,
		type AttentionItem,
		type ChoiceOption,
		type ConflictKeep,
		type ConsequenceGroup,
		type NotificationChannel,
		type NotificationEvent,
		type SettingLock,
		type SettingsChange,
		type SettingsDraft,
		type SettingsFact,
		type SettingsItem,
		type SettingsItemAction,
		type SettingsNavGroup,
		type SettingsPageScope,
		type SettingsResult,
		type SettingsSearchEntry,
		type SettingsSubmitContext,
		type SettingsValues
	} from '$lib/settings';

	/** The fake server: every call answers after 600 ms. */
	const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 600));
	/** A fixed clock, so the server render and the browser agree on "12 min ago". */
	const NOW = Date.UTC(2026, 10, 12, 9, 30);

	// ---- Fixture harness (not part of the composition) ----
	let viewer = $state(false);
	let someoneSavesFirst = $state(false);
	let rejectRole = $state(false);
	let log = $state('');

	// ---- Routing: the app's, not the kit's ----
	/** The section in the URL (`?section=`). Read only in the browser: the page is prerendered. */
	const section = $derived(browser ? (page.url.searchParams.get('section') ?? 'workspace') : 'workspace');
	const current = $derived(section === '' ? null : section);
	/** Route mode for the confirmed action: open while the URL says `?dialog=delete-workspace`. */
	const deleteOpen = $derived(browser && page.url.searchParams.get('dialog') === 'delete-workspace');
	const CLOSE_HREF = '?section=workspace';

	let controller = $state<SettingsDraft>();
	let unsaved = $state<SettingsChange[]>([]);

	// Leaving the section with unsaved changes asks first. Opening or closing the dialog route
	// (same section) is not leaving.
	beforeNavigate((navigation) => {
		if (navigation.type === 'leave' || !controller || !navigation.to) return;
		const from = navigation.from?.url;
		const to = navigation.to.url;
		if (from && to.pathname === from.pathname && (to.searchParams.get('section') ?? 'workspace') === (from.searchParams.get('section') ?? 'workspace')) return;
		if (controller.guard.request(() => void goto(to))) navigation.cancel();
	});

	// ---- Navigation, search, attention ----

	const entries: SettingsSearchEntry[] = [
		{ id: 'sound', label: 'Play a sound', section: 'Workspace', href: '#preferences', keywords: ['chime', 'audio'] },
		{ id: 'density', label: 'Density', section: 'Workspace', href: '#preferences', keywords: ['compact', 'spacing'] },
		{ id: 'notify', label: 'Notify me', section: 'Workspace', href: '#notifications', keywords: ['email', 'alerts'] },
		{ id: 'members', label: 'Members', section: 'Workspace', href: '#members', keywords: ['people', 'remove'] },
		{ id: 'name', label: 'Workspace name', section: 'Workspace', href: '#policy', keywords: ['rename'] },
		{ id: 'retention', label: 'Data retention', section: 'Workspace', href: '#policy', description: 'How long activity is kept.', keywords: ['history', 'privacy'] },
		{ id: 'approvers', label: 'Approvers', section: 'Workspace', href: '#approvers' },
		{ id: 'delete', label: 'Delete workspace', section: 'Workspace', href: '#danger' }
	];

	let dismissed = $state<string[]>([]);
	const attention = $derived<AttentionItem[]>(
		[
			...(unsaved.length
				? [{ id: 'unsaved', tone: 'accent' as const, label: 'Unsaved policy changes', description: `${unsaved.length === 1 ? '1 change is' : `${unsaved.length} changes are`} not saved yet.`, action: { label: 'Review', href: '#policy' } }]
				: []),
			{ id: 'seats', tone: 'warning' as const, label: 'Seats almost full', description: '46 of 50 seats are in use.', action: { label: 'See usage', href: '#usage' }, dismissible: true },
			{ id: 'region', tone: 'neutral' as const, label: 'A storage change is waiting', description: 'An administrator has to approve it.', action: { label: 'Open', href: '#region' }, dismissible: true }
		].filter((item) => !dismissed.includes(item.id))
	);
	/** The storage item cannot be dismissed: someone acted on it first (a conflict, not an error). */
	async function dismiss(id: string): Promise<SettingsResult | void> {
		await wait();
		if (id === 'region') return { conflict: { message: 'An administrator answered this a moment ago. Reload to see it.' } };
		dismissed = [...dismissed, id];
	}

	// ---- The page scope ----
	let accessRequested = $state(false);
	async function requestAccess(): Promise<void> {
		await wait();
		accessRequested = true;
	}
	const VIEWER_LOCK: SettingLock = { kind: 'permission', reason: 'Only admins can change workspace settings.', source: 'Set by the workspace owner' };
	const scope = $derived<SettingsPageScope>(
		viewer
			? {
					label: 'Read-only for your role',
					description: 'You can see how this workspace is set up, but only admins can change it.',
					tone: 'warning',
					lock: VIEWER_LOCK,
					actions: [accessRequested ? { label: 'Access requested', unavailable: 'An admin has your request.' } : { label: 'Request access', tone: 'accent', intent: 'request-access', onSelect: requestAccess }]
				}
			: { label: 'Test workspace', description: 'Changes here only affect this page.', tone: 'accent' }
	);

	// ---- Instant controls ----
	let compact = $state(false);
	let sound = $state(false);
	let density = $state('default');
	const DENSITIES: ChoiceOption[] = [
		{ value: 'compact', label: 'Compact' },
		{ value: 'default', label: 'Default' },
		{ value: 'spacious', label: 'Spacious' }
	];
	async function saveOk(): Promise<void> {
		await wait();
	}
	/** The one failing input. */
	async function saveSound(): Promise<SettingsResult> {
		await wait();
		return { error: "Couldn't change sounds. Changed back." };
	}

	const EVENTS: NotificationEvent[] = [
		{ id: 'mention', label: 'Mentions', description: 'Someone mentions you.' },
		{ id: 'reply', label: 'Replies' },
		{ id: 'security', label: 'Security alerts', description: 'New sign-ins.' }
	];
	const CHANNELS: NotificationChannel[] = [
		{ id: 'app', label: 'In app', icon: Bell },
		{ id: 'email', label: 'Email' },
		{ id: 'text', label: 'Text', unavailable: 'Add a verified phone number first.' }
	];
	let notify = $state(['mention:app', 'mention:email', 'reply:app']);
	const NOTIFY_LOCKED = { 'security:email': { checked: true, reason: 'Needed to keep your account safe.' } };

	type Member = SettingsItem & { role?: string };
	const ROLES = [
		{ value: 'admin', label: 'Admin' },
		{ value: 'member', label: 'Member' },
		{ value: 'viewer', label: 'Viewer' }
	];
	let members = $state<Member[]>([
		{ id: 'm1', label: 'Ada Park', avatar: { name: 'Ada Park' }, meta: ['ada@example.com'], current: true, role: 'admin' },
		{ id: 'm2', label: 'Ben Ortiz', avatar: { name: 'Ben Ortiz' }, meta: ['ben@example.com'], role: 'admin' },
		{ id: 'm3', label: 'Chloe Martin', avatar: { name: 'Chloe Martin' }, meta: ['chloe@example.com'], role: 'member' },
		{ id: 'm4', label: 'Dev Rao', avatar: { name: 'Dev Rao' }, meta: ['dev@example.com'], role: 'viewer' },
		{ id: 'i1', label: 'eli@example.com', group: 'invited', meta: ['Invited 2 days ago'] }
	]);
	const invited = $derived(members.filter((m) => m.group === 'invited'));

	const groups = $derived<SettingsNavGroup[]>([
		{
			id: 'you',
			label: 'You',
			items: [
				{ id: 'profile', label: 'Profile', href: '?section=profile', icon: UserRound, description: 'Your name and contact email.' },
				{ id: 'preferences', label: 'Preferences', href: '?section=preferences', icon: SlidersHorizontal, description: 'Sounds, density and lists.' }
			]
		},
		{
			id: 'team',
			label: 'Team',
			items: [
				{ id: 'workspace', label: 'Workspace', href: '?section=workspace', icon: Building2, description: 'Policy, members and usage.', dirty: unsaved.length > 0 },
				{ id: 'members', label: 'Members', href: '?section=members', icon: Users, meta: `${members.length} people`, badge: invited.length || undefined },
				{ id: 'billing', label: 'Billing', href: '?section=billing', icon: CreditCard, lock: 'permission' },
				{ id: 'audit', label: 'Audit log', href: '?section=audit', icon: ScrollText, disabled: 'Available on the larger plan.' }
			]
		}
	]);
	function memberActions(item: Member): SettingsItemAction[] {
		if (item.current) return [];
		return [
			{
				id: 'remove',
				label: 'Remove',
				ariaLabel: `Remove ${item.label}`,
				tone: 'danger',
				confirm: { title: `Remove ${item.label}?`, description: 'They lose access at once. You can undo this for a while.', confirmLabel: 'Remove' }
			}
		];
	}

	interface Notice {
		key: number;
		lead: string;
		detail?: string;
		token?: number;
		restore?: { item: Member; index: number };
	}
	let notices = $state<Notice[]>([]);
	let noticeKey = 0;
	/** The newest removal owns the undo point; older notices show Undo as superseded. */
	let undoOwner = $state<number | null>(null);

	async function onMemberAction(actionId: string, item: Member): Promise<void> {
		await wait();
		if (actionId !== 'remove') return;
		const index = members.findIndex((m) => m.id === item.id);
		members = members.filter((m) => m.id !== item.id);
		const key = ++noticeKey;
		undoOwner = key;
		notices = [{ key, lead: `${item.label} removed`, detail: 'They no longer have access.', token: key, restore: { item, index } }, ...notices].slice(0, 3);
	}
	async function undoRemoval(notice: Notice): Promise<void> {
		await wait();
		if (!notice.restore) return;
		const next = [...members];
		next.splice(Math.min(notice.restore.index, next.length), 0, notice.restore.item);
		members = next;
		undoOwner = null;
	}
	function setRole(item: Member, role: string): void {
		members = members.map((m) => (m.id === item.id ? { ...m, role } : m));
	}

	let requestStatus = $state<'awaiting' | 'approved' | 'declined' | 'expired'>('awaiting');
	async function cancelRequest(): Promise<void> {
		await wait();
		requestStatus = 'declined';
	}

	const FACTS: SettingsFact[] = [
		{ id: 'created', label: 'Created', value: '4 February 2026', detail: 'By Ada Park' },
		{ id: 'workspace-id', label: 'Workspace ID', value: 'ws_8f3k2q9x', mono: true, copy: true },
		{ id: 'region', label: 'Storage region', value: 'Europe', source: 'Set by your administrator' }
	];

	const SECURITY_LOCK: SettingLock = { kind: 'managed', reason: 'Sign-in rules are set for every workspace in your organisation.', source: 'Set by your administrator' };

	// ---- The staged form ----
	const RETENTION = [
		{ value: '30', label: '30 days' },
		{ value: '90', label: '90 days' },
		{ value: '365', label: '1 year' }
	];
	const retentionText = (raw: string | string[]) => RETENTION.find((r) => r.value === raw)?.label ?? String(raw);
	const ROLE_OPTIONS: ChoiceOption[] = [
		{ value: 'viewer', label: 'Viewer', description: 'Can see everything, change nothing.' },
		{ value: 'member', label: 'Member', description: 'Can create and edit.' },
		{ value: 'admin', label: 'Admin', description: 'Can manage people and settings.', lock: { kind: 'plan', reason: 'Admin as the default role needs the larger plan.', badge: 'Larger plan' } }
	];
	const TEAM_EVENTS: NotificationEvent[] = [
		{ id: 'joined', label: 'Someone joins' },
		{ id: 'left', label: 'Someone leaves' }
	];
	const TEAM_CHANNELS: NotificationChannel[] = [
		{ id: 'email', label: 'Email' },
		{ id: 'app', label: 'In app' }
	];
	const POLICY_EFFECTS: ConsequenceGroup[] = [
		{ label: 'What saving changes', items: [{ tone: 'warn', label: 'A shorter retention deletes older activity tonight' }, { tone: 'info', label: 'New members get the default role' }] },
		{ label: 'What stays', items: [{ tone: 'ok', label: 'Existing members keep their roles' }] }
	];
	/** The staged selection list does not describe itself to the draft: the form does. */
	const fields = [{ name: 'approvers', label: 'Approvers', format: (raw: string | string[]) => (Array.isArray(raw) ? raw : raw ? [raw] : []).map((id) => members.find((m) => m.id === id)?.label ?? id).join(', ') || 'Nobody' }];

	let revision = $state(4);
	/** What "someone else" saved, when the harness says they save first. */
	const LATEST = { workspaceName: 'Harbor Team Ltd', retention: '365' };

	async function savePolicy(values: SettingsValues, context: SettingsSubmitContext): Promise<SettingsResult | void> {
		await wait();
		const name = String(values.workspaceName ?? '').trim();
		if (!name) return { errors: { workspaceName: 'Enter a workspace name.' } };
		if (rejectRole) return { errors: { defaultRole: 'Pick a role your plan allows.' } };
		if (someoneSavesFirst && Number(context.revision) === revision) {
			someoneSavesFirst = false;
			revision += 1;
			return {
				conflict: {
					message: 'Ben Ortiz saved this policy a moment ago. Your changes are kept: choose what to keep, then save again.',
					revision,
					changedBy: { name: 'Ben Ortiz', at: NOW - 5 * 60_000 },
					fields: [
						{ name: 'workspaceName', label: 'Workspace name', mine: name, theirs: LATEST.workspaceName },
						{ name: 'retention', label: 'Data retention', mine: retentionText(String(values.retention)), theirs: retentionText(LATEST.retention), bothReason: 'Only one retention period can apply.' }
					]
				}
			};
		}
		const keep = Object.entries(values)
			.filter(([key]) => key.startsWith('keep.'))
			.map(([key, value]) => `${key.slice(5)}=${String(value)}`);
		revision = Number(context.revision) + 1;
		log = `Saved revision ${revision}: ${context.changes.map((c) => `${c.label} → ${c.to}`).join(', ') || 'no changes'}${keep.length ? ` (kept ${keep.join(', ')})` : ''}`;
		const key = ++noticeKey;
		notices = [{ key, lead: 'Workspace policy saved', detail: context.changes.map((c) => c.label).join(', ') || undefined }, ...notices].slice(0, 3);
	}

	let conflictKeep = $state<Record<string, ConflictKeep>>({});

	async function deleteWorkspace(context: { typed?: string }): Promise<void> {
		await wait();
		log = `Deletion scheduled (typed “${context.typed}”)`;
		await goto(CLOSE_HREF, { noScroll: true, keepFocus: true });
	}
</script>

{#snippet search()}
	<SettingsSearch {entries} shortcut="/" data-testid="composed-search" />
{/snippet}

<!-- The same list twice: the layout shows its slot only atop the narrow index, so a wide page renders it again, one heading level up. -->
{#snippet attentionInNav()}
	<AttentionList items={attention} onDismiss={dismiss} headingLevel={current ? 3 : 2} data-testid="composed-attention" />
{/snippet}

{#snippet help()}
	<a href="?section=help" class="inline-flex items-center gap-2 rounded-control px-2 py-1.5 text-[13px] text-fg-light no-underline hover:text-fg-main"><LifeBuoy aria-hidden="true" class="size-4" />Help</a>
{/snippet}

{#snippet noticeBanner()}
	{#if notices.length}
		<div class="grid gap-2" data-testid="composed-notices">
			{#each notices as notice (notice.key)}
				<ChangeNotice
					lead={notice.lead}
					detail={notice.detail}
					undoToken={notice.token}
					currentToken={notice.token === undefined ? undefined : undoOwner}
					onUndo={notice.restore ? () => undoRemoval(notice) : undefined}
					onDismiss={() => (notices = notices.filter((n) => n.key !== notice.key))}
				/>
			{/each}
		</div>
	{/if}
{/snippet}

{#snippet roleReadout(value: string | null)}
	{ROLE_OPTIONS.find((o) => o.value === value)?.description ?? 'Pick a role for people who join.'}
{/snippet}

<main class="min-h-svh bg-canvas-primary text-fg-main">
	<div class="flex flex-wrap items-center gap-4 border-b border-canvas-border px-4 py-2 text-xs text-fg-light" data-testid="composed-harness">
		<strong class="font-semibold text-fg-main">Composed settings fixture</strong>
		<label class="inline-flex items-center gap-1.5"><input type="checkbox" bind:checked={viewer} data-testid="as-viewer" /> View as a viewer</label>
		<label class="inline-flex items-center gap-1.5"><input type="checkbox" bind:checked={someoneSavesFirst} data-testid="someone-saves" /> Someone else saves first</label>
			<label class="inline-flex items-center gap-1.5"><input type="checkbox" bind:checked={rejectRole} data-testid="reject-role" /> Reject the default role</label>
		<span class="ml-auto" aria-live="polite" data-testid="composed-log">{log}</span>
	</div>

	<SettingsLayout {groups} {current} filter={{ value: '' }} navHeader={search} navFooter={help} attention={attention.length ? attentionInNav : undefined} headingLevel={current ? 2 : 1} labels={{ title: 'Settings' }}>
		{#if current === 'workspace'}
			<SettingsPage title="Workspace" lead="How this workspace works for everyone in it." icon={Building2} backHref="?section=" {scope} banner={noticeBanner} width="lg" footnote="Changes on this page apply to every member." data-testid="composed-page">
				<AttentionList items={attention} onDismiss={dismiss} headingLevel={2} data-testid="composed-attention" />

				<!-- Instant: each change applies on its own. -->
				<SettingsSection id="preferences" title="Preferences" description="Applies at once, with Undo.">
					<SettingsToggle label="Compact lists" description="Tighter rows, more on screen." bind:checked={compact} onCommit={saveOk} stateText>
						{#snippet leading()}<span class="inline-flex size-8 items-center justify-center rounded-control bg-canvas-secondary"><Sparkles class="size-4" aria-hidden="true" /></span>{/snippet}
					</SettingsToggle>
					<SettingsToggle label="Play a sound" description="A short chime when something finishes." bind:checked={sound} onCommit={saveSound} data-testid="sound-toggle" />
					<!-- ChoiceCards names itself from the row label (aria-labelledby): no <label for>, and not `group` (see the staged row). -->
					<SettingsRow label="Density" description="How much fits on one screen." labelFor={false}>
						{#snippet control()}
							<ChoiceCards name="density" variant="segmented" options={DENSITIES} bind:value={density} onCommit={saveOk} />
						{/snippet}
					</SettingsRow>
					<SettingsRow label="Workspace ID" description="Quote it when you ask for help.">
						{#snippet control()}
							<CopyValue label="Workspace ID" hideLabel value="ws_8f3k2q9x" size="sm" />
						{/snippet}
					</SettingsRow>
				</SettingsSection>

				<SettingsSection id="notifications" title="Notify me" description="Each cell saves on its own." list={false}>
					<div class="px-4 py-3">
						<NotificationMatrix events={EVENTS} channels={CHANNELS} locked={NOTIFY_LOCKED} bind:value={notify} onCellCommit={saveOk} columnToggle labels={{ caption: 'Notify me' }} />
					</div>
				</SettingsSection>

				<SettingsItemList
					id="members"
					title="Members"
					headingLevel={2}
					count={members.filter((m) => !m.group).length}
					description="People in this workspace and their roles."
					items={members}
					groups={[{ id: 'invited', label: 'Invited', description: 'Invites expire after 7 days.' }]}
					actions={memberActions}
					onAction={onMemberAction}
					filter={{ name: 'member', hidden: { section: 'workspace' } }}
					addAction={{ label: 'Invite people', href: '?section=members' }}
					labels={{ current: 'You' }}
					data-testid="composed-members"
				>
					{#snippet trailing(item)}
						{#if item.role}
							<NativeSelect variant="pill" size="sm" aria-label="Role for {item.label}" options={ROLES} value={item.role} disabled={item.current} onValueChange={(role) => setRole(item, role)} />
						{/if}
					{/snippet}
				</SettingsItemList>

				<SettingsSection id="usage" title="Usage and details" list={false}>
					<div class="grid gap-5 px-4 py-4">
						<UsageMeter label="Seats" value={46} limit={50} unit="seats" period={{ label: 'This month', resetsAt: Date.UTC(2026, 11, 1) }} now={NOW} action={{ label: 'Add seats', onSelect: wait }} />
						<SettingsFacts items={FACTS} />
					</div>
				</SettingsSection>

				<SettingsSection id="region" title="Storage">
					<RequestedChange
						label="Storage region"
						description="Moving data needs an administrator's approval."
						effective="Europe"
						requested="North America"
						waitingOn="an administrator"
						requestedAt={NOW - 12 * 60_000}
						now={NOW}
						status={requestStatus}
						onResend={saveOk}
						onCancelRequest={cancelRequest}
					/>
				</SettingsSection>

				<SettingsSection id="security" title="Sign-in security" description="One reason describes all three rows.">
					<li class="list-none px-4 pt-3"><LockReason id="composed-security-lock" variant="note" lock={SECURITY_LOCK} /></li>
					<SettingsToggle label="Two-step sign-in" description="Ask for a code on new devices." checked={true} onCommit={saveOk} lock={SECURITY_LOCK} reasonId="composed-security-lock" />
					<SettingsRow label="Session length" lock={SECURITY_LOCK} reasonId="composed-security-lock">
						{#snippet control()}
							<NativeSelect value="7" options={[{ value: '1', label: '1 day' }, { value: '7', label: '7 days' }]} class="w-full @lg/settings:w-32" />
						{/snippet}
					</SettingsRow>
					<SettingsRow label="Recovery codes" description="Ten one-time codes." value="8 of 10 left" actions={[{ label: 'Regenerate', onSelect: wait }, { label: 'View', href: '?section=workspace&dialog=recovery-codes' }]} />
				</SettingsSection>

				<!-- Staged: everything below waits for Save. -->
				<SettingsForm
					action="?/policy"
					{fields}
					{revision}
					onSubmit={savePolicy}
					onDirtyChange={(changes) => (unsaved = changes)}
					bind:controller
					aria-label="Workspace policy"
					data-testid="composed-form"
					class="grid gap-5"
				>
					{#snippet children(draft)}
						{#if draft.conflict?.fields?.length}
							<SettingsSection id="conflict" title="Someone else saved this policy" description={draft.conflict.message} list={false}>
								<div class="px-4 py-3">
									<ConflictResolver fields={draft.conflict.fields} changedBy={draft.conflict.changedBy} now={NOW} bind:value={conflictKeep} />
								</div>
							</SettingsSection>
						{/if}

						<SettingsSection id="policy" title="Policy" description="Applies to everyone when you save." asideTitle="Before you save">
							<SettingsRow name="workspaceName" label="Workspace name" description="Shown on invites." required>
								{#snippet control()}
									<Input name="workspaceName" defaultValue="Harbor Team" required maxlength={40} class="w-full @lg/settings:w-56" />
								{/snippet}
							</SettingsRow>
							<SettingsRow name="retention" label="Data retention" description="How long activity is kept." format={retentionText} impact="Older activity is deleted the night after you save.">
								{#snippet control()}
									<NativeSelect name="retention" defaultValue="90" options={RETENTION} class="w-full @lg/settings:w-36" />
								{/snippet}
							</SettingsRow>
							<SettingsToggle name="guests" label="Allow guests" description="Members can invite people from outside." defaultChecked={false} />
							<!-- Not `group`: a group row hides its label id, and staged ChoiceCards then throws reading it. `name` describes the radios to the draft and shows its field error. -->
							<SettingsRow name="defaultRole" label="Default role" description="What people get when they join." labelFor={false} layout="stacked">
								{#snippet control()}
									<ChoiceCards name="defaultRole" variant="rows" options={ROLE_OPTIONS} defaultValue="member" readout={roleReadout} />
								{/snippet}
							</SettingsRow>
							{#snippet aside()}
								<ConsequenceList groups={POLICY_EFFECTS} columns={1} size="sm" headingLevel={3} />
							{/snippet}
						</SettingsSection>

						<SettingsSection title="Team notices" description="Who hears about people joining and leaving." list={false}>
							<div class="px-4 py-3">
								<NotificationMatrix events={TEAM_EVENTS} channels={TEAM_CHANNELS} name="teamNotify" defaultValue={['joined:email', 'left:email']} labels={{ caption: 'Team notices' }} />
							</div>
						</SettingsSection>

						<SettingsItemList
							id="approvers"
							title="Approvers"
							headingLevel={2}
							description="Who can approve storage changes."
							items={members.filter((m) => !m.group)}
							selectable
							name="approvers"
							defaultValue={['m1', 'm2']}
							filter={{ name: 'approver' }}
							labels={{ current: 'You' }}
							data-testid="composed-approvers"
						/>

						<SettingsSection title="Plan" list={false}>
							<div class="grid gap-4 px-4 py-4">
								<UsageMeter label="Storage" value={18.2} limit={30} format={(n) => `${n.toFixed(1)} GB`} description="Uploads pause before the limit." />
								<CopyValue label="Invite link" value="https://example.com/join/7QX2-PL4M" mono={false} size="sm" />
							</div>
						</SettingsSection>

						<SettingsSection id="danger" title="Danger zone" tone="danger">
							<!-- A SettingsAction cannot carry rememberOpener, so the opener is the control slot's own link. -->
							<SettingsRow label="Delete workspace" description="Deletes everything for everyone." labelFor={false}>
								{#snippet control(attrs)}
									<Button href="?section=workspace&dialog=delete-workspace" variant="danger" size="sm" aria-describedby={attrs['aria-describedby']} {@attach rememberOpener('delete-workspace')}>Delete workspace…</Button>
								{/snippet}
							</SettingsRow>
						</SettingsSection>

						<ConsequenceDialog
							open={deleteOpen}
							closeHref={CLOSE_HREF}
							openerKey="delete-workspace"
							title="Delete Harbor Team?"
							description="Everything in this workspace is deleted for everyone, now and for good."
							icon={Trash2}
							consequences={[
								{ tone: 'no', label: 'All documents and their history are deleted', aside: '18.2 GB' },
								{ tone: 'no', label: `${members.length} people lose access at once` },
								{ tone: 'ok', label: 'Invoices stay with the billing contact' }
							]}
							confirmPhrase="Harbor Team"
							confirmLabel="Delete workspace"
							reversible={false}
							action="?/delete"
							intent="delete-workspace"
							onConfirm={deleteWorkspace}
						>
							{#snippet identity()}<span class="font-medium">Harbor Team</span> <span class="text-fg-light">· {members.length} people · 18.2 GB</span>{/snippet}
						</ConsequenceDialog>

						<SaveBar layout="sticky" impact="Members see the new policy the next time they open the workspace." reviewHref="#conflict" />
					{/snippet}
				</SettingsForm>
			</SettingsPage>
		{:else if current}
			<SettingsPage title={groups.flatMap((g) => g.items).find((l) => l.id === current)?.label ?? 'Settings'} backHref="?section=" lead="This fixture builds only the Workspace page.">
				<p class="m-0 text-[13px]"><a href="?section=workspace">Back to Workspace</a></p>
			</SettingsPage>
		{/if}
	</SettingsLayout>
</main>
