<script lang="ts">
	import { Bell, Database, Download, UserRound } from '@lucide/svelte';
	import { SettingsPage, type SettingsPageScope } from '$lib/settings/shell';
	import { Button } from '$lib/primitives/actions';
	import { Badge } from '$lib/primitives/display';
	import { NativeSelect, Switch } from '$lib/primitives/form';
	import { lockAttrs, RECIPES, type SettingsResult, type SettingsScope } from '$lib/settings/shared';

	const RETENTION = [
		{ value: '30', label: '30 days' },
		{ value: '90', label: '90 days' },
		{ value: '365', label: '1 year' }
	];

	let requests = $state(0);
	let requested = $state(false);

	/** A slow server call that refuses the first time, so the error the page shows and the retry can both be seen. */
	async function requestAccess(): Promise<SettingsResult | void> {
		await new Promise((resolve) => setTimeout(resolve, 600));
		requests += 1;
		if (requests === 1) return { error: 'Couldn’t send your request: nothing was sent. Try again.' };
		requested = true;
	}

	let notifying = $state(false);

	/** A slow server call that always succeeds. */
	async function notifyMe(): Promise<void> {
		await new Promise((resolve) => setTimeout(resolve, 600));
		notifying = true;
	}

	const readOnly = $derived<SettingsPageScope>({
		label: 'Read-only for your role',
		description: 'You can see how data is kept, but only admins can change it.',
		tone: 'warning',
		lock: { kind: 'permission', reason: 'Only admins can change data settings.', source: 'Set by your team’s owner' },
		actions: [
			requested
				? { label: 'Access requested', unavailable: 'An admin has your request and will get back to you.' }
				: // Without JavaScript the button posts intent=request-access; with it, the callback runs instead.
					{ label: 'Request access', tone: 'accent', intent: 'request-access', onSelect: requestAccess },
			notifying
				? { label: 'You’ll be notified', unavailable: 'We’ll email you when your role changes.' }
				: { label: 'Notify me', intent: 'notify-me', onSelect: notifyMe }
		]
	});
</script>

