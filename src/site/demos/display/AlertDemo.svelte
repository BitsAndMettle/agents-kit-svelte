<script lang="ts">
	import { Alert } from '$lib/primitives/display';
	import { buttonClass, type UiTone } from '$lib/ui/styles';

	const tones: UiTone[] = ['neutral', 'accent', 'success', 'warning', 'danger'];
	let dismissed = $state(false);
	let announced = $state(false);
</script>

<div class="flex max-w-xl flex-col gap-3">
	{#each tones as tone (tone)}
		<Alert {tone} title="A {tone} notice" description="Plain block, not announced to screen readers." />
	{/each}
	{#if !dismissed}
		<Alert tone="warning" title="Dismissible" description="The dismiss button only calls back." onDismiss={() => (dismissed = true)}>
			{#snippet actions()}
				<button type="button" class={buttonClass('secondary', 'xs')}>Review</button>
			{/snippet}
		</Alert>
	{:else}
		<button type="button" class={buttonClass('secondary', 'sm')} onclick={() => (dismissed = false)}>Show it again</button>
	{/if}
	<button type="button" class={buttonClass('secondary', 'sm', 'self-start')} onclick={() => (announced = !announced)}>
		{announced ? 'Clear' : 'Trigger'} live alert
	</button>
	{#if announced}
		<Alert tone="danger" live title="Deploy failed" description="Announced as soon as it appears." />
	{/if}
</div>
