<script lang="ts">
	import { Bold, Star } from '@lucide/svelte';
	import { Toggle } from '../../../lib/primitives/actions';

	let bold = $state(false);
	let starred = $state(true);
</script>

<div class="space-y-3 text-sm">
	<div class="flex flex-wrap items-center gap-2">
		<Toggle bind:pressed={bold}>
			{#snippet leading()}<Bold />{/snippet}
			Bold
		</Toggle>
		<Toggle bind:pressed={starred} pill>
			{#snippet leading()}<Star />{/snippet}
			Starred
		</Toggle>
		<Toggle disabled>Disabled</Toggle>
		<Toggle size="icon" aria-label="Bold, icon only"><Bold /></Toggle>
	</div>
	<p class="text-xs text-fg-light" data-testid="toggle-state">Bold {bold ? 'on' : 'off'}, starred {starred ? 'on' : 'off'}</p>
</div>
