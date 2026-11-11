<script lang="ts">
	import { Field } from '$lib/primitives/form';
	import { Combobox, type PickerOption } from '$lib/primitives/menus';
	import { buttonClass } from '$lib/ui/styles';

	const people: PickerOption[] = [
		{ value: 'ana', label: 'Ana Silva', description: 'Design' },
		{ value: 'ben', label: 'Ben Okafor', description: 'Platform' },
		{ value: 'chloe', label: 'Chloe Martin', description: 'Platform' },
		{ value: 'dev', label: 'Dev Patel', description: 'Mobile' },
		{ value: 'eli', label: 'Eli Novak', description: 'On leave', disabled: true },
		{ value: 'fatima', label: 'Fatima Zahra', description: 'Docs' }
	];
	const branches: PickerOption[] = [
		{ value: 'main', label: 'main' },
		{ value: 'release/0.2', label: 'release/0.2' },
		{ value: 'feat/menus', label: 'feat/menus' }
	];
	const REPOS = ['agents-kit-svelte', 'agents-kit-docs', 'board', 'companion', 'gateway', 'worker', 'website'];

	let assignee = $state<string | null>(null);
	let branch = $state<string | null>(null);

	// Async: options arrive a moment after each keystroke, already filtered.
	let repoQuery = $state('');
	let repoOptions = $state<PickerOption[]>([]);
	let loading = $state(false);
	$effect(() => {
		const q = repoQuery.trim().toLowerCase();
		loading = true;
		const timer = setTimeout(() => {
			repoOptions = REPOS.filter((r) => r.includes(q)).map((r) => ({ value: r, label: r }));
			loading = false;
		}, 450);
		return () => clearTimeout(timer);
	});

	let submitted = $state('');
</script>

<div class="mx-auto grid max-w-xl gap-4 sm:grid-cols-2">
	<Combobox label="Assignee" options={people} bind:value={assignee} placeholder="Search people" />
	<Combobox label="Branch" options={branches} allowCustom bind:value={branch} placeholder="Pick or type a branch" />
	<Combobox
		label="Repository"
		options={repoOptions}
		filter={false}
		{loading}
		bind:query={repoQuery}
		placeholder="Search repositories"
		emptyText="No repositories"
	/>
	<form
		class="grid gap-3 rounded-card border border-card-border p-3 sm:col-span-2"
		onsubmit={(event) => {
			event.preventDefault();
			submitted = [...new FormData(event.currentTarget)].map(([k, v]) => `${k}=${v}`).join('&') || '(empty)';
		}}
		onreset={() => (submitted = '')}
	>
		<Field label="Reviewer" required>
			<Combobox name="reviewer" options={people} defaultValue="ben" />
		</Field>
		<div class="flex gap-2">
			<button type="submit" class={buttonClass('secondary', 'sm')}>Submit</button>
			<button type="reset" class={buttonClass('ghost', 'sm')}>Reset</button>
		</div>
		<p class="text-xs text-fg-light">
			Assignee <span class="text-fg-main">{assignee ?? 'none'}</span> · branch <span class="text-fg-main">{branch ?? 'none'}</span> · form
			<span class="text-fg-main" data-testid="combobox-submitted">{submitted || 'not sent'}</span>
		</p>
	</form>
</div>
