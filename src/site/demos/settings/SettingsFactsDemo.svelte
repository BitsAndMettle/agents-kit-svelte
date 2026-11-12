<script lang="ts">
	import { SettingsFacts, SettingsSection } from '$lib/settings/rows';
	import type { SettingsFact } from '$lib/settings/shared';
	import { SAMPLE_SETTINGS_FACTS } from '$lib/fixtures/settings';

	let copies = $state<string[]>([]);
	let syncs = $state(0);

	/** A fake server: answers after 600 ms and fails the first time, so the error is easy to see. */
	async function syncNow(): Promise<void | { error: string }> {
		await new Promise((resolve) => setTimeout(resolve, 600));
		syncs += 1;
		if (syncs === 1) return { error: "Couldn't reach the shared drive. Try again in a minute." };
	}

	const connection: SettingsFact[] = [
		...SAMPLE_SETTINGS_FACTS.slice(0, 3),
		{ id: 'since', label: 'Connected since', value: '4 February 2026, 09:12', compactValue: '4 Feb 2026', detail: 'By Ada Park' },
		{ id: 'scopes', label: 'Access', value: 'Read documents, read members', action: { label: 'Review access', href: '?dialog=access' } },
		{ id: 'synced', label: 'Last sync', value: '2 minutes ago', action: { label: 'Sync now', onSelect: syncNow } }
	];

	const version: SettingsFact[] = [
		{ id: 'app-version', label: 'Version', value: '4.12.0', mono: true, detail: 'Released 3 days ago', action: { label: 'Release notes', href: '?page=releases' } },
		{ id: 'build', label: 'Build', value: '2026.11.09-7f3a91c', compactValue: '7f3a91c', mono: true, copy: true },
		{ id: 'account-key', label: 'Account ID', value: 'ac_2Q8m4x7Kp', mono: true, copy: true },
		{ id: 'commit', label: 'Commit', value: '7f3a91c…', mono: true, copy: '7f3a91c2e8d04b6a5c13' },
		{ id: 'channel', label: 'Update channel', value: 'Stable', action: { label: 'Switch to preview', unavailable: 'Preview builds need an admin to opt the team in.' } }
	];

	const device: SettingsFact[] = [
		{ id: 'os', label: 'System', value: 'Linux 6.8', source: 'Reported by the device' },
		{ id: 'cores', label: 'Processor', value: '8 cores', detail: '3 in use now' },
		{ id: 'memory', label: 'Memory', value: '32 GB', detail: '11 GB free', tone: 'success' },
		{ id: 'disk', label: 'Disk', value: '512 GB', detail: '18 GB free', tone: 'warning' },
		{ id: 'policy', label: 'Update policy', value: 'Automatic, nightly', source: 'Set by your administrator' },
		{ id: 'serial', label: 'Device ID', value: 'dv-41c9-a07e', mono: true, copy: true }
	];
</script>

<div class="flex max-w-3xl flex-col gap-6">
	<SettingsSection title="Connection" description="How this team is linked to the shared drive." status={{ label: 'Connected', tone: 'success', dot: true }} list={false}>
		<SettingsFacts data-testid="facts-connection" items={connection} />
	</SettingsSection>

	<SettingsSection title="About" description="Quote these when you ask for help." list={false}>
		<SettingsFacts data-testid="facts-version" items={version} onCopy={(id, ok) => (copies = [...copies, `${id}:${ok ? 'copied' : 'failed'}`])} />
	</SettingsSection>
	<p class="-mt-4 text-xs text-fg-light">Copy log: <span data-testid="facts-copies">{copies.join(', ') || 'nothing yet'}</span></p>

	<SettingsSection title="This device" description="Read-only. Some values are managed elsewhere." list={false}>
		<SettingsFacts data-testid="facts-grid" layout="grid" items={device} />
	</SettingsSection>
</div>
