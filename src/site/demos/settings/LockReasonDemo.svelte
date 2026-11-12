<script lang="ts">
	import { NativeSelect, Switch } from '$lib/primitives/form';
	import { LockReason, SettingsRow, SettingsSection } from '$lib/settings/rows';
	import type { LockKind, SettingLock, SettingsResult } from '$lib/settings/shared';

	const KINDS: { kind: LockKind; source?: string }[] = [
		{ kind: 'permission', source: 'Ask an owner' },
		{ kind: 'plan' },
		{ kind: 'managed', source: 'Set by Northwind IT' },
		{ kind: 'inherited', source: 'From the team default' },
		{ kind: 'readonly' },
		{ kind: 'unsupported', source: 'This browser cannot send push messages' },
		{ kind: 'awaiting-approval', source: 'Asked 2 hours ago' }
	];

	/** One reason, shown once, describing three rows. */
	const shared: SettingLock = { kind: 'managed', reason: 'Security settings are managed by your organisation.', source: 'Northwind IT' };

	/** A fake server: answers after 600 ms. */
	const wait = () => new Promise((resolve) => setTimeout(resolve, 600));
	let requests = $state(0);

	async function request(): Promise<void | SettingsResult> {
		await wait();
		requests += 1;
	}

	async function refuse(): Promise<void | SettingsResult> {
		await wait();
		throw new Error('offline');
	}
</script>

<div class="flex max-w-3xl flex-col gap-6">
	<SettingsSection title="Every kind of lock" description="Each kind has a default sentence and icon; the source says who holds it." list={false}>
		<div class="flex flex-col gap-3 px-4 py-3" data-testid="lock-kinds">
			{#each KINDS as item (item.kind)}
				<LockReason lock={{ kind: item.kind, source: item.source }} />
			{/each}
		</div>
	</SettingsSection>

	<SettingsSection data-testid="lock-shared" title="Sign-in security" description="One reason describes all three settings.">
		<li class="list-none px-4 pt-3">
			<LockReason id="security-managed" variant="note" lock={shared} />
		</li>
		<SettingsRow label="Two-step sign-in" description="Ask for a code on new devices." lock={shared} reasonId="security-managed">
			{#snippet control()}<Switch name="twoStep" value="true" checked />{/snippet}
		</SettingsRow>
		<SettingsRow label="Session length" lock={shared} reasonId="security-managed">
			{#snippet control()}
				<NativeSelect name="session" value="7" options={[{ value: '1', label: '1 day' }, { value: '7', label: '7 days' }, { value: '30', label: '30 days' }]} class="w-full @lg/settings:w-32" />
			{/snippet}
		</SettingsRow>
		<SettingsRow label="Remember devices" lock={shared} reasonId="security-managed">
			{#snippet control()}<Switch name="remember" value="true" />{/snippet}
		</SettingsRow>
	</SettingsSection>

	<SettingsSection data-testid="lock-request" title="Billing" description="You can see the plan but not change it." list={false}>
		<div class="flex flex-col gap-3 px-4 py-3">
			<!-- With requestAction the button also works without JavaScript; the next one has only a handler, so it waits for the page. -->
			<LockReason data-testid="lock-request-ok" lock={{ kind: 'permission', reason: 'Only billing owners can change the plan.' }} onRequest={request} requestAction="/settings-demo/access?setting=plan" />
			<LockReason data-testid="lock-request-fail" lock={{ kind: 'plan', reason: 'Seat limits are fixed on the Starter plan.' }} onRequest={refuse} labels={{ request: 'Ask for an upgrade' }} />
			<LockReason
				lock={{ kind: 'managed', reason: 'Payment details are managed in the billing portal.', action: { label: 'Open billing portal', href: '?page=billing-portal' } }}
				variant="note"
			/>
			<LockReason data-testid="lock-hidden" variant="hidden" id="hidden-reason" lock={{ kind: 'readonly', reason: 'Archived teams are read-only.' }} />
			<p class="m-0 text-xs text-fg-light">Requests sent: <span data-testid="lock-requests">{requests}</span></p>
		</div>
	</SettingsSection>
</div>
