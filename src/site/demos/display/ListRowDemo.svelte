<script lang="ts">
	import { Badge, Card, ListRow } from '$lib/primitives/display';
	import { buttonClass } from '$lib/ui/styles';

	interface Machine {
		id: string;
		name: string;
		online: boolean;
		detail: string;
		warning?: string;
	}

	const ALL: Machine[] = [
		{ id: 'build-box', name: 'Build box', online: true, detail: 'Build 4f2a91c · 2 of 3 slots free' },
		{ id: 'laptop', name: 'Laptop', online: true, detail: 'Build 4f2a91c · 1 of 1 slots free', warning: 'Agent signed out' },
		{ id: 'old-mini', name: 'Old mini', online: false, detail: 'Last seen 3 days ago' }
	];

	let machines = $state(ALL);
</script>

<div class="mx-auto grid max-w-xl gap-4">
	<Card title="Computers" headingLevel={4}>
		{#snippet actions()}
			<button type="button" class={buttonClass('secondary', 'xs')} onclick={() => (machines = ALL)}>Show all again</button>
		{/snippet}
		<ul class="m-0 list-none p-0">
			{#each machines as machine (machine.id)}
				<ListRow title={machine.name} description={machine.detail}>
					<Badge tone={machine.online ? 'success' : 'neutral'} dot>{machine.online ? 'Online' : 'Offline'}</Badge>
					{#if machine.warning}<Badge tone="warning">{machine.warning}</Badge>{/if}
					{#snippet actions()}
						<button type="button" aria-label="Revoke {machine.name}" class={buttonClass('secondary', 'xs')} onclick={() => (machines = machines.filter((other) => other.id !== machine.id))}>Revoke</button>
					{/snippet}
				</ListRow>
			{/each}
		</ul>
	</Card>
	<Card title="Repositories" headingLevel={4}>
		<ul class="m-0 list-none p-0">
			<ListRow title="example/site" href="#list-row"><Badge tone="success">Protected</Badge></ListRow>
			<ListRow title="example/an-unusually-long-repository-name-that-has-to-wrap-somewhere" href="#list-row" description="The default branch is not protected yet.">
				<Badge tone="warning">Open</Badge>
			</ListRow>
		</ul>
	</Card>
</div>
