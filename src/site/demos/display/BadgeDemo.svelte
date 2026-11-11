<script lang="ts">
	import { Badge } from '$lib/primitives/display';
	import { Check } from '@lucide/svelte';
	import type { UiTone } from '$lib/ui/styles';

	const tones: UiTone[] = ['neutral', 'accent', 'success', 'warning', 'danger'];
</script>

<div class="flex flex-col gap-4">
	{#each ['soft', 'solid', 'outline'] as const as variant (variant)}
		<div class="flex flex-wrap items-center gap-2">
			<span class="w-16 text-xs text-fg-light">{variant}</span>
			{#each tones as tone (tone)}
				<Badge {tone} {variant}>{tone}</Badge>
			{/each}
		</div>
	{/each}
	<div class="flex flex-wrap items-center gap-2">
		<span class="w-16 text-xs text-fg-light">dot, icon</span>
		<Badge tone="success" dot>Running</Badge>
		<Badge tone="danger" dot variant="outline">Failed</Badge>
		<Badge tone="accent" variant="solid">{#snippet icon()}<Check aria-hidden="true" />{/snippet}Merged</Badge>
		<Badge size="md" tone="warning">Medium</Badge>
	</div>
</div>
