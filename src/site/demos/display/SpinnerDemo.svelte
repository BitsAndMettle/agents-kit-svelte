<script lang="ts">
	import { Spinner } from '$lib/primitives/display';
	import { buttonClass } from '$lib/ui/styles';
</script>

<div class="flex flex-wrap items-center gap-5">
	<Spinner size="xs" loadingLabel="Loading small" />
	<Spinner size="sm" tone="accent" loadingLabel="Loading accent" />
	<Spinner size="md" tone="success" loadingLabel="Loading success" />
	<Spinner size="lg" tone="neutral" loadingLabel="Loading large" />
	<Spinner size="sm" tone="accent" loadingLabel="Syncing" announce />
	<button type="button" disabled aria-busy="true" class={buttonClass('primary', 'md')}>
		<Spinner size="sm" decorative /> Saving
	</button>
</div>
