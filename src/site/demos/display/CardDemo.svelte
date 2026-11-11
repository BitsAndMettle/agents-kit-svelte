<script lang="ts">
	import { Card } from '$lib/primitives/display';
	import { buttonClass } from '$lib/ui/styles';

	let opened = $state(0);
</script>

<div class="grid gap-4 md:grid-cols-3">
	<Card title="Weekly report" description="Static card with actions">
		{#snippet actions()}
			<button type="button" class={buttonClass('secondary', 'xs')}>Edit</button>
		{/snippet}
		Runs finished this week, grouped by repository.
		{#snippet footer()}Updated 2 hours ago{/snippet}
	</Card>
	<Card title="Open the board" description="The whole card is a link" href="#card">
		<span id="card-inner">One tab stop, click anywhere, and <a href="#card-inner">a link in the body</a> still works.</span>
	</Card>
	<Card title="Open settings" description="The whole card is a button" onSelect={() => (opened += 1)}>
		Opened {opened} times.
		{#snippet actions()}
			<button type="button" class={buttonClass('ghost', 'xs')}>Pin</button>
		{/snippet}
	</Card>
</div>
