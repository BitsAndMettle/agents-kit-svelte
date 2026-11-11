<script lang="ts">
	import { Check, ChevronDown } from '@lucide/svelte';
	import { Popover } from '$lib/primitives/overlays';
	import { cn } from '$lib/ui/cn';
	import { buttonClass, SEGMENT_GROUP_CLASS, segmentClass } from '$lib/ui/styles';

	type Side = 'top' | 'right' | 'bottom' | 'left';
	const sides: Side[] = ['top', 'right', 'bottom', 'left'];
	let side = $state<Side>('bottom');

	const people = ['Ada Okafor', 'Ben Laurent', 'Chiara Rossi', 'Dev Patel'];
	let assignee = $state('Ada Okafor');
	let assignOpen = $state(false);
</script>

<div class="flex flex-wrap items-start gap-6">
	<!-- Near the right edge the card shifts left to stay in view; the arrow still points at the trigger. -->
	<div class="flex w-full justify-end">
		<Popover arrow placement="bottom" title="Share this run" description="Anyone with the link can read the log, not change it.">
			{#snippet trigger(t)}
				<button {...t} class={buttonClass('secondary', 'md')}>Share</button>
			{/snippet}
		</Popover>
	</div>

	<div class="grid gap-3">
		<div class={SEGMENT_GROUP_CLASS} role="group" aria-label="Popover side">
			{#each sides as s (s)}
				<button type="button" aria-pressed={side === s} class={segmentClass(side === s)} onclick={() => (side = s)}>{s}</button>
			{/each}
		</div>
		<Popover arrow placement={side} title="Run 482" description="Started 4 minutes ago on the devbox.">
			{#snippet trigger(t)}
				<button {...t} class={buttonClass('secondary', 'md', 'w-fit')}>Run details</button>
			{/snippet}
			<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
				<dt class="text-fg-light">Branch</dt>
				<dd>feat/overlays</dd>
				<dt class="text-fg-light">Steps</dt>
				<dd>14 of 20</dd>
			</dl>
		</Popover>
	</div>

	<Popover bind:open={assignOpen} matchWidth placement="bottom-start" aria-label="Choose an assignee" class="p-1">
		{#snippet trigger(t)}
			<button {...t} class={cn(buttonClass('secondary', 'md'), 'w-56 justify-between')}>
				<span>Assignee: {assignee}</span>
				<ChevronDown aria-hidden="true" />
			</button>
		{/snippet}
		<div class="grid">
			{#each people as person (person)}
				<button
					type="button"
					aria-pressed={assignee === person}
					class={cn(buttonClass('ghost', 'md'), 'justify-between rounded-control text-fg-main')}
					onclick={() => {
						assignee = person;
						assignOpen = false;
					}}
				>
					{person}
					{#if assignee === person}<Check aria-hidden="true" />{/if}
				</button>
			{/each}
		</div>
	</Popover>
</div>
