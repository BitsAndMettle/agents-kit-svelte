<script lang="ts">
	import { Breadcrumb } from '$lib/primitives/navigation';
	import { Slash } from '@lucide/svelte';
</script>

{#snippet slash()}<Slash />{/snippet}

<div class="flex w-full max-w-xl flex-col gap-6">
	<div class="flex flex-col gap-2">
		<p class="text-xs font-medium text-fg-light">Narrow screens fold the middle behind a "…" button</p>
		<Breadcrumb
			items={[
				{ label: 'Workspace', href: '#workspace' },
				{ label: 'Projects', href: '#projects' },
				{ label: 'Trailside', href: '#trailside' },
				{ label: 'Runs', href: '#runs' },
				{ label: 'Run 42' }
			]}
		/>
	</div>
	<div class="flex flex-col gap-2">
		<p class="text-xs font-medium text-fg-light">Custom separator, never folded</p>
		<Breadcrumb
			label="Settings path"
			collapse={false}
			separator={slash}
			items={[
				{ label: 'Settings', href: '#settings' },
				{ label: 'Models', href: '#models' },
				{ label: 'Keys' }
			]}
		/>
	</div>
</div>