{#snippet notificationsBody(key: string)}
	<section class={RECIPES.section} aria-labelledby="{key}-email">
		<div class={RECIPES.sectionHeader}><h3 id="{key}-email" class="m-0 text-sm font-semibold text-fg-main">Email</h3></div>
		<ul role="list" class={RECIPES.list}>
			<li class={RECIPES.row}>
				<div class="min-w-0">
					<p id="{key}-digest" class="m-0 text-[13px] font-medium text-fg-main">Daily digest</p>
					<p id="{key}-digest-help" class="m-0 text-xs leading-5 text-fg-light">A summary of activity, sent at 8:00.</p>
				</div>
				<Switch defaultChecked aria-labelledby="{key}-digest" aria-describedby="{key}-digest-help" />
			</li>
			<li class={RECIPES.row}>
				<div class="min-w-0">
					<p id="{key}-mentions" class="m-0 text-[13px] font-medium text-fg-main">Mentions</p>
					<p id="{key}-mentions-help" class="m-0 text-xs leading-5 text-fg-light">When someone mentions you by name.</p>
				</div>
				<Switch defaultChecked aria-labelledby="{key}-mentions" aria-describedby="{key}-mentions-help" />
			</li>
		</ul>
	</section>
{/snippet}

{#snippet notificationActions()}
	<Button size="sm" variant="secondary" href="?page=test-email#settings-page">Send a test email</Button>
{/snippet}

<div class="flex min-w-0 flex-col gap-6">
	<div class="flex min-w-0 flex-col gap-2">
		<p class="m-0 text-xs font-medium text-fg-light">A plain page: the back link shows only while the frame is narrow</p>
		<div data-testid="page-wide" class="rounded-window border border-card-border bg-canvas-primary">
			<SettingsPage headingLevel={2} title="Notifications" lead="What we tell you about, and where." icon={Bell} backHref="?page=index#settings-page" actions={notificationActions} footnote="Security notices are always sent, whatever you choose here.">
				{#snippet badges()}<Badge tone="accent" size="sm">2 new</Badge>{/snippet}
				{@render notificationsBody('page-wide')}
			</SettingsPage>
		</div>
	</div>

	<div class="flex min-w-0 flex-wrap items-start gap-6">
		<div class="flex w-[360px] max-w-full flex-col gap-2">
			<p class="m-0 text-xs font-medium text-fg-light">The same page at phone width: the back link shows</p>
			<div data-testid="page-narrow" class="rounded-window border border-card-border bg-canvas-primary">
				<SettingsPage headingLevel={2} title="Notifications" lead="What we tell you about, and where." icon={Bell} backHref="?page=index#settings-page" labels={{ back: 'Settings' }}>
					{@render notificationsBody('page-narrow')}
				</SettingsPage>
			</div>
		</div>
		<div class="flex min-w-0 flex-1 basis-80 flex-col gap-2">
			<p class="m-0 text-xs font-medium text-fg-light">A sub-page with a breadcrumb</p>
			<div data-testid="page-sub" class="rounded-window border border-card-border bg-canvas-primary">
				<SettingsPage headingLevel={2} title="Ben Ortiz" lead="ben@northwind.example · Joined May 2026" icon={UserRound} breadcrumb={[{ label: 'Settings', href: '?page=index#settings-page' }, { label: 'Members', href: '?page=members#settings-page' }]} footnoteIcon="lock" footnote="Only owners can change another owner’s role.">
					{#snippet badges()}<Badge tone="neutral" size="sm">Admin</Badge>{/snippet}
					<dl class={RECIPES.section + ' m-0 grid divide-y divide-canvas-border'}>
						<div class="flex flex-wrap justify-between gap-2 px-4 py-3 text-[13px]"><dt class="text-fg-light">Role</dt><dd class="m-0 text-fg-main">Admin</dd></div>
						<div class="flex flex-wrap justify-between gap-2 px-4 py-3 text-[13px]"><dt class="text-fg-light">Last active</dt><dd class="m-0 text-fg-main">Today</dd></div>
					</dl>
				</SettingsPage>
			</div>
		</div>
	</div>

	<div class="flex min-w-0 flex-col gap-2">
		<p class="m-0 text-xs font-medium text-fg-light">A page locked by its scope: every control below is disabled and says why</p>
		<div data-testid="page-locked" class="rounded-window border border-card-border bg-canvas-primary">
			<SettingsPage headingLevel={2} title="Data" lead="Retention, exports and deletion." icon={Database} scope={readOnly} width="lg">
				{#snippet children(scope: SettingsScope)}
					{@const locked = lockAttrs(scope.lock?.lock, scope.lock?.reasonId)}
					<section class={RECIPES.section} aria-labelledby="page-demo-retention-title">
						<div class={RECIPES.sectionHeader}><h3 id="page-demo-retention-title" class="m-0 text-sm font-semibold text-fg-main">Retention</h3></div>
						<ul role="list" class={RECIPES.list}>
							<li class={RECIPES.row}>
								<div class="min-w-0">
									<p id="page-demo-retention" class="m-0 text-[13px] font-medium text-fg-main">Keep activity for</p>
									<p class="m-0 text-xs leading-5 text-fg-light">Older activity is deleted every night.</p>
								</div>
								<NativeSelect class="w-full @lg/settings:w-40" options={RETENTION} defaultValue="90" aria-labelledby="page-demo-retention" {...locked} />
							</li>
							<li class={RECIPES.row}>
								<div class="min-w-0">
									<p id="page-demo-trash" class="m-0 text-[13px] font-medium text-fg-main">Keep deleted items for 30 days</p>
									<p class="m-0 text-xs leading-5 text-fg-light">So they can be restored.</p>
								</div>
								<Switch data-testid="locked-switch" defaultChecked aria-labelledby="page-demo-trash" {...locked} />
							</li>
							<li class={RECIPES.row}>
								<div class="min-w-0">
									<p class="m-0 text-[13px] font-medium text-fg-main">Export</p>
									<p class="m-0 text-xs leading-5 text-fg-light">Everything, as a zip file.</p>
								</div>
								<Button size="sm" variant="secondary" disabled={!!scope.lock} aria-describedby={scope.lock?.reasonId}>{#snippet leading()}<Download aria-hidden="true" />{/snippet}Export data</Button>
							</li>
						</ul>
					</section>
				{/snippet}
			</SettingsPage>
		</div>
	</div>
</div>
