<!--
	Browser-test fixture for the Settings save group (tests/browser/keyboard/settings-save.spec.ts).
	Not part of the catalogue: failures no demo answers with.

	- A SettingsForm with no SaveBar whose save answers with a conflict, and one handed a conflict
	  as its `result` (a native round trip).
	- ConsequenceDialogs whose confirm answers with field errors (on its own and inside a
	  SettingsForm), with a conflict once, and one handed a conflict as its `result`.
	Every handler answers after 600 ms.
-->
<script lang="ts">
	import { Button } from '$lib/primitives/actions';
	import { Input } from '$lib/primitives/form';
	import { ConsequenceDialog, SettingsForm } from '$lib/settings/save';
	import { SettingsRow } from '$lib/settings/rows';
	import type { SettingsResult } from '$lib/settings/shared';

	const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 600));

	async function saveConflict(): Promise<SettingsResult> {
		await wait();
		return { conflict: { message: 'Someone else renamed this a moment ago. Your change is kept.' } };
	}

	let fieldOpen = $state(false);
	let nestedOpen = $state(false);
	let conflictOpen = $state(false);
	let roundTripOpen = $state(false);
	let confirms = $state(0);

	async function refuseFields(): Promise<SettingsResult> {
		await wait();
		return { errors: { confirm: 'That name was changed; type the new one.', 'owner.d1': 'Pick someone who is still a member.', reason: 'Say why.' } };
	}
	let conflicted = false;
	async function conflictOnce(): Promise<SettingsResult | void> {
		await wait();
		confirms++;
		if (!conflicted) {
			conflicted = true;
			return { conflict: { message: 'Someone else removed it first. Reload to see it.' } };
		}
	}

	const reassign = {
		label: 'Who takes over',
		name: 'owner',
		dependents: [{ id: 'd1', label: 'Weekly report' }],
		options: [
			{ value: 'm1', label: 'Ada Park' },
			{ value: 'm2', label: 'Ben Ortiz' }
		]
	};
	const consequences = [{ tone: 'no' as const, label: 'It is gone for everyone' }];
</script>

<main class="@container/settings mx-auto flex max-w-3xl flex-col gap-6 p-4 text-fg-main">
	<h1 class="text-lg font-semibold">Settings save fixture</h1>

	<section data-testid="form-conflict" class="flex flex-col gap-2">
		<h2 class="m-0 text-base font-semibold">No SaveBar, conflict from the handler</h2>
		<SettingsForm onSubmit={saveConflict} aria-label="Name form">
			{#snippet children()}
				<ul role="list" class="m-0 list-none p-0">
					<SettingsRow name="name1" label="Name one">
						{#snippet control()}<Input name="name1" defaultValue="A" />{/snippet}
					</SettingsRow>
				</ul>
				<Button type="submit">Save name</Button>
			{/snippet}
		</SettingsForm>
	</section>

	<section data-testid="form-round-trip" class="flex flex-col gap-2">
		<h2 class="m-0 text-base font-semibold">No SaveBar, conflict from the round trip</h2>
		<SettingsForm action="?/rename" result={{ conflict: { message: 'The server saw a newer revision.' } }} aria-label="Round trip form">
			{#snippet children()}
				<ul role="list" class="m-0 list-none p-0">
					<SettingsRow name="name2" label="Name two">
						{#snippet control()}<Input name="name2" defaultValue="A" />{/snippet}
					</SettingsRow>
				</ul>
			{/snippet}
		</SettingsForm>
	</section>

	<section data-testid="dialogs" class="flex flex-wrap gap-2">
		<Button onclick={() => (fieldOpen = true)}>Open field errors</Button>
		<Button onclick={() => (conflictOpen = true)}>Open conflict once</Button>
		<Button onclick={() => (roundTripOpen = true)}>Open round trip</Button>
		<p data-testid="confirms">{confirms}</p>
	</section>

	<ConsequenceDialog bind:open={fieldOpen} title="Remove report?" {consequences} {reassign} confirmPhrase="report" confirmLabel="Remove report" onConfirm={refuseFields} />
	<ConsequenceDialog bind:open={conflictOpen} title="Remove thing?" {consequences} confirmLabel="Remove thing" onConfirm={conflictOnce} />
	<ConsequenceDialog bind:open={roundTripOpen} title="Remove it?" {consequences} confirmLabel="Remove it" action="?/remove" result={{ conflict: { message: 'Someone else removed it first.' } }} />

	<section data-testid="nested" class="flex flex-col gap-2">
		<h2 class="m-0 text-base font-semibold">A dialog inside a SettingsForm</h2>
		<SettingsForm onSubmit={wait} aria-label="Nested form">
			{#snippet children()}
				<Button onclick={() => (nestedOpen = true)}>Open nested field errors</Button>
				<ConsequenceDialog bind:open={nestedOpen} title="Remove nested report?" {consequences} {reassign} confirmPhrase="report" confirmLabel="Remove nested report" onConfirm={refuseFields} />
			{/snippet}
		</SettingsForm>
	</section>
</main>
