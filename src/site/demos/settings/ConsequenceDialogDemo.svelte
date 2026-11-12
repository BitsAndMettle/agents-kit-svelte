<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Archive, CloudOff, CreditCard, Crown, Trash2, UserMinus } from '@lucide/svelte';
	import { ConsequenceDialog, type ConsequenceConfirmContext } from '$lib/settings/save';
	import { SettingsRow, SettingsSection } from '$lib/settings/rows';
	import { rememberOpener, RECIPES, SETTINGS_CONTAINER, type ConsequenceGroup, type ReassignSpec, type SettingLock, type SettingsResult } from '$lib/settings/shared';
	import { Button } from '$lib/primitives/actions';
	import { Input } from '$lib/primitives/form';
	import { cn } from '$lib/ui/cn';
	import { buttonClass } from '$lib/ui/styles';

	const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	let failNext = $state(false);
	let status = $state('');

	/** Pretends to run the action: 600 ms, and fails once when asked to. */
	async function run(done: string, context: ConsequenceConfirmContext): Promise<SettingsResult | void> {
		await wait(600);
		if (failNext) {
			failNext = false;
			return { error: 'The server did not answer in time. Nothing was changed.' };
		}
		const owners = Object.entries(context.reassign).map(([id, owner]) => `${id}→${owner}`);
		status = owners.length ? `${done} (${owners.join(', ')})` : done;
	}

	const disconnect: ConsequenceGroup[] = [
		{
			label: 'What happens',
			items: [
				{ tone: 'no', label: 'New files stop syncing to the storage bucket' },
				{ tone: 'warn', label: 'Two scheduled exports will fail until you reconnect', aside: '2 exports' }
			]
		},
		{
			label: 'What stays',
			items: [
				{ tone: 'ok', label: 'Files already in the bucket stay there' },
				{ tone: 'info', label: 'You can reconnect with the same bucket later' }
			]
		}
	];

	const MEMBERS = [
		{ value: 'ada', label: 'Ada Park' },
		{ value: 'chloe', label: 'Chloé Martin' },
		{ value: 'dev', label: 'Dev Rao' }
	];
	const handover: ReassignSpec = {
		label: 'Who takes over Ben’s reports?',
		description: 'Each report keeps its schedule and recipients.',
		dependents: [
			{ id: 'weekly', label: 'Weekly summary', description: 'Every Monday, 9:00', tag: 'Scheduled' },
			{ id: 'churn', label: 'Churn review', description: 'First of the month' },
			{ id: 'quality', label: 'Quality dashboard', description: 'Shared with 4 people' }
		],
		options: MEMBERS,
		defaultFor: (id) => (id === 'quality' ? 'chloe' : 'ada'),
		summary: (value) => {
			const counts = new Map<string, number>();
			for (const owner of Object.values(value)) counts.set(owner, (counts.get(owner) ?? 0) + 1);
			return [...counts].map(([owner, n]) => `${MEMBERS.find((m) => m.value === owner)?.label ?? owner} takes ${n}`).join(' · ');
		}
	};

	const deletion: ConsequenceGroup[] = [
		{
			label: 'What happens',
			items: [
				{ tone: 'no', label: 'All documents and their history are deleted', aside: '2.4 GB' },
				{ tone: 'no', label: '6 members lose access at once' },
				{ tone: 'warn', label: 'Open invites stop working' }
			]
		},
		{
			label: 'What stays',
			items: [
				{ tone: 'ok', label: 'Invoices stay with the billing contact' },
				{ tone: 'info', label: 'Exports you already downloaded are yours to keep' }
			]
		}
	];

	/** "View as a viewer" locks the Ownership section: its dialogs still open, but can't confirm. */
	let viewer = $state(false);
	const VIEWER_LOCK: SettingLock = { kind: 'permission', reason: 'Only the team owner can archive the team or hand over billing.' };
	/** One row is always locked: the dialog behind it opens, but its phrase and Confirm stay off. */
	const TRANSFER_LOCK: SettingLock = { kind: 'permission', reason: 'Only the current owner can transfer the team.' };

	let disconnectOpen = $state(false);
	let removeOpen = $state(false);

	/**
	 * Route mode: the dialog is open while the URL says `?dialog=delete-team`. The showcase is
	 * prerendered, so the server always renders the route open; it shows without JavaScript and
	 * is upgraded (or closed) from the real URL on hydration.
	 */
	const routed = $derived(browser ? page.url.searchParams.get('dialog') === 'delete-team' : true);

	const ROW = cn(RECIPES.row, 'py-3.5');
</script>

