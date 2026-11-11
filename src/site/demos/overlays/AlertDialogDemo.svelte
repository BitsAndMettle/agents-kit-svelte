<script lang="ts">
	import { AlertDialog } from '$lib/primitives/overlays';
	import { buttonClass } from '$lib/ui/styles';

	let failNext = $state(false);
	let status = $state('');

	/** Pretends to delete on a server: settles after a short wait, or fails when asked to. */
	function deleteRun(): Promise<void> {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				if (failNext) reject(new Error('The run is still uploading its logs. Try again in a minute.'));
				else {
					status = 'Run 482 deleted';
					resolve();
				}
			}, 900);
		});
	}
</script>

<div class="flex flex-wrap items-center gap-3">
	<AlertDialog
		title="Delete run 482?"
		description="This removes the run, its logs and its checkpoints. It cannot be undone."
		confirmLabel="Delete run"
		pendingLabel="Deleting…"
		tone="danger"
		onConfirm={deleteRun}
		onCancel={() => (status = 'Kept run 482')}
	>
		{#snippet trigger(t)}
			<button {...t} class={buttonClass('danger', 'md')}>Delete run</button>
		{/snippet}
	</AlertDialog>

	<AlertDialog
		title="Sign out of this computer?"
		description="Runs in progress keep going; you can sign back in at any time."
		confirmLabel="Sign out"
		onConfirm={() => (status = 'Signed out')}
	>
		{#snippet trigger(t)}
			<button {...t} class={buttonClass('secondary', 'md')}>Sign out</button>
		{/snippet}
	</AlertDialog>

	<label class="inline-flex items-center gap-2 text-xs text-fg-light">
		<input type="checkbox" bind:checked={failNext} class="size-4" />
		Make the next delete fail
	</label>
	<p class="text-xs text-fg-light" aria-live="polite">{status}</p>
</div>
