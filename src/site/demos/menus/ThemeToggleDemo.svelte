<script lang="ts">
	import ThinkingShimmer from '$lib/agents/ThinkingShimmer.svelte';
	import { Button } from '$lib/primitives/actions';
	import { Badge, Progress } from '$lib/primitives/display';
	import { ThemeToggle } from '$lib/primitives/menus';
</script>

<div class="mx-auto flex max-w-xl flex-col gap-4">
	<div class="flex items-center gap-2 text-[13px] text-fg-light">
		<ThemeToggle placement="bottom-start" />
		<span>Light, dark or the system's, for the whole page.</span>
	</div>
	<div data-palette="studio" class="flex flex-col gap-3 rounded-card border border-card-border bg-canvas-primary p-4 text-fg-main">
		<p class="m-0 text-xs text-fg-light">The Studio palette, <code>data-palette="studio"</code></p>
		<div class="flex flex-wrap gap-2">
			<Badge tone="accent">Working</Badge>
			<Badge tone="warning">Needs you</Badge>
			<Badge tone="success">Done</Badge>
			<Badge tone="info">Info</Badge>
			<Badge tone="danger">Stopped</Badge>
			<Badge>Queued</Badge>
		</div>
		<Progress value={60} label="Implementing" />
		<ThinkingShimmer label="Implementing" />
		<div class="flex gap-2"><Button variant="primary">Approve</Button><Button>Later</Button></div>
	</div>
</div>
