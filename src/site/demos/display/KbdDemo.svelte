<script lang="ts">
	import { Kbd } from '$lib/primitives/display';
</script>

<div class="flex flex-col gap-3 text-sm">
	<p>Press <Kbd>Esc</Kbd> to close, or <Kbd keys={['Ctrl', 'K']} /> to search.</p>
	<p>Platform aware: <Kbd keys={['Mod', 'Shift', 'P']} platform="auto" /></p>
	<p>Mac symbols: <Kbd keys={['Cmd', 'Alt', 'Enter']} platform="mac" /></p>
	<p>Custom joiner: <Kbd keys={['g', 'b']} joiner="then" /></p>
</div>
