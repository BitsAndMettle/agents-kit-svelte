<script lang="ts">
	import { Copy, Settings, Trash2, X } from '@lucide/svelte';
	import { IconButton } from '../../../lib/primitives/actions';

	let copying = $state(false);

	function copy(): void {
		copying = true;
		setTimeout(() => (copying = false), 1500);
	}
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-center gap-2" role="group" aria-label="Sizes">
		<IconButton aria-label="Close, extra small" size="icon-xs"><X /></IconButton>
		<IconButton aria-label="Close, small" size="icon-sm"><X /></IconButton>
		<IconButton aria-label="Close, default" size="icon"><X /></IconButton>
	</div>
	<div class="flex flex-wrap items-center gap-2" role="group" aria-label="Variants">
		<IconButton aria-label="Settings" variant="secondary"><Settings /></IconButton>
		<IconButton aria-label="Copy" variant="primary" loading={copying} onclick={copy}><Copy /></IconButton>
		<IconButton aria-label="Delete" variant="danger" showTitle><Trash2 /></IconButton>
		<IconButton aria-label="Settings, disabled" variant="secondary" disabled><Settings /></IconButton>
		<IconButton aria-label="Settings, pill" variant="secondary" pill><Settings /></IconButton>
	</div>
</div>
