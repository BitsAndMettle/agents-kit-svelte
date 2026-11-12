<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { CloudOff, Trash2, UserMinus } from '@lucide/svelte';
	import { ConsequenceDialog, type ConsequenceConfirmContext } from '$lib/settings/save';
	import { rememberOpener, RECIPES, SETTINGS_CONTAINER, type ConsequenceGroup, type ReassignSpec, type SettingsResult } from '$lib/settings/shared';
	import { Button } from '$lib/primitives/actions';
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
		<span class="ml-auto" aria-live="polite" data-testid="cdd-status">{status}</span>
	</div>
</div>
