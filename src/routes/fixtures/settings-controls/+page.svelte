<!--
	Browser-test fixture for the Settings controls (tests/browser/keyboard/settings-controls.spec.ts).
	Not part of the catalogue: cases no demo shows.

	- An instant NotificationMatrix in the explicit list layout (the catalogue's list matrix is staged,
	  so it never shows a saving spinner).
	- Controls inside a SettingsLayout whose `ready` is false: JS-only affordances wait for it.
	- A SettingsForm whose save returns field errors for a staged matrix and a selection list.
	- Actions that report failures, bulk actions with a link and a reason, a row status that changes,
	  and a GET filter that keeps the page's other query parameters.
-->
<script lang="ts">
	import { Bell, Mail, Smartphone } from '@lucide/svelte';
	import { ChoiceCards, CopyValue, NotificationMatrix, SettingsItemList, UsageMeter, type NotificationChannel, type NotificationEvent } from '$lib/settings/controls';
	import { SaveBar, SettingsForm } from '$lib/settings/save';
	import { SettingsLayout } from '$lib/settings/shell';
	import type { SettingsItem, SettingsResult } from '$lib/settings/shared';

	const events: NotificationEvent[] = [
		{ id: 'mention', label: 'Mentions', description: 'Someone mentions you or your team.' },
		{ id: 'reply', label: 'Replies' },
		{ id: 'digest', label: 'Weekly summary' }
	];
	const channels: NotificationChannel[] = [
		{ id: 'app', label: 'In app', icon: Bell },
		{ id: 'email', label: 'Email', icon: Mail },
		{ id: 'push', label: 'Push', icon: Smartphone }
	];
	let value = $state(['mention:app', 'mention:email', 'reply:app']);
	/** Answers after 600 ms, like the catalogue demos. */
	const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 600));
	const commitCell = wait;

	// ---- Not ready: everything below a SettingsLayout with `ready={false}`. ----
	const people: SettingsItem[] = [
		{ id: 'p1', label: 'Ada Park' },
		{ id: 'p2', label: 'Ben Ortiz' }
	];
	let heldCalls = $state(0);
	const count = () => {
		heldCalls++;
	};

	// ---- Staged: a save that refuses the matrix and the selection. ----
	let saves = $state(0);
	async function refuse(): Promise<SettingsResult> {
		saves++;
		return { errors: { teamNotify: 'Pick at least one way to hear about people leaving.', approvers: 'Choose at least two approvers.' } };
	}

	// ---- Actions that fail, bulk actions, a status that changes, a GET filter. ----
	let emptyCalls = $state(0);
	let feeds = $state<SettingsItem[]>([
		{ id: 'f1', label: 'Release feed', status: { label: 'Healthy', tone: 'success' } },
		{ id: 'f2', label: 'Audit feed', status: { label: 'Healthy', tone: 'success' } }
	]);
	function breakFeed(): void {
		feeds = feeds.map((f) => (f.id === 'f2' ? { ...f, status: { label: 'Sync failed', tone: 'danger' } } : f));
	}
	let bulkLog = $state('');
	async function addSeatsError(): Promise<SettingsResult> {
		await wait();
		return { error: 'Could not add seats.' };
	}
	async function addSeatsReject(): Promise<void> {
		await wait();
		throw new Error('down');
	}
	async function addFeed(): Promise<SettingsResult> {
		await wait();
		return { error: 'Feeds are full.' };
	}
</script>

<main class="mx-auto flex max-w-3xl flex-col gap-6 p-4 text-fg-main">
	<h1 class="text-lg font-semibold">Settings controls fixture</h1>
	<div>
		<NotificationMatrix {events} {channels} bind:value onCellCommit={commitCell} layout="list" labels={{ caption: 'Notify me' }} data-testid="nm-list-instant" />
	</div>

	<section data-testid="not-ready" class="flex flex-col gap-4">
		<h2 class="m-0 text-base font-semibold">Not ready</h2>
		<SettingsLayout groups={[{ id: 'g', items: [{ id: 'a', label: 'General', href: '?section=a' }] }]} current="a" mode="section" ready={false}>
			<div class="flex flex-col gap-4 p-4">
				<ChoiceCards name="held-density" aria-label="Held density" variant="segmented" options={[{ value: 'a', label: 'Compact' }, { value: 'b', label: 'Default' }]} defaultValue="a" onCommit={count} />
				<CopyValue label="Held ID" value="held-123" />
				<NotificationMatrix events={events.slice(0, 2)} channels={channels.slice(0, 2)} defaultValue={['mention:app']} onCellCommit={count} columnToggle labels={{ caption: 'Held matrix' }} />
				<SettingsItemList
					title="Held people"
					items={[{ ...people[0], current: true }, people[1]]}
					actions={() => [
						{ id: 'remove', label: 'Remove', confirm: { title: 'Remove?', description: 'They lose access.' } },
						{ id: 'ping', label: 'Ping' }
					]}
					onAction={count}
					addAction={{ label: 'Add held', onSelect: count }}
				/>
				<UsageMeter label="Held seats" value={3} limit={10} action={{ label: 'Add held seats', onSelect: count }} />
				<p data-testid="held-calls">{heldCalls}</p>
			</div>
		</SettingsLayout>
	</section>

	<section data-testid="staged-errors" class="@container/settings flex flex-col gap-4">
		<h2 class="m-0 text-base font-semibold">Staged errors</h2>
		<SettingsForm onSubmit={refuse} aria-label="Team policy" fields={[{ name: 'approvers', label: 'Approvers' }]} class="flex flex-col gap-4">
			{#snippet children()}
				<NotificationMatrix events={[{ id: 'joined', label: 'Someone joins' }, { id: 'left', label: 'Someone leaves' }]} channels={channels.slice(0, 2)} name="teamNotify" defaultValue={['joined:email']} layout="grid" labels={{ caption: 'Team notices' }} />
				<SettingsItemList title="Approvers" items={people} selectable name="approvers" defaultValue={['p1']} filter={{ name: 'approver' }} />
				<CopyValue label="Invite link" value="https://example.com/join/abc" mono={false} />
				<SaveBar layout="footer" />
			{/snippet}
		</SettingsForm>
		<p data-testid="staged-saves">{saves}</p>
	</section>

	<section data-testid="actions" class="@container/settings flex flex-col gap-4">
		<h2 class="m-0 text-base font-semibold">Actions</h2>
		<UsageMeter label="Error seats" value={8} limit={10} action={{ label: 'Add error seats', onSelect: addSeatsError }} />
		<UsageMeter label="Rejecting seats" value={8} limit={10} action={{ label: 'Add rejecting seats', onSelect: addSeatsReject }} />
		<SettingsItemList title="Keys" items={[]} empty={{ title: 'No keys yet', action: { label: 'Create first key', onSelect: () => void emptyCalls++ } }} />
		<p data-testid="empty-calls">{emptyCalls}</p>
		<SettingsItemList
			title="Feeds"
			items={feeds}
			selectable
			defaultValue={['f1']}
			bulkActions={[
				{ id: 'send', label: 'Send', unavailable: 'Sending is not available here.' },
				{ id: 'open', label: 'Open report', href: '?report=1' }
			]}
			onBulkAction={(id) => void (bulkLog = `bulk:${id}`)}
			addAction={{ label: 'Add feed', onSelect: addFeed }}
			filter={{ name: 'feed', hidden: { section: 'feeds' } }}
		/>
		<button type="button" onclick={breakFeed}>Break audit feed</button>
		<p data-testid="bulk-log">{bulkLog}</p>
	</section>
</main>
