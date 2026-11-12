<!--
	SettingsRow in a staged form. The form is wired by hand with the shared SettingsDraft (the same
	model SettingsForm uses), so rows register, show "Unsaved" and "was X", and the form posts natively
	without JavaScript.
-->
<script lang="ts">
	import { Globe, KeyRound } from '@lucide/svelte';
	import { Button } from '$lib/primitives/actions';
	import { Input, NativeSelect, Switch } from '$lib/primitives/form';
	import { RequestedChange, SettingsRow, SettingsSection } from '$lib/settings/rows';
	import { SettingsDraft, setSettingsDraft, type SettingsResult, type SettingsValues } from '$lib/settings/shared';

	const RETENTION = [
		{ value: '30', label: '30 days' },
		{ value: '90', label: '90 days' },
		{ value: '365', label: '1 year' }
	];
	const ZONES = [
		{ value: 'Europe/Berlin', label: 'Berlin (UTC+1)' },
		{ value: 'Europe/London', label: 'London (UTC+0)' },
		{ value: 'America/New_York', label: 'New York (UTC−5)' }
	];
	const retentionText = (raw: string | string[]) => RETENTION.find((o) => o.value === raw)?.label ?? String(raw);

	let saves = $state(0);
	let requests = $state(0);
	let regenerated = $state(0);
	let printed = $state(0);

	/** A fake server: answers after 600 ms. */
	const wait = () => new Promise((resolve) => setTimeout(resolve, 600));

	async function requestAccess(): Promise<void> {
		await wait();
		requests += 1;
	}

	/** Refuses the first time, so the row's error is easy to see. */
	async function regenerate(): Promise<void | SettingsResult> {
		await wait();
		regenerated += 1;
		if (regenerated === 1) return { error: "Couldn't make new codes. Your old ones still work." };
	}

	async function emailCodes(): Promise<void> {
		await wait();
		throw new Error('mail service down');
	}

	/** A fake server: answers after 600 ms, and refuses one name. */
	async function submit(values: SettingsValues): Promise<void | SettingsResult> {
		await new Promise((resolve) => setTimeout(resolve, 600));
		if (values.teamName === 'Taken') return { errors: { teamName: 'Another team already uses that name.' } };
		saves += 1;
	}

	const draft = new SettingsDraft({
		fields: () => undefined,
		changes: () => undefined,
		revision: () => 7,
		submit: () => submit,
		result: () => undefined,
		pending: () => undefined,
		onDirtyChange: () => undefined,
		genericError: () => "Couldn't save. Your changes are still here."
	});
	setSettingsDraft(draft);
</script>

<form method="post" action="/settings-demo/general" data-testid="row-form" class="max-w-3xl" {@attach draft.attach} onsubmit={draft.onsubmit}>
	<SettingsSection title="General" description="Name, retention and access for Northwind Studio.">
		<SettingsRow name="teamName" label="Team name" description="Shown on invites and in the browser tab." required>
			{#snippet control()}
				<Input name="teamName" defaultValue="Northwind Studio" required maxlength={40} class="w-full @lg/settings:w-56" />
			{/snippet}
		</SettingsRow>
		<SettingsRow
			name="retention"
			label="Data retention"
			description="How long activity is kept before it is deleted."
			format={retentionText}
			impact="Activity older than the new period is deleted the night after you save."
		>
			{#snippet control()}
				<NativeSelect name="retention" defaultValue="90" options={RETENTION} class="w-full @lg/settings:w-36" />
			{/snippet}
		</SettingsRow>
		<SettingsRow name="idle" label="Sign out after" description="Ends a session that has been idle this long." format={(raw) => `${raw} minutes`}>
			{#snippet control()}
				<Input name="idle" type="number" min={5} max={720} defaultValue="60" class="w-full @lg/settings:w-32">
					{#snippet trailing()}<span class="text-xs">min</span>{/snippet}
				</Input>
			{/snippet}
		</SettingsRow>
		<SettingsRow name="digest" label="Weekly digest" description="A Monday summary of what changed." format={(raw) => (raw ? 'On' : 'Off')}>
			{#snippet control()}
				<Switch name="digest" value="true" defaultChecked />
			{/snippet}
		</SettingsRow>
		<SettingsRow name="zone" label="Time zone" description="Used for digests and reminders." summary={zoneSummary} editHref="?dialog=time-zone">
			{#snippet leading()}<span class="inline-flex size-8 items-center justify-center rounded-control bg-canvas-secondary text-fg-main"><Globe class="size-4" aria-hidden="true" /></span>{/snippet}
			{#snippet control()}
				<NativeSelect name="zone" defaultValue="Europe/Berlin" options={ZONES} class="w-full @lg/settings:w-48" />
			{/snippet}
		</SettingsRow>
		<SettingsRow label="Team ID" description="Quote it when you contact support." value="tm_8f3k2q9x" mono>
			{#snippet leading()}<span class="inline-flex size-8 items-center justify-center rounded-control bg-canvas-secondary text-fg-main"><KeyRound class="size-4" aria-hidden="true" /></span>{/snippet}
		</SettingsRow>
		<SettingsRow
			label="Single sign-on"
			description="Require members to sign in through your identity provider."
			lock={{ kind: 'plan', reason: 'Single sign-on is on the Business plan.' }}
			onRequest={requestAccess}
			lockLabels={{ request: 'Ask an owner to upgrade' }}
		>
			{#snippet control()}
				<Switch name="sso" value="true" />
			{/snippet}
		</SettingsRow>
		<SettingsRow
			data-testid="row-codes"
			label="Recovery codes"
			description="Ten one-time codes for when you lose your phone."
			value="8 of 10 left"
			actions={[
				{ label: 'Regenerate', onSelect: regenerate },
				{ label: 'View', ariaLabel: 'View recovery codes', href: '?dialog=recovery-codes' },
				{ label: 'Email them to me', onSelect: emailCodes },
				{ label: 'Mark as printed', onSelect: () => (printed += 1) }
			]}
		/>
		<RequestedChange
			data-testid="row-owner-request"
			label="Team owner"
			description="Ownership moves once the current owner agrees."
			effective="Ada Park"
			requested="Ben Ortiz"
			waitingOn="Ada Park"
			status="awaiting"
			action="/settings-demo/requests"
			hidden={{ request: 'rq_2207' }}
		/>
		{#snippet footer()}
			<span role="status" class="mr-auto" data-testid="row-dirty">
				{#if draft.status === 'pending'}Saving…{:else if draft.dirtyCount}{draft.dirtyCount === 1 ? '1 unsaved change' : `${draft.dirtyCount} unsaved changes`}{:else if draft.status === 'saved'}All changes saved{:else}No unsaved changes{/if}
			</span>
			<Button type="reset" size="sm" variant="ghost">Discard</Button>
			<Button type="submit" size="sm" variant="primary" loading={draft.status === 'pending'}>Save</Button>
		{/snippet}
	</SettingsSection>
	<p class="mt-2 text-xs text-fg-light">
		Saved <span data-testid="row-saves">{saves}</span> times. Try “Taken” as the team name to see a field error. Upgrade requests: <span data-testid="row-requests">{requests}</span>; codes printed: <span data-testid="row-printed">{printed}</span>.
	</p>
</form>

{#snippet zoneSummary()}Berlin (UTC+1){/snippet}
