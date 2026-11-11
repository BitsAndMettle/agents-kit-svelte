<script lang="ts">
	import { Copy, RotateCcw, Share2 } from '@lucide/svelte';
	import { Tooltip } from '$lib/primitives/overlays';
	import { buttonClass } from '$lib/ui/styles';
</script>

<div class="flex flex-wrap items-center gap-6">
	<div class="flex items-center gap-1" role="group" aria-label="Run actions">
		<Tooltip content="Copy output">
			{#snippet trigger(t)}
				<button {...t} type="button" aria-label="Copy output" class={buttonClass('ghost', 'icon')}><Copy aria-hidden="true" /></button>
			{/snippet}
		</Tooltip>
		<Tooltip>
			{#snippet content()}
				Retry run <kbd class="ml-1 rounded-[4px] bg-fg-inverse/15 px-1 font-mono">R</kbd>
			{/snippet}
			{#snippet trigger(t)}
				<button {...t} type="button" aria-label="Retry run" class={buttonClass('ghost', 'icon')}><RotateCcw aria-hidden="true" /></button>
			{/snippet}
		</Tooltip>
		<Tooltip content="Share a read-only link" placement="bottom">
			{#snippet trigger(t)}
				<button {...t} type="button" aria-label="Share" class={buttonClass('ghost', 'icon')}><Share2 aria-hidden="true" /></button>
			{/snippet}
		</Tooltip>
	</div>

	<Tooltip content="Publishing needs a linked repository">
		{#snippet trigger(t)}
			<!-- A disabled button gets no hover or focus, so a focusable span carries the tooltip. -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<span {...t} tabindex="0" class="inline-flex rounded-full">
				<button type="button" disabled class={buttonClass('primary', 'md')}>Publish</button>
			</span>
		{/snippet}
	</Tooltip>
</div>
