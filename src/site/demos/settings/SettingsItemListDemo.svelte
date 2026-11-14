<script lang="ts">
	import { Archive, FileArchive, Folder, FolderLock, Palette } from '@lucide/svelte';
	import { NativeSelect, Switch } from '$lib/primitives/form';
	import { SettingsItemList } from '$lib/settings/controls';
	import type { SettingsItem, SettingsItemAction, SettingsResult } from '$lib/settings/shared';
	import { SAMPLE_SETTINGS_MEMBERS } from '$lib/fixtures/settings';

	/** A slow server: answers after 600 ms. */
	const wait = (ms = 600) => new Promise<void>((resolve) => setTimeout(resolve, ms));

	// ---- Members: a role pill per row and an invited sub-group. ----
	type Member = SettingsItem & { role?: string };
	const ROLES = [
		{ value: 'owner', label: 'Owner', disabled: true },
		{ value: 'admin', label: 'Admin' },
		{ value: 'member', label: 'Member' },
		{ value: 'viewer', label: 'Viewer' }
	];
	const startMembers = (): Member[] =>
		SAMPLE_SETTINGS_MEMBERS.map((m) => ({
			...m,
			meta: m.meta?.filter((x) => !['Admin', 'Member'].includes(x)),
			role: m.id === 'm1' ? 'owner' : m.id === 'm2' ? 'admin' : m.group ? undefined : 'member'
		}));
	let members = $state<Member[]>(startMembers());
	let log = $state('');

	function memberActions(item: Member): SettingsItemAction[] {
		if (item.group === 'invited') {
			return [
				{ id: 'resend', label: 'Resend', ariaLabel: `Resend invite to ${item.label}` },
				{ id: 'revoke', label: 'Revoke', ariaLabel: `Revoke invite to ${item.label}`, tone: 'danger' }
			];
		}
		return [
			{ id: 'transfer', label: 'Make owner' },
			{ id: 'reset', label: 'Reset sign-in' },
			{
				id: 'remove',
				label: 'Remove',
				tone: 'danger',
				// Without JavaScript, Remove opens the confirmation route instead of posting at once.
				href: `?dialog=remove-member&member=${encodeURIComponent(item.id)}`,
				confirm: { title: `Remove ${item.label}?`, description: 'They lose access to every document at once. You can invite them again later.', confirmLabel: 'Remove' }
			}
		];
	}
	/** Removing Dev Rao fails, so a per-row failure can be seen. */
	async function onMemberAction(actionId: string, item: Member): Promise<void | SettingsResult> {
		await wait();
		if (actionId === 'remove' || actionId === 'revoke') {
			if (item.id === 'm4') throw new Error('refused');
			members = members.filter((m) => m.id !== item.id);
		}
		log = `${actionId}: ${item.label}`;
	}
	function setRole(item: Member, role: string): void {
		members = members.map((m) => (m.id === item.id ? { ...m, role } : m));
		log = `role: ${item.label} → ${role}`;
	}

	// ---- Shared folders: a switch per row and an add footer with a reason. ----
	type Source = SettingsItem & { synced: boolean };
	let folders = $state<Source[]>([
		{ id: 'brand', label: 'Brand assets', icon: Palette, meta: ['412 files', 'Synced 2 min ago'], status: { label: 'Healthy', tone: 'success' }, synced: true },
		{ id: 'briefs', label: 'Client briefs', icon: Folder, meta: ['86 files'], status: { label: 'Paused', tone: 'warning' }, synced: false },
		{ id: 'legal', label: 'Contracts', icon: FolderLock, meta: ['24 files'], lock: { kind: 'permission', reason: 'Only the legal team can change syncing for this folder.' }, synced: true }
	]);

	// ---- Stored exports: select several, locked rows, a size summary. ----
	const SIZES: Record<string, number> = { e1: 1.2, e2: 0.9, e3: 0.8, e4: 2.1, e5: 0.4 };
	let exports = $state<SettingsItem[]>([
		{ id: 'e1', label: 'export-2026-10-01.zip', mono: true, icon: FileArchive, meta: ['1.2 GB', '6 weeks ago'] },
		{ id: 'e2', label: 'export-2026-09-01.zip', mono: true, icon: FileArchive, meta: ['0.9 GB', '10 weeks ago'] },
		{ id: 'e3', label: 'export-2026-08-01.zip', mono: true, icon: FileArchive, meta: ['0.8 GB', '3 months ago'] },
		{ id: 'e4', label: 'export-2026-11-01.zip', mono: true, icon: Archive, meta: ['2.1 GB', '2 weeks ago'], lock: { kind: 'readonly', reason: 'In use by a scheduled transfer.' } },
		{ id: 'e5', label: 'export-2026-11-10.zip', mono: true, icon: FileArchive, meta: ['0.4 GB', '2 days ago'], isNew: true }
	]);
	let selected = $state<string[]>(['e1', 'e2']);
	const summary = (ids: string[]) => `${ids.length} selected · frees ${ids.reduce((sum, id) => sum + (SIZES[id] ?? 0), 0).toFixed(1)} GB`;
	async function deleteExports(_action: string, ids: string[]): Promise<void> {
		await wait();
		exports = exports.filter((e) => !ids.includes(e.id));
		selected = selected.filter((id) => !ids.includes(id));
	}

	function resetAll(): void {
		members = startMembers();
		log = '';
	}
