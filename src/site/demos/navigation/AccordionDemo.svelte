<script lang="ts">
	import { Accordion } from '$lib/primitives/navigation';

	let single = $state<string | string[] | null>('runs');
	let several = $state<string | string[] | null>(['runs']);
</script>

{#snippet runs()}<p>A run is one agent session on a card. It ends when the agent finishes or you stop it.</p>{/snippet}
{#snippet logs()}<p>Logs stay on the machine that ran the agent. Searching the page also finds closed answers.</p>{/snippet}
{#snippet keys()}<p>Keys are never sent to the browser.</p>{/snippet}
{#snippet off()}<p>Unavailable.</p>{/snippet}

<div class="flex w-full max-w-xl flex-col gap-8">
	<div class="flex flex-col gap-2">
		<p class="text-xs font-medium text-fg-light">Single, collapsible. Open: {single ?? 'none'}</p>
		<Accordion
			bind:value={single}
			items={[
				{ value: 'runs', label: 'What is a run?', content: runs },
				{ value: 'logs', label: 'Where do logs go?', content: logs },
				{ value: 'keys', label: 'Who can see my keys?', content: keys }
			]}
		/>
	</div>
	<div class="flex flex-col gap-2">
		<p class="text-xs font-medium text-fg-light">Multiple, level-4 headings, one item disabled. Open: {Array.isArray(several) ? several.join(', ') || 'none' : several}</p>
		<Accordion
			multiple
			headingLevel={4}
			bind:value={several}
			items={[
				{ value: 'runs', label: 'What is a run?', content: runs },
				{ value: 'logs', label: 'Where do logs go?', content: logs },
				{ value: 'off', label: 'Disabled item', disabled: true, content: off }
			]}
		/>
	</div>
	<div class="flex flex-col gap-2">
		<p class="text-xs font-medium text-fg-light">Single, not collapsible</p>
		<Accordion
			collapsible={false}
			defaultValue="runs"
			items={[
				{ value: 'runs', label: 'What is a run?', content: runs },
				{ value: 'logs', label: 'Where do logs go?', content: logs }
			]}
		/>
	</div>
</div>
