<script lang="ts">
	import { AlertDialog } from '$lib/primitives/overlays';
	import { buttonClass } from '$lib/ui/styles';

	let failNext = $state(false);
	let status = $state('');
	let understood = $state(false);
	let removed = $state(false);
	let statusLine = $state<HTMLElement | null>(null);

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

	<AlertDialog
		title="Remove 3 members?"
		description="Ada, Ben and Chloé will no longer see this team's projects."
		confirmLabel="Remove members"
		tone="danger"
		confirmDisabled={!understood}
		confirmDescribedBy={understood ? undefined : 'alert-dialog-demo-ack'}
		narrow="sheet"
		returnFocus={() => (removed ? statusLine : null)}
		onOpenChange={(open) => {
			if (!open) return;
			understood = false;
			removed = false;
		}}
		onConfirm={() => {
			status = '3 members removed';
			removed = true;
		}}
	>
		{#snippet trigger(t)}
			<button {...t} class={buttonClass('secondary', 'md')}>Remove 3 members</button>
		{/snippet}
		<label class="flex items-center gap-2">
			<input type="checkbox" bind:checked={understood} class="size-4" />
			They lose access at once
		</label>
		<p id="alert-dialog-demo-ack" class="mt-1 text-xs text-fg-light" class:sr-only={understood}>Tick the box to confirm.</p>
	</AlertDialog>

	<label class="inline-flex items-center gap-2 text-xs text-fg-light">
		<input type="checkbox" bind:checked={failNext} class="size-4" />
		Make the next delete fail
	</label>
	<!-- After a removal, focus lands here (the removed rows would be gone in a real list). -->
	<p bind:this={statusLine} tabindex="-1" class="text-xs text-fg-light focus:outline-none" aria-live="polite" data-testid="alert-dialog-demo-status">{status}</p>
</div>
