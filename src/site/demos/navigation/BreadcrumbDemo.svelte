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
				{ label: 'Workspace', href: '#tabs' },
				{ label: 'Teams', href: '#accordion' },
				{ label: 'Acme', href: '#breadcrumb' },
				{ label: 'Reports', href: '#pagination' },
				{ label: 'Report 42' }
			]}
		/>
	</div>
	<div class="flex flex-col gap-2">
		<p class="text-xs font-medium text-fg-light">Custom separator, never folded</p>
		<Breadcrumb
			aria-label="Settings path"
			collapse={false}
			separator={slash}
			items={[
				{ label: 'Settings', href: '#tabs' },
				{ label: 'Models', href: '#accordion' },
				{ label: 'Keys' }
			]}
		/>
	</div>
</div>
