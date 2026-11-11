<script lang="ts">
	import { Spinner } from '$lib/primitives/display';
	import { buttonClass } from '$lib/ui/styles';
</script>

<div class="flex flex-wrap items-center gap-5">
	<Spinner size="xs" label="Loading small" />
	<Spinner size="sm" tone="accent" label="Loading accent" />
	<Spinner size="md" tone="success" label="Loading success" />
	<Spinner size="lg" tone="neutral" label="Loading large" />
	<button type="button" disabled aria-busy="true" class={buttonClass('primary', 'md')}>
		<Spinner size="sm" decorative /> Saving
	</button>
</div>
