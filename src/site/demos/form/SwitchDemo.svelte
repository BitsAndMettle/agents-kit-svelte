<script lang="ts">
	import { Switch } from '$lib/primitives/form';
	import DemoForm from './DemoForm.svelte';

	let autoRetry = $state(true);
	let digest = $state(false);
</script>

<DemoForm label="Run preferences" class="mx-auto w-full max-w-xl">
	<div class="grid divide-y divide-canvas-border rounded-control border border-card-border">
		<Switch
			name="autoRetry"
			labelFirst
			label="Retry failed runs"
			description="One automatic retry before a run is marked failed."
			bind:checked={autoRetry}
			class="w-full px-3 py-2.5"
		/>
		<Switch name="digest" value="daily" labelFirst label="Daily digest" bind:checked={digest} class="w-full px-3 py-2.5" />
		<Switch labelFirst label="Share runs publicly (admins only)" disabled class="w-full px-3 py-2.5" />
	</div>
	<div class="flex flex-wrap gap-x-6 gap-y-2">
		<Switch size="sm" label="Compact" />
		<Switch size="lg" label="Large" defaultChecked />
		<Switch label="Status {autoRetry ? 'on' : 'off'}" checked={autoRetry} onCheckedChange={(next) => (autoRetry = next)} />
	</div>
</DemoForm>
