<script lang="ts">
	import { EmptyState } from '$lib/primitives/display';
	import { buttonClass } from '$lib/ui/styles';
	import { Inbox, SearchX } from '@lucide/svelte';
</script>

<div class="grid gap-4 md:grid-cols-2">
	<div class="rounded-card border border-dashed border-card-border">
		<EmptyState title="No runs yet" description="Start a run and its progress will show up here.">
			{#snippet icon()}<Inbox />{/snippet}
			{#snippet primaryAction()}<button type="button" class={buttonClass('primary', 'md')}>Start a run</button>{/snippet}
			{#snippet secondaryAction()}<a href="#empty-state" class={buttonClass('ghost', 'md')}>Read the guide</a>{/snippet}
		</EmptyState>
	</div>
	<div class="rounded-card border border-dashed border-card-border">
		<EmptyState size="compact" title="No results" description="Try a different search term.">
			{#snippet icon()}<SearchX />{/snippet}
			{#snippet primaryAction()}<button type="button" class={buttonClass('secondary', 'sm')}>Clear filters</button>{/snippet}
		</EmptyState>
	</div>
</div>
