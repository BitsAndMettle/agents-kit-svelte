<script lang="ts">
	import { Field, RadioGroup, type RadioOption } from '$lib/primitives/form';
	import DemoForm from './DemoForm.svelte';

	const models: RadioOption[] = [
		{ value: 'fast', label: 'Fast', description: 'Quick edits and small fixes.' },
		{ value: 'balanced', label: 'Balanced', description: 'Most everyday work.' },
		{ value: 'deep', label: 'Deep', description: 'Long refactors. Not on this plan.', disabled: true },
		{ value: 'careful', label: 'Careful', description: 'Reviews and risky changes.' }
	];
	const effort: RadioOption[] = [
		{ value: 'low', label: 'Low' },
		{ value: 'medium', label: 'Medium' },
		{ value: 'high', label: 'High' }
	];

	let model = $state<string | null>(null);
	let level = $state<string | null>('medium');
</script>

<DemoForm label="Agent setup" class="mx-auto w-full max-w-xl">
	<Field label="Model" group required hint="Arrow keys move and select; the disabled option is skipped.">
		<RadioGroup name="model" options={models} bind:value={model} />
	</Field>
	<Field label="Effort" group>
		<RadioGroup name="effort" orientation="horizontal" options={effort} bind:value={level} />
	</Field>
	<p class="text-xs text-fg-light">Model: {model ?? 'none'} · Effort: {level ?? 'none'}</p>
</DemoForm>
