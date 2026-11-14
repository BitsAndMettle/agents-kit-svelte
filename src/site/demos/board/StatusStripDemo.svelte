<script lang="ts">
	import { StatusStrip, type StatusStat } from '$lib/board';
	import { buttonClass } from '$lib/ui/styles';

	const stats: StatusStat[] = [
		{ id: 'runs', label: 'Runs', value: 7.4, unit: '/h' },
		{ id: 'merges', label: 'Merges', value: 3.2, unit: '/h' },
		{ id: 'ttm', label: 'Ready to merged', value: 2280, format: 'duration' },
		{ id: 'slots', label: 'Slots', value: 4, max: 6 }
	];

	let paused = $state(false);
</script>

<div class="flex flex-col gap-3">
	<StatusStrip status={paused ? 'Paused by you' : 'Running'} tone={paused ? 'warning' : 'success'} {stats}>
		{#snippet actions()}
			<button type="button" class={buttonClass('secondary', 'xs')} onclick={() => (paused = !paused)}>{paused ? 'Resume' : 'Pause'}</button>
		{/snippet}
	</StatusStrip>
	<!-- In a narrow container the numbers wrap under the status. -->
	<div class="max-w-xs">
		<StatusStrip status="Running" tone="success" {stats} />
	</div>
</div>
