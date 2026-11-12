<script lang="ts">
	import { ArrowRight } from '@lucide/svelte';
	import { SaveBar, SettingsForm } from '$lib/settings/save';
	import { RECIPES, SETTINGS_CONTAINER, type SettingsDraft, type SettingsResult, type SettingsSubmitContext, type SettingsValues } from '$lib/settings/shared';
	import { Input, NativeSelect, Switch } from '$lib/primitives/form';
	import { Button } from '$lib/primitives/actions';
	import { cn } from '$lib/ui/cn';

	const RETENTION = [
		{ value: '30', label: '30 days' },
		{ value: '90', label: '90 days' },
		{ value: '365', label: '1 year' }
	];
	const fields = [
		{ name: 'teamName', label: 'Team name' },
		{ name: 'retention', label: 'Data retention' },
		{ name: 'digest', label: 'Weekly digest' }
	];

	let revision = $state(7);
	let controller = $state<SettingsDraft>();
	let teammateSaves = $state(false);
	let here = $state('General');
	let log = $state('');

	const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	/** Pretends to save on a server: answers after 600 ms, checks the name, and can report a stale revision. */
	async function save(values: SettingsValues, context: SettingsSubmitContext): Promise<SettingsResult | void> {
		await wait(600);
		const name = String(values.teamName ?? '').trim();
		if (!name) return { errors: { teamName: 'Enter a team name.' } };
		if (name.length > 40) return { error: 'The server refused the name. Nothing was saved.' };
		if (teammateSaves) {
			teammateSaves = false;
			revision += 1;
			return { conflict: { message: 'Ben Ortiz saved these settings a moment ago. Your changes are kept: save again to replace his.' } };
		}
		revision += 1;
		log = `Saved revision ${revision}: ${context.changes.map((c) => `${c.label} → ${c.to}`).join(', ')}`;
	}

	function goTo(place: string): void {
		const held = controller?.guard.request(() => (here = place));
		if (!held) here = place;
	}

	const LABEL = 'text-[13px] font-medium text-fg-main';
	const HELP = 'm-0 text-xs leading-5 text-fg-light';
	const WAS = 'm-0 text-xs font-medium text-accent-primary';
</script>

<div class={cn(SETTINGS_CONTAINER, 'mx-auto grid w-full max-w-2xl gap-3')}>
	<nav aria-label="Demo navigation" class="flex flex-wrap items-center gap-2 text-xs text-fg-light">
		<span>You are on <strong class="font-semibold text-fg-main" data-testid="sf-here">{here}</strong>.</span>
		<Button size="xs" variant="ghost" onclick={() => goTo('Members')}>
			Go to Members
			{#snippet trailing()}<ArrowRight aria-hidden="true" />{/snippet}
		</Button>
		<label class="ml-auto inline-flex items-center gap-1.5">
			<input type="checkbox" bind:checked={teammateSaves} class="size-3.5 accent-accent-primary" />
			A teammate saves first
		</label>
	</nav>

	<SettingsForm action="/settings-demo/general" {fields} {revision} onSubmit={save} bind:controller aria-label="General settings">
		{#snippet children(draft)}
			<section aria-labelledby="sfd-heading" class={RECIPES.section}>
				<header class={RECIPES.sectionHeader}>
					<div class="min-w-0 flex-1">
						<h3 id="sfd-heading" class="m-0 text-sm font-semibold text-fg-main">General</h3>
						<p class={HELP}>How your team appears to members and guests.</p>
					</div>
				</header>
				<ul role="list" class={RECIPES.list}>
					<li class={cn(RECIPES.row, draft.isDirty('teamName') && RECIPES.rowStaged)}>
						<div class="min-w-0">
							<label for="sfd-team" class={LABEL}>Team name</label>
							<p id="sfd-team-help" class={HELP}>Shown on invites and in the sidebar.</p>
							{#if draft.isDirty('teamName')}<p class={WAS}>Unsaved · was {draft.previous('teamName')}</p>{/if}
						</div>
						<div class="w-full @lg/settings:w-60">
							<Input
								id="sfd-team"
								name="teamName"
								defaultValue="Northwind Studio"
								autocomplete="organization"
								invalid={Boolean(draft.fieldError('teamName'))}
								aria-describedby={draft.fieldError('teamName') ? 'sfd-team-help sfd-team-error' : 'sfd-team-help'}
							/>
							{#if draft.fieldError('teamName')}
								<p id="sfd-team-error" class="m-0 mt-1 text-xs text-status-danger">{draft.fieldError('teamName')}</p>
							{/if}
						</div>
					</li>
					<li class={cn(RECIPES.row, draft.isDirty('retention') && RECIPES.rowStaged)}>
						<div class="min-w-0">
							<label for="sfd-retention" class={LABEL}>Data retention</label>
							<p id="sfd-retention-help" class={HELP}>How long activity is kept before it is deleted.</p>
							{#if draft.isDirty('retention')}<p class={WAS}>Unsaved · was {draft.previous('retention')}</p>{/if}
						</div>
						<NativeSelect id="sfd-retention" name="retention" options={RETENTION} defaultValue="90" aria-describedby="sfd-retention-help" class="@lg/settings:w-60" />
					</li>
					<li class={cn(RECIPES.row, draft.isDirty('digest') && RECIPES.rowStaged)}>
						<div class="min-w-0">
							<label for="sfd-digest" class={LABEL}>Weekly digest</label>
							<p id="sfd-digest-help" class={HELP}>A summary of the week, every Monday.</p>
							{#if draft.isDirty('digest')}<p class={WAS}>Unsaved · was {draft.previous('digest')}</p>{/if}
						</div>
						<Switch id="sfd-digest" name="digest" defaultChecked aria-describedby="sfd-digest-help" />
					</li>
				</ul>
			</section>
			<SaveBar layout="sticky" impact="Members see the new name the next time they open the app." />
		{/snippet}
	</SettingsForm>

	<p class="m-0 min-h-5 text-xs text-fg-light" aria-live="polite" data-testid="sf-log">{log}</p>
</div>
