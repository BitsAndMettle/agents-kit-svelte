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
		<IconButton label="Close, extra small" size="icon-xs"><X /></IconButton>
		<IconButton label="Close, small" size="icon-sm"><X /></IconButton>
		<IconButton label="Close, default" size="icon"><X /></IconButton>
	</div>
	<div class="flex flex-wrap items-center gap-2" role="group" aria-label="Variants">
		<IconButton label="Settings" variant="secondary"><Settings /></IconButton>
		<IconButton label="Copy" variant="primary" loading={copying} onclick={copy}><Copy /></IconButton>
		<IconButton label="Delete" variant="danger" showTitle><Trash2 /></IconButton>
		<IconButton label="Settings, disabled" variant="secondary" disabled><Settings /></IconButton>
		<IconButton label="Settings, pill" variant="secondary" pill><Settings /></IconButton>
	</div>
</div>