</script>

<div class="@container/settings mx-auto flex w-full max-w-3xl flex-col gap-4">
	<SettingsItemList
		title="Members"
		count={members.filter((m) => !m.group).length}
		description="People in Northwind Studio and their roles."
		items={members}
		groups={[{ id: 'invited', label: 'Invited', description: 'Invites expire after 7 days.' }]}
		filter={{ name: 'q' }}
		actions={memberActions}
		onAction={onMemberAction}
		formAction="/settings-demo/members"
		labels={{ current: 'You' }}
		data-testid="il-members"
	>
		{#snippet trailing(item)}
			{#if item.role}
				<NativeSelect variant="pill" size="sm" aria-label="Role for {item.label}" options={ROLES} value={item.role} disabled={item.role === 'owner'} onValueChange={(role) => setRole(item, role)} />
			{/if}
		{/snippet}
		{#snippet headerActions()}
			<button type="button" class="text-xs text-fg-light underline-offset-2 hover:underline" onclick={resetAll}>Reset demo</button>
		{/snippet}
	</SettingsItemList>
	<p class="-mt-2 m-0 text-xs text-fg-light" data-testid="il-log">{log}</p>

	<SettingsItemList
		title="Shared folders"
		description="Folders kept in sync with this team."
		items={folders}
		addAction={{ label: 'Add folder', unavailable: 'Your plan includes 3 folders. Remove one or upgrade to add more.' }}
		data-testid="il-folders"
	>
		{#snippet trailing(item)}
			<Switch
				aria-label="Sync {item.label}"
				checked={item.synced}
				disabled={Boolean(item.lock)}
				onCheckedChange={(on) => (folders = folders.map((f) => (f.id === item.id ? { ...f, synced: on, status: on ? { label: 'Healthy', tone: 'success' } : { label: 'Paused', tone: 'warning' } } : f)))}
			/>
		{/snippet}
	</SettingsItemList>

	<SettingsItemList
		title="Stored exports"
		description="Old exports take up space. Select the ones to delete."
		items={exports}
		selectable
		bind:value={selected}
		selectionSummary={summary}
		bulkActions={[{ id: 'delete', label: 'Delete selected', tone: 'danger', confirm: { title: 'Delete the selected exports?', description: 'The files are deleted for everyone and cannot be recovered.', confirmLabel: 'Delete' } }]}
		onBulkAction={deleteExports}
		filter={{ name: 'export' }}
		formAction="/settings-demo/exports"
		empty={{ title: 'No stored exports', description: 'Exports you make appear here for 90 days.' }}
		data-testid="il-exports"
	/>

	<SettingsItemList
		title="Blocked senders"
		items={[]}
		empty={{ title: 'Nobody is blocked', description: 'Messages from blocked senders go straight to the archive.', action: { label: 'Block a sender', href: 'https://example.com/settings/blocked-senders' } }}
		data-testid="il-empty"
	/>
</div>
