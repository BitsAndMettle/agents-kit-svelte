<script lang="ts">
	import { Pagination } from '$lib/primitives/navigation';

	let page = $state(6);
	let compactPage = $state(3);
</script>

<div class="flex w-full max-w-xl flex-col gap-6">
	<div class="flex flex-col gap-2">
		<p class="text-xs font-medium text-fg-light">Buttons, bound page: {page}. Below 640px it shows the short form.</p>
		<Pagination bind:value={page} pageCount={12} aria-label="Run list pages" />
	</div>
	<div class="flex flex-col gap-2">
		<p class="text-xs font-medium text-fg-light">Links with an href builder, two siblings</p>
		<Pagination defaultValue={5} pageCount={20} siblings={2} href={(n) => `#pagination`} aria-label="Search result pages" />
	</div>
	<div class="flex flex-col gap-2">
		<p class="text-xs font-medium text-fg-light">Always compact. Page: {compactPage}</p>
		<Pagination bind:value={compactPage} pageCount={12} compact aria-label="Compact pages" />
	</div>

	<div class="flex flex-col gap-2">
		<p class="text-xs font-medium text-fg-light">Edge cases: 0 and 1 pages render nothing, 2 and 1000 pages still fit.</p>
		<Pagination pageCount={0} aria-label="No pages" />
		<Pagination pageCount={1} aria-label="One page" />
		<Pagination pageCount={2} aria-label="Two pages" />
		<Pagination defaultValue={500} pageCount={1000} aria-label="Many pages" />
	</div>
</div>
