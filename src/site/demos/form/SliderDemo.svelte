<script lang="ts">
	import { Field, Slider } from '$lib/primitives/form';
	import DemoForm from './DemoForm.svelte';

	let temperature = $state(0.7);
	let parallel = $state(4);
</script>

<DemoForm label="Sampling" class="mx-auto w-full max-w-xl">
	<Field label="Temperature" description="Higher is more varied.">
		<Slider name="temperature" min={0} max={1} step={0.1} showValue formatValue={(v) => v.toFixed(1)} bind:value={temperature} />
	</Field>
	<Field label="Parallel agents">
		<Slider name="parallel" min={1} max={8} showValue formatValue={(v) => `${v} agents`} bind:value={parallel} />
	</Field>
	<Slider aria-label="Locked budget" defaultValue={30} disabled />
</DemoForm>
