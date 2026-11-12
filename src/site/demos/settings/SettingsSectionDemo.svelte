<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import { Button } from '$lib/primitives/actions';
	import { SettingsRow, SettingsSection, SettingsToggle } from '$lib/settings/rows';
	import type { SettingsResult } from '$lib/settings/shared';

	/** A fake server: answers after 600 ms. */
	const save = (): Promise<void | SettingsResult> => new Promise((resolve) => setTimeout(resolve, 600));
	const requestAccess = () => new Promise<void>((resolve) => setTimeout(resolve, 600));
	const apps: string[] = [];
	let resets = $state(0);
</script>

<div class="flex max-w-3xl flex-col gap-6">
	<SettingsSection data-testid="section-plain" title="Profile" description="How you appear to the people you work with.">
		<SettingsRow label="Display name" value="Ada Park" action={{ label: 'Change', href: '?dialog=display-name' }} />
		<SettingsRow label="Contact email" description="Where we send receipts and security notices." value="ada@northwind.example" action={{ label: 'Change', href: '?dialog=contact-email' }} />
		<SettingsRow label="Member since" value="12 March 2025" />
	</SettingsSection>

	<SettingsSection data-testid="section-count" title="Members" count={6} status={{ label: '2 seats left', tone: 'warning', dot: true }}>
		{#snippet actions()}
			<Button href="?dialog=invite" size="sm" variant="secondary">
				{#snippet leading()}<Plus aria-hidden="true" />{/snippet}
				Invite people
			</Button>
		{/snippet}
		<SettingsRow label="Ada Park" description="ada@northwind.example · Owner" value="You" />
		<SettingsRow label="Ben Ortiz" description="ben@northwind.example · Admin" actions={[{ label: 'Change role', href: '?dialog=role&member=ben' }, { label: 'Remove', ariaLabel: 'Remove Ben Ortiz', href: '?dialog=remove&member=ben', tone: 'danger' }]} />
		<SettingsRow
			label="Chloé Martin"
			description="chloe@northwind.example · Member"
			actions={[
				{ label: 'Change role', href: '?dialog=role&member=chloe' },
				{ label: 'Reset two-step sign-in', onSelect: () => (resets += 1) },
				{ label: 'Remove', href: '?dialog=remove&member=chloe', tone: 'danger' }
			]}
		/>
		{#snippet footer()}
			<span>3 more members. Two-step resets: <span data-testid="section-resets">{resets}</span>.</span>
			<a href="?page=members" class="font-medium text-fg-main underline-offset-2 hover:underline">See everyone</a>
		{/snippet}
	</SettingsSection>

	<SettingsSection
		data-testid="section-locked"
		title="Billing"
		description="Plan, seats and the card on file."
		lock={{ kind: 'permission', source: 'Owners only' }}
		onRequest={requestAccess}
		note="Invoices are emailed to the billing contact on the first of each month."
	>
		<SettingsToggle label="Pay yearly" description="Two months free, billed once a year." checked={false} onCommit={save} />
		<SettingsRow label="Billing contact" value="finance@northwind.example" />
	</SettingsSection>

	<SettingsSection data-testid="section-columns" title="Notifications" description="Choose where each kind of message reaches you." layout="columns">
		<SettingsSection title="Email">
			<SettingsToggle label="Weekly summary" checked={true} onCommit={save} />
			<SettingsToggle label="Mentions" checked={true} onCommit={save} />
		</SettingsSection>
		<SettingsSection title="Mobile push">
			<SettingsToggle label="Mentions" checked={false} onCommit={save} />
			<SettingsToggle label="Reminders" checked={true} onCommit={save} />
		</SettingsSection>
	</SettingsSection>

	<SettingsSection data-testid="section-aside" title="Public sharing" description="Let people outside the team open shared documents by link." asideTitle="What the switch does">
		<SettingsToggle label="Allow public links" description="Anyone with the link can view. They cannot edit." checked={true} onCommit={save} />
		<SettingsRow label="Links created" value="14" />
		{#snippet aside()}
			<p class="m-0">Turning it off stops every public link at once. Links come back if you turn it on again.</p>
			<p class="m-0 mt-2">Team members are not affected.</p>
		{/snippet}
	</SettingsSection>

	<SettingsSection data-testid="section-empty" title="Connected apps" description="Apps that can read this team's documents.">
		{#snippet empty()}
			<p class="m-0">No apps connected yet.</p>
		{/snippet}
		{#snippet actions()}
			<Button href="?page=apps" size="sm" variant="secondary">Browse apps</Button>
		{/snippet}
		{#each apps as app (app)}<SettingsRow label={app} />{/each}
	</SettingsSection>

	<SettingsSection data-testid="section-danger" title="Danger zone" tone="danger" description="These actions cannot be undone from here.">
		<SettingsRow label="Transfer ownership" description="Hand the team to another admin. You become an admin." action={{ label: 'Transfer', href: '?dialog=transfer' }} />
		<SettingsRow label="Delete team" description="Deletes every document, member and invite." action={{ label: 'Delete team', href: '?dialog=delete-team', tone: 'danger' }} />
	</SettingsSection>
</div>
