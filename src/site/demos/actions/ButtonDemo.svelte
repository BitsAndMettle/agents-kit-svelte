<script lang="ts">
	import { ArrowRight, Send } from '@lucide/svelte';
	import { Button } from '../../../lib/primitives/actions';
	import type { ButtonVariant } from '../../../lib/ui/styles';

	const variants: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger', 'accent'];
	let loading = $state(false);
	let clicks = $state(0);

	function send(): void {
		clicks += 1;
		loading = true;
		setTimeout(() => (loading = false), 1800);
	}
</script>

<div class="space-y-4 text-sm">
	<div class="flex flex-wrap items-center gap-2" role="group" aria-label="Variants">
		{#each variants as variant (variant)}
			<Button {variant}>{variant}</Button>
		{/each}
	</div>
	<div class="flex flex-wrap items-center gap-2" role="group" aria-label="Sizes">
		{#each ['xs', 'sm', 'md', 'lg'] as const as size (size)}
			<Button variant="primary" {size}>Size {size}</Button>
		{/each}
	</div>
	<div class="flex flex-wrap items-center gap-2" role="group" aria-label="Pill shape">
		{#each variants as variant (variant)}
			<Button {variant} pill>{variant} pill</Button>
		{/each}
	</div>
	<div class="flex flex-wrap items-center gap-2" role="group" aria-label="States and icons">
		<Button variant="primary" {loading} onclick={send} data-testid="send">
			{#snippet leading()}<Send />{/snippet}
			Send
		</Button>
		<Button disabled>Disabled</Button>
		<Button href="#button" variant="ghost" data-testid="link">
			Link button
			{#snippet trailing()}<ArrowRight />{/snippet}
		</Button>
		<Button href="#button" disabled data-testid="disabled-link">Disabled link</Button>
	</div>
	<p class="text-xs text-fg-light" data-testid="send-count">Sent {clicks} time{clicks === 1 ? '' : 's'}</p>
</div>
