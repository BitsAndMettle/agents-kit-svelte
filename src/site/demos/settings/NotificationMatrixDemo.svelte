<script lang="ts">
	import { Bell, Mail, MessageSquareText, Smartphone } from '@lucide/svelte';
	import { NotificationMatrix, type NotificationChannel, type NotificationEvent } from '$lib/settings/controls';
	import { SaveBar, SettingsForm } from '$lib/settings/save';
	import { RECIPES, type SettingsResult, type SettingsValues } from '$lib/settings/shared';

	/** A slow server: answers after 600 ms. */
	const wait = (ms = 600) => new Promise<void>((resolve) => setTimeout(resolve, ms));

	const events: NotificationEvent[] = [
		{ id: 'mention', label: 'Mentions', description: 'Someone mentions you or your team.', group: 'Activity' },
		{ id: 'reply', label: 'Replies', description: 'A reply in a thread you follow.', group: 'Activity' },
		{ id: 'assigned', label: 'Assigned to you', group: 'Activity' },
		{ id: 'security', label: 'Security alerts', description: 'New sign-ins and password changes.', group: 'Account' },
		{ id: 'digest', label: 'Weekly summary', description: 'Every Monday morning.', group: 'Account' }
	];
	let push = $state<NotificationChannel['permission']>('prompt');
	const channels = $derived<NotificationChannel[]>([
		{ id: 'app', label: 'In app', icon: Bell },
		{ id: 'email', label: 'Email', icon: Mail },
		{ id: 'push', label: 'Push', icon: Smartphone, permission: push },
		{ id: 'sms', label: 'Text', icon: MessageSquareText, unavailable: 'Add a verified phone number first.' }
	]);
	const locked = { 'security:email': { checked: true, reason: 'Needed to keep your account safe.' } };

	let value = $state(['mention:app', 'mention:email', 'reply:app', 'assigned:app', 'assigned:email', 'digest:email', 'security:sms']);
	/** Weekly summary by push is refused, so a revert can be seen. */
	async function commitCell(event: string, channel: string): Promise<void | SettingsResult> {
		await wait();
		if (event === 'digest' && channel === 'push') return { error: "Weekly summary can't be sent by push. Changed back." };
	}
	async function askPermission(): Promise<void> {
		await wait();
		push = 'granted';
	}

	const teamEvents: NotificationEvent[] = [
		{ id: 'joined', label: 'Someone joins the team' },
		{ id: 'left', label: 'Someone leaves the team' },
		{ id: 'billing', label: 'An invoice is ready' }
	];
	const teamChannels: NotificationChannel[] = [
		{ id: 'email', label: 'Email', icon: Mail },
		{ id: 'app', label: 'In app', icon: Bell }
	];
	/** Saving with no way to hear about invoices is refused with a message on the cells. */
	async function saveTeam(values: SettingsValues): Promise<void | SettingsResult> {
		await wait();
		const on = ([] as unknown[]).concat(values.team ?? []).map(String);
		if (!on.some((key) => key.startsWith('billing:'))) return { errors: { team: 'Pick at least one way to hear about invoices.' } };
		saves++;
	}

	let saves = $state(0);
</script>

<div class="@container/settings mx-auto flex w-full max-w-3xl flex-col gap-4">
	<section class={RECIPES.section} aria-labelledby="nm-title">
		<div class={RECIPES.sectionHeader}>
			<div class="min-w-0 flex-1">
				<h3 id="nm-title" class="m-0 text-sm font-semibold text-fg-main">Notify me</h3>
				<p class="m-0 mt-0.5 text-xs leading-5 text-fg-light">Each change saves on its own. Weekly summary by Push is refused in this demo.</p>
			</div>
		</div>
		<div class="px-4 py-3">
			<NotificationMatrix
				{events}
				{channels}
				{locked}
				bind:value
				onCellCommit={commitCell}
				onRequestPermission={askPermission}
				columnToggle
				action="/settings-demo/notifications"
				labels={{ caption: 'Notify me' }}
				data-testid="nm-instant"
			/>
			<p class="m-0 mt-2 text-xs text-fg-light" data-testid="nm-saved">Saved: {value.length} cells</p>
		</div>
	</section>

	<!-- Staged: a SettingsForm turns the cells below it staged; its SaveBar saves them together. -->
	<SettingsForm action="/settings-demo/team-notices" revision={saves} onSubmit={saveTeam} aria-labelledby="nm-staged-title" class={RECIPES.section} data-testid="nm-staged">
		{#snippet children()}
			<div class={RECIPES.sectionHeader}>
				<div class="min-w-0 flex-1">
					<h3 id="nm-staged-title" class="m-0 text-sm font-semibold text-fg-main">Team notices</h3>
					<p class="m-0 mt-0.5 text-xs leading-5 text-fg-light">Who hears about team changes. Changes apply when you save; leaving invoices with no way to reach you is refused.</p>
				</div>
			</div>
			<div class="flex flex-col gap-5 px-4 py-4">
				<NotificationMatrix events={teamEvents} channels={teamChannels} name="team" defaultValue={['joined:email', 'billing:email', 'billing:app']} layout="list" labels={{ caption: 'Team notices' }} data-testid="nm-list" />
			</div>
			<SaveBar layout="footer" data-testid="nm-staged-bar" />
		{/snippet}
	</SettingsForm>
</div>
