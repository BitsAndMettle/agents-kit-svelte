<script lang="ts">
	import { untrack } from 'svelte';
	import { Bell, Mail, MessageSquareText, Smartphone } from '@lucide/svelte';
	import { Button } from '$lib/primitives/actions';
	import { DANGER_TEXT } from '$lib/primitives/form/classes';
	import { NotificationMatrix, type NotificationChannel, type NotificationEvent } from '$lib/settings/controls';
	import { RECIPES, SettingsDraft, setSettingsDraft, type SettingsResult } from '$lib/settings/shared';
	import NotificationMatrixDemoSelf from './NotificationMatrixDemo.svelte';

	interface Props {
		/** Renders only the staged form, inside its own SettingsDraft (the demo renders itself once more with it). */
		staged?: boolean;
	}
	let { staged = false }: Props = $props();

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
	async function saveTeam(): Promise<void> {
		await wait();
	}

	// ---- The staged form. ----
	// A SettingsDraft in context turns every control below it staged, so the staged form is this same
	// demo rendered again with `staged` (its own component, so the instant controls above stay instant).
	// It stands in for SettingsForm and SaveBar, which another group builds.
	let saves = $state(0);
	const draft = untrack(() => staged)
		? new SettingsDraft({
				fields: () => undefined,
				changes: () => undefined,
				revision: () => saves,
				submit: () => async () => {
					await saveTeam();
					saves++;
				},
				result: () => undefined,
				pending: () => undefined,
				onDirtyChange: () => undefined,
				genericError: () => "Couldn't save. Your changes are still here."
			})
		: undefined;
	if (draft) setSettingsDraft(draft);
</script>

{#if draft}
	<form method="post" action="/settings-demo/team-notices" class={RECIPES.section} aria-labelledby="nm-staged-title" data-testid="nm-staged" {@attach draft.attach} onsubmit={draft.onsubmit}>
		<div class={RECIPES.sectionHeader}>
			<div class="min-w-0 flex-1">
				<h3 id="nm-staged-title" class="m-0 text-sm font-semibold text-fg-main">Team notices</h3>
				<p class="m-0 mt-0.5 text-xs leading-5 text-fg-light">Who hears about team changes. Changes apply when you save.</p>
			</div>
		</div>
		{#if draft.error}<p role="alert" data-form-error tabindex="-1" class="m-0 border-b border-canvas-border px-4 py-2 text-xs font-medium {DANGER_TEXT}">{draft.error}</p>{/if}
		<div class="flex flex-col gap-5 px-4 py-4">
			<NotificationMatrix events={teamEvents} channels={teamChannels} name="team" defaultValue={['joined:email', 'billing:email', 'billing:app']} layout="list" labels={{ caption: 'Team notices' }} data-testid="nm-list" />
		</div>
		<div class={RECIPES.sectionFooter}>
			<p role="status" class="m-0 min-w-0 flex-1" data-testid="nm-staged-status">
				{#if draft.status === 'pending'}Saving…{:else if draft.dirtyCount > 0}{draft.changes.map((c) => `${c.label}: ${c.from || '—'} → ${c.to || '—'}`).join('; ')}{:else if draft.status === 'saved'}Saved{:else}No unsaved changes{/if}
			</p>
			<Button type="reset" size="sm" variant="ghost" softDisabled={draft.dirtyCount === 0}>Discard</Button>
			<Button type="submit" size="sm" variant="accent" loading={draft.pending}>Save</Button>
		</div>
	</form>
{:else}
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

		<NotificationMatrixDemoSelf staged />
	</div>
{/if}
