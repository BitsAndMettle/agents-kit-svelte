<!--
	Browser-test fixture for the Settings shared layer's SettingsDraft (tests/browser/settings).
	Not part of the catalogue: a bare form with the draft attached, until SettingsForm exists.
-->
<script lang="ts">
	import { SettingsDraft, type SettingsChange, type SettingsResult } from '$lib/settings/shared';
	import { buttonClass, INPUT_CLASS } from '$lib/ui/styles';

	let dirtyCalls = $state(0);
	let lastChanges = $state<SettingsChange[]>([]);
	let left = $state(0);

	const draft = new SettingsDraft({
		fields: () => [{ name: 'teamName', label: 'Team name' }],
		changes: () => undefined,
		revision: () => 3,
		submit: () => async (values): Promise<void | SettingsResult> => {
			await new Promise((resolve) => setTimeout(resolve, 50));
			if (values.teamName === '') return { errors: { teamName: 'Enter a team name.' } };
			if (values.teamName === 'fail') return { error: 'Could not save.' };
		},
		result: () => undefined,
		pending: () => undefined,
		onDirtyChange: () => (changes) => {
			dirtyCalls++;
			lastChanges = changes;
		},
		genericError: () => 'Something went wrong.'
	});

	$effect(() => draft.register({ name: 'retention', label: 'Retention', format: (raw) => `${raw} days` }));
</script>

<svelte:window onbeforeunload={draft.guard.beforeunload} />

<main class="p-6 text-fg-main">
	<h1 class="text-lg font-semibold">SettingsDraft fixture</h1>
	<form method="post" class="mt-4 grid max-w-sm gap-3" {@attach draft.attach} onsubmit={draft.onsubmit}>
		{#if draft.error}<p role="alert" data-form-error tabindex="-1">{draft.error}</p>{/if}
		<label class="grid gap-1">
			Team name
			<input name="teamName" defaultValue="Northwind Studio" aria-invalid={draft.fieldError('teamName') ? 'true' : undefined} class={INPUT_CLASS} />
		</label>
		{#if draft.fieldError('teamName')}<p data-testid="team-error">{draft.fieldError('teamName')}</p>{/if}
		<label class="grid gap-1">
			Retention
			<select name="retention" class={INPUT_CLASS}>
				<option value="30">30 days</option>
				<option value="90" selected>90 days</option>
			</select>
		</label>
		<label class="grid gap-1">
			Not described
			<input name="note" defaultValue="" class={INPUT_CLASS} />
		</label>
		<div class="flex gap-2">
			<button class={buttonClass()} type="submit">Save</button>
			<button class={buttonClass()} type="reset">Discard</button>
			<button class={buttonClass()} type="button" onclick={() => draft.guard.request(() => left++) || left++}>Leave</button>
			{#if draft.guard.pendingLeave}
				<button class={buttonClass()} type="button" onclick={() => draft.guard.decide('save')}>Save and leave</button>
			{/if}
		</div>
	</form>
	<dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-3 text-sm">
		<dt>Status</dt><dd data-testid="status">{draft.status}</dd>
		<dt>Dirty</dt><dd data-testid="dirty">{draft.dirtyCount}</dd>
		<dt>Changes</dt><dd data-testid="changes">{lastChanges.map((c) => `${c.label}: ${c.from} → ${c.to}`).join('; ')}</dd>
		<dt>Dirty calls</dt><dd data-testid="dirty-calls">{dirtyCalls}</dd>
		<dt>Left</dt><dd data-testid="left">{left}</dd>
	</dl>
</main>
