<script lang="ts">
	import { Pagination } from '$lib/primitives/navigation';

	let page = $state(6);
	let compactPage = $state(3);
</script>

<div class="flex w-full max-w-xl flex-col gap-6">
	<div class="flex flex-col gap-2">
		<p class="text-xs font-medium text-fg-light">Buttons, bound page: {page}. Below 640px it shows the short form.</p>
		<Pagination bind:page pageCount={12} label="Run list pages" />
	</div>
	<div class="flex flex-col gap-2">
		<p class="text-xs font-medium text-fg-light">Links with an href builder, two siblings</p>
		<Pagination page={5} pageCount={20} siblings={2} href={(n) => `#page-${n}`} label="Search result pages" />
	</div>
	<div class="flex flex-col gap-2">
		<p class="text-xs font-medium text-fg-light">Always compact. Page: {compactPage}</p>
		<Pagination bind:page={compactPage} pageCount={12} compact label="Compact pages" />
	</div>
</div>
