<script lang="ts">
	import { Checkbox } from '$lib/primitives/form';
	import DemoForm from './DemoForm.svelte';

	const checks = [
		{ value: 'lint', label: 'Lint' },
		{ value: 'types', label: 'Type check' },
		{ value: 'tests', label: 'Unit tests' }
	];
	let picked = $state<Record<string, boolean>>({ lint: true, types: false, tests: false });

	const count = $derived(Object.values(picked).filter(Boolean).length);
	const all = $derived(count === checks.length);
	const some = $derived(count > 0 && !all);

	function setAll(next: boolean): void {
		for (const check of checks) picked[check.value] = next;
	}
</script>

<DemoForm label="Required checks" class="mx-auto w-full max-w-xl" onreset={() => (picked = { lint: true, types: false, tests: false })}>
	<div class="grid gap-2">
		<Checkbox label="Run every check" checked={all} indeterminate={some} onCheckedChange={setAll} />
		<div class="ml-6 grid gap-2">
			{#each checks as check (check.value)}
				<Checkbox name="checks" value={check.value} label={check.label} bind:checked={picked[check.value]} />
			{/each}
		</div>
	</div>
	<Checkbox name="terms" required label="I reviewed the diff" description="Required: the form will not submit until this is ticked." />
	<Checkbox label="Auto-merge (not available on this plan)" disabled />
</DemoForm>
