<script lang="ts">
	import { Notice } from '$lib/primitives/display';
	import { buttonClass, type UiTone } from '$lib/ui/styles';

	interface Warning {
		key: string;
		title: string;
		description: string;
		tone: UiTone;
		fix: string;
		/** How long the server takes to store the dismissal, in milliseconds. */
		delay: number;
	}

	const ALL: Warning[] = [
		{ key: 'offline', title: 'Build box is offline', description: 'Nothing can run until it reconnects. Last seen 12 minutes ago.', tone: 'warning', fix: 'Open computers', delay: 800 },
		{ key: 'write-failed', title: 'A label could not be written', description: 'The change to card 214 was refused.', tone: 'danger', fix: 'See the activity', delay: 0 }
	];

	let warnings = $state(ALL);

	async function dismiss({ key, delay }: Warning): Promise<void> {
		await new Promise((resolve) => setTimeout(resolve, delay));
		warnings = warnings.filter((warning) => warning.key !== key);
	}
</script>

<div class="flex max-w-xl flex-col gap-3">
	{#each warnings as warning (warning.key)}
		<Notice title={warning.title} description={warning.description} tone={warning.tone} onDismiss={() => dismiss(warning)}>
			{#snippet actions()}
				<button type="button" class={buttonClass('secondary', 'xs')}>{warning.fix}</button>
			{/snippet}
		</Notice>
	{:else}
		<button type="button" class={buttonClass('secondary', 'sm', 'self-start')} onclick={() => (warnings = ALL)}>Show them again</button>
	{/each}
</div>
