<script lang="ts">
	import { Search } from '@lucide/svelte';
	import { Field, Input } from '$lib/primitives/form';
	import DemoForm from './DemoForm.svelte';

	let query = $state('flaky test');
	let repo = $state('');
	let budget = $state<number | null>(40);
</script>

<DemoForm label="Run filters" class="mx-auto w-full max-w-xl">
	<Input name="q" aria-label="Search runs" placeholder="Search runs" clearable bind:value={query}>
		{#snippet leading()}<Search aria-hidden="true" />{/snippet}
	</Input>
	<div class="grid gap-4 sm:grid-cols-2">
		<Field label="Repository" required description="Owner and name.">
			<Input name="repo" placeholder="acme/website" bind:value={repo}>
				{#snippet leading()}<span class="text-xs">github.com/</span>{/snippet}
			</Input>
		</Field>
		<Field label="Token budget">
			<Input name="budget" type="number" min={0} step={5} bind:value={budget}>
				{#snippet trailing()}<span class="text-xs">k tokens</span>{/snippet}
			</Input>
		</Field>
	</div>
	<div class="grid gap-3 sm:grid-cols-3">
		<Input size="sm" aria-label="Small" placeholder="Small" />
		<Input aria-label="Invalid" defaultValue="not-a-branch name" invalid />
		<Input size="lg" aria-label="Disabled" value="main" disabled />
	</div>
</DemoForm>
