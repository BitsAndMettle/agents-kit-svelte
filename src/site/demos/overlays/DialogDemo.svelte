<script lang="ts">
	import { Info } from '@lucide/svelte';
	import { Dialog, Popover, Tooltip } from '$lib/primitives/overlays';
	import { buttonClass, INPUT_CLASS } from '$lib/ui/styles';

	let editOpen = $state(false);
	let name = $state('Release notes agent');
	let draft = $state('');
	let saved = $state('');

	const changes = [
		'Approvals now show who asked and why.',
		'Runs that wait on a person move to the top of the Board.',
		'The context meter counts cached tokens separately.',
		'Tool results collapse once they are older than ten steps.',
		'Pairing a second computer no longer signs the first one out.',
		'Skills show the version they were last run with.',
		'Retries keep the original run’s log and add their own.',
		'Long branch names are shortened in the middle, not the end.',
		'Keyboard focus is visible on every card action.',
		'The diff view remembers whether you chose split or unified.'
	];
</script>

<div class="flex flex-wrap items-center gap-3">
	<Dialog
		bind:open={editOpen}
		title="Edit agent"
		description="The name shows on the Board and in run logs."
		onOpenChange={(open) => open && (draft = name)}
	>
		{#snippet trigger(t)}
			<button {...t} class={buttonClass('secondary', 'md')}>Edit agent</button>
		{/snippet}
		<label class="grid gap-1 text-xs font-medium text-fg-light">
			Name
			<input class={INPUT_CLASS} bind:value={draft} />
		</label>
		<div class="mt-3 flex items-center gap-2 text-xs text-fg-light">
			Model: Opus
			<Popover arrow placement="top" title="Models" description="Each agent runs on one model; change it in Settings.">
				{#snippet trigger(t)}
					<!-- Two parts on one button: it opens the popover and has a tooltip. -->
					<Tooltip content="About models">
						{#snippet trigger(tip)}
							<button {...t} {...tip} aria-label="About models" class={buttonClass('ghost', 'icon-xs')}><Info aria-hidden="true" /></button>
						{/snippet}
					</Tooltip>
				{/snippet}
			</Popover>
		</div>
		{#snippet footer(close)}
			<button type="button" class={buttonClass('ghost', 'md')} onclick={close}>Cancel</button>
			<button
				type="button"
				class={buttonClass('primary', 'md')}
				onclick={() => {
					name = draft.trim() || name;
					saved = `Saved “${name}”`;
					close();
				}}
			>
				Save
			</button>
		{/snippet}
	</Dialog>

	<Dialog title="What’s new" description="Changes in this week’s release." size="full">
		{#snippet trigger(t)}
			<button {...t} class={buttonClass('ghost', 'md')}>Read release notes</button>
		{/snippet}
		<ul class="list-disc space-y-3 pl-5">
			{#each changes as change (change)}
				<li>{change}</li>
			{/each}
		</ul>
		{#snippet footer(close)}
			<button type="button" class={buttonClass('primary', 'md')} onclick={close}>Got it</button>
		{/snippet}
	</Dialog>

	<p class="text-xs text-fg-light" aria-live="polite">{saved}</p>
</div>
