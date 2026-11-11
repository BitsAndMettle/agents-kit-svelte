<script lang="ts">
	import { Progress } from '$lib/primitives/display';

	let value = $state(40);
</script>

<div class="flex max-w-md flex-col gap-5">
	<Progress {value} label="Upload" showValue />
	<Progress value={7} max={10} tone="success" label="Tasks done" showValue valueText={(v, p) => `${v} of 10 (${Math.round(p)}%)`} />
	<Progress value={92} tone="warning" size="md" label="Quota" showValue />
	<Progress tone="accent" label="Waiting for the runner" />
	<label class="flex items-center gap-2 text-xs text-fg-light">
		Value
		<input type="range" min="0" max="100" bind:value />
	</label>
</div>
