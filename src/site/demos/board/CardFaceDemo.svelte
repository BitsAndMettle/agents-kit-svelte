<script lang="ts">
	import { CardFace } from '$lib/board';
	import { Badge } from '$lib/primitives/display';
	import { buttonClass } from '$lib/ui/styles';

	let opened = $state(0);
	let sentBack = $state(0);
</script>

<div class="grid items-start gap-3 md:grid-cols-3">
	<CardFace reference="KIT-217" title="Render the digest template" status="Implementing" tone="accent">
		<Badge>T1</Badge>
		<Badge tone="success" dot>Checks passed</Badge>
	</CardFace>
	<CardFace reference="KIT-221" title="Rotate the signing key" status="Waiting for your approval" tone="warning" href="#card-face">
		<Badge>T3</Badge>
		<Badge tone="success" dot>Checks passed</Badge>
		{#snippet actions()}
			<button type="button" class={buttonClass('primary', 'xs')}>Merge</button>
		{/snippet}
	</CardFace>
	<CardFace reference="KIT-224" title="Fix the flaky upload test" status="Opened {opened} times, sent back {sentBack} times" onSelect={() => (opened += 1)}>
		{#snippet actions()}
			<button type="button" class={buttonClass('secondary', 'xs')} onclick={() => (sentBack += 1)}>Send back</button>
		{/snippet}
	</CardFace>
</div>
