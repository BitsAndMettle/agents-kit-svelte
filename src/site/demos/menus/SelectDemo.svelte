<script lang="ts">
	import { Select, type PickerOption } from '$lib/primitives/menus';
	import { buttonClass } from '$lib/ui/styles';

	const models: PickerOption[] = [
		{ value: 'quick', label: 'Quick', description: 'Fast answers for small edits', group: 'Everyday' },
		{ value: 'balanced', label: 'Balanced', description: 'The default for most tasks', group: 'Everyday' },
		{ value: 'deep', label: 'Deep', description: 'Long plans and hard bugs', group: 'Heavy' },
		{ value: 'legacy', label: 'Legacy', description: 'Retired', group: 'Heavy', disabled: true }
	];
	const labels: PickerOption[] = [
		{ value: 'bug', label: 'bug' },
		{ value: 'docs', label: 'docs' },
		{ value: 'feature', label: 'feature' },
		{ value: 'infra', label: 'infra' },
		{ value: 'security', label: 'security' }
	];
	const reviewers: PickerOption[] = [
		{ value: 'ana', label: 'Ana' },
		{ value: 'ben', label: 'Ben' },
		{ value: 'chloe', label: 'Chloe' },
		{ value: 'dev', label: 'Dev' }
	];
	const priorities: PickerOption[] = [
		{ value: 'p1', label: 'P1 · urgent' },
		{ value: 'p2', label: 'P2 · soon' },
		{ value: 'p3', label: 'P3 · later' }
	];

	let model = $state<string | null>('balanced');
	let picked = $state<string[]>(['bug', 'docs']);
	let submitted = $state('');
</script>

<div class="mx-auto grid max-w-xl gap-4 sm:grid-cols-2">
	<Select label="Model" options={models} bind:value={model} />
	<Select label="Labels" options={labels} multiple bind:value={picked} placeholder="Add labels" />
	<Select label="Reviewers" options={reviewers} multiple display="count" value={['ana', 'chloe']} />
	<Select label="Branch" options={[]} placeholder="No branches yet" disabled />
	<form
		class="grid gap-3 rounded-card border border-card-border p-3 sm:col-span-2"
		onsubmit={(event) => {
			event.preventDefault();
			submitted = [...new FormData(event.currentTarget)].map(([k, v]) => `${k}=${v}`).join('&') || '(empty)';
		}}
		onreset={() => (submitted = '')}
	>
		<Select label="Priority" name="priority" options={priorities} required placeholder="Pick a priority" />
		<div class="flex gap-2">
			<button type="submit" class={buttonClass('secondary', 'sm')}>Submit</button>
			<button type="reset" class={buttonClass('ghost', 'sm')}>Reset</button>
		</div>
		<p class="text-xs text-fg-light">Model <span class="text-fg-main">{model ?? 'none'}</span> · labels <span class="text-fg-main">{picked.join(', ') || 'none'}</span> · form <span class="text-fg-main" data-testid="select-submitted">{submitted || 'not sent'}</span></p>
	</form>
</div>