<div class={cn(SETTINGS_CONTAINER, 'mx-auto grid w-full max-w-2xl gap-3')} data-sveltekit-noscroll data-sveltekit-keepfocus>
	<section aria-labelledby="cdd-heading" class={cn(RECIPES.section, RECIPES.danger)}>
		<header class={cn(RECIPES.sectionHeader, 'border-status-danger/20')}>
			<div class="min-w-0 flex-1">
				<h3 id="cdd-heading" class="m-0 text-sm font-semibold text-status-danger">Danger zone</h3>
				<p class="m-0 text-xs leading-5 text-fg-light">Each of these asks first and says what will change.</p>
			</div>
		</header>
		<ul role="list" class={RECIPES.list}>
			<li class={ROW}>
				<div class="min-w-0">
					<p class="m-0 text-[13px] font-medium text-fg-main">Disconnect storage</p>
					<p class="m-0 text-xs leading-5 text-fg-light">Stop syncing files to the team bucket.</p>
				</div>
				<ConsequenceDialog
					bind:open={disconnectOpen}
					title="Disconnect storage?"
					description="The team bucket stops receiving new files."
					icon={CloudOff}
					consequences={disconnect}
					confirmLabel="Disconnect"
					reversible
					size="lg"
					action="/settings-demo/storage"
					intent="disconnect"
					onConfirm={(context) => run('Storage disconnected', context)}
				>
					{#snippet trigger(part)}
						<button {...part} class={buttonClass('danger', 'sm')}>Disconnect…</button>
					{/snippet}
					{#snippet identity()}
						<span class="font-medium">northwind-files</span> <span class="text-fg-light">· eu-central · 18.2 GB</span>
					{/snippet}
				</ConsequenceDialog>
			</li>
			<li class={ROW}>
				<div class="min-w-0">
					<p class="m-0 text-[13px] font-medium text-fg-main">Remove Ben Ortiz</p>
					<p class="m-0 text-xs leading-5 text-fg-light">He owns 3 scheduled reports.</p>
				</div>
				<ConsequenceDialog
					bind:open={removeOpen}
					title="Remove Ben Ortiz from the team?"
					description="He loses access at once. His documents stay with the team."
					icon={UserMinus}
					consequences={[
						{ tone: 'no', label: 'Ben can no longer sign in to this team' },
						{ tone: 'ok', label: 'His documents and comments stay' }
					]}
					reassign={handover}
					confirmLabel="Remove member"
					reversible
					action="/settings-demo/members"
					intent="remove"
					hidden={{ member: 'ben' }}
					onConfirm={(context) => run('Ben Ortiz removed', context)}
				>
					{#snippet trigger(part)}
						<button {...part} class={buttonClass('danger', 'sm')}>Remove…</button>
					{/snippet}
					{#snippet identity()}
						<span class="font-medium">Ben Ortiz</span> <span class="text-fg-light">· Admin · ben@northwind.example</span>
					{/snippet}
				</ConsequenceDialog>
			</li>
			<li class={ROW}>
				<div class="min-w-0">
					<p class="m-0 text-[13px] font-medium text-fg-main">Delete team</p>
					<p class="m-0 text-xs leading-5 text-fg-light">Deletes everything for everyone. Opens as a link: <code class="text-[11px]">?dialog=delete-team</code>.</p>
				</div>
				<Button href="?dialog=delete-team" variant="danger" size="sm" {@attach rememberOpener('delete-team')}>Delete team…</Button>
			</li>
		</ul>
	</section>

	<SettingsSection title="Ownership" description="Who runs the team, and who pays for it." headingLevel={3} lock={viewer ? VIEWER_LOCK : undefined} data-testid="cdd-ownership">
		<SettingsRow label="Archive team" description="Hides the team. Members keep read access.">
			{#snippet control()}
				<ConsequenceDialog
					title="Archive Northwind Studio?"
					description="The team becomes read-only for everyone."
					icon={Archive}
					consequences={[
						{ tone: 'no', label: 'Nobody can change documents or settings' },
						{ tone: 'ok', label: 'Everything stays readable and exportable' }
					]}
					confirmPhrase="Archive"
					confirmLabel="Archive team"
					reversible
					action="/settings-demo/archive"
					intent="archive"
					onConfirm={(context) => run('Team archived', context)}
				>
					{#snippet trigger(part)}
						<button {...part} class={buttonClass('secondary', 'sm')}>Archive…</button>
					{/snippet}
					{#snippet identity()}
						<span class="font-medium">Northwind Studio</span> <span class="text-fg-light">· 6 members · 214 documents</span>
					{/snippet}
				</ConsequenceDialog>
			{/snippet}
		</SettingsRow>
		<SettingsRow label="Hand over billing" description="Make someone else the billing contact.">
			{#snippet control()}
				<ConsequenceDialog
					title="Hand over billing?"
					description="The new contact gets every invoice and can change the plan."
					icon={CreditCard}
					consequences={[
						{ tone: 'warn', label: 'You stop receiving invoices' },
						{ tone: 'ok', label: 'Past invoices stay in your downloads' }
					]}
					confirmLabel="Hand over"
					tone="accent"
					confirmUnavailable="Handing over billing is not available in this preview."
					action="/settings-demo/billing"
					intent="handover"
					onConfirm={(context) => run('Billing handed over', context)}
				>
					{#snippet trigger(part)}
						<button {...part} class={buttonClass('secondary', 'sm')}>Hand over…</button>
					{/snippet}
					{#snippet identity()}
						<span class="font-medium">Billing contact</span> <span class="text-fg-light">· you · invoices monthly</span>
					{/snippet}
					<div class="grid gap-1.5">
						<label for="cdd-handover-note" class="text-xs font-medium text-fg-main">Note for the new contact</label>
						<Input id="cdd-handover-note" name="note" placeholder="Optional" autocomplete="off" />
					</div>
				</ConsequenceDialog>
			{/snippet}
		</SettingsRow>
		<SettingsRow label="Transfer ownership" description="Make someone else the team owner." lock={TRANSFER_LOCK}>
			{#snippet control()}
				<ConsequenceDialog
					title="Transfer Northwind Studio?"
					description="The new owner can delete the team and change billing."
					icon={Crown}
					consequences={[
						{ tone: 'warn', label: 'You become an admin' },
						{ tone: 'ok', label: 'Your documents stay yours' }
					]}
					confirmPhrase="Transfer"
					confirmLabel="Transfer team"
					reversible={false}
					action="/settings-demo/transfer"
					intent="transfer"
					onConfirm={(context) => run('Team transferred', context)}
				>
					{#snippet trigger(part)}
						<button {...part} class={buttonClass('secondary', 'sm')}>Transfer…</button>
					{/snippet}
					{#snippet identity()}
						<span class="font-medium">Northwind Studio</span> <span class="text-fg-light">· owned by Ada Park</span>
					{/snippet}
				</ConsequenceDialog>
			{/snippet}
		</SettingsRow>
	</SettingsSection>

	<!-- With JavaScript this frame is empty and the route opens as a modal; without it, the server-rendered route shows here. -->
	<div class="contents noscript:grid noscript:gap-2 noscript:rounded-window noscript:border noscript:border-dashed noscript:border-card-border noscript:p-3">
		<p class="m-0 hidden text-xs text-fg-light noscript:block">Without JavaScript the server renders the <code>?dialog=delete-team</code> route already open:</p>
		<ConsequenceDialog
			open={routed}
			ssrOpen
			closeHref="./"
			openerKey="delete-team"
			title="Delete Northwind Studio?"
			description="Everything in the team is deleted for everyone, now and for good."
			icon={Trash2}
			consequences={deletion}
			confirmPhrase="Northwind Studio"
			confirmLabel="Delete team"
			reversible={false}
			action="/settings-demo/team"
			intent="delete"
			onConfirm={async (context) => {
				const result = await run(`Team deleted (typed “${context.typed}”)`, context);
				// Route mode: on success the app navigates to closeHref, which closes the dialog.
				if (!result) void goto('./', { noScroll: true, keepFocus: true });
				return result;
			}}
			data-testid="cdd-route"
			class="[&:not(:modal)]:static [&:not(:modal)]:z-auto [&:not(:modal)]:w-full [&:not(:modal)]:shadow-none [&:not(:modal)]:hidden! noscript:[&:not(:modal)]:flex!"
		>
			{#snippet identity()}
				<span class="font-medium">Northwind Studio</span> <span class="text-fg-light">· 6 members · 2.4 GB</span>
			{/snippet}
		</ConsequenceDialog>
	</div>

	<div class={RECIPES.sectionFooter + ' rounded-card border border-card-border'}>
		<label class="inline-flex items-center gap-1.5">
			<input type="checkbox" bind:checked={failNext} class="size-3.5 accent-accent-primary" />
			Make the next action fail
		</label>
		<label class="inline-flex items-center gap-1.5">
			<input type="checkbox" bind:checked={viewer} class="size-3.5 accent-accent-primary" />
			View as a viewer
		</label>
		<span class="ml-auto" aria-live="polite" data-testid="cdd-status">{status}</span>
	</div>
</div>
