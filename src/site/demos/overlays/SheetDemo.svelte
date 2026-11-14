<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { Sheet, type SheetSide } from '$lib/primitives/overlays';
	import { buttonClass } from '$lib/ui/styles';

	const sides: SheetSide[] = ['right', 'left', 'bottom', 'top'];
	const filters = ['Waiting on a person', 'Running', 'Failed', 'Done today'];
	let chosen = $state<string[]>(['Waiting on a person']);

	/**
	 * Route mode: open while the URL says `?sheet=filters`. The showcase is prerendered, so the
	 * server always renders it open: hidden until JavaScript opens it as a modal (or closes it)
	 * from the real URL, and shown in place without JavaScript.
	 */
	const routed = $derived(browser ? page.url.searchParams.get('sheet') === 'filters' : true);
	let routeLink = $state<HTMLAnchorElement | null>(null);
</script>

<div class="flex flex-wrap items-center gap-2" data-sveltekit-noscroll data-sveltekit-keepfocus>
	{#each sides as side (side)}
		<Sheet {side} title="Filter runs" description="Show only the runs you need.">
			{#snippet trigger(t)}
				<button {...t} class={buttonClass('secondary', 'md')}>Open {side} sheet</button>
			{/snippet}
			<fieldset class="grid gap-2">
				<legend class="sr-only">Status</legend>
				{#each filters as filter (filter)}
					<label class="flex items-center gap-2">
						<input type="checkbox" value={filter} bind:group={chosen} class="size-4" />
						{filter}
					</label>
				{/each}
			</fieldset>
			{#snippet footer(close)}
				<button type="button" class={buttonClass('ghost', 'md')} onclick={() => (chosen = [])}>Clear</button>
				<button type="button" class={buttonClass('primary', 'md')} onclick={close}>Show {chosen.length} filters</button>
			{/snippet}
		</Sheet>
	{/each}
	<a href="?sheet=filters" bind:this={routeLink} class={buttonClass('secondary', 'md')}>Filters as a link</a>

	<!-- With JavaScript this frame is empty and the route opens as a modal; without it, the server-rendered route shows here. -->
	<div class="contents noscript:grid noscript:w-full noscript:gap-2 noscript:rounded-window noscript:border noscript:border-dashed noscript:border-card-border noscript:p-3">
		<p class="m-0 hidden text-xs text-fg-light noscript:block">Without JavaScript the server renders the <code>?sheet=filters</code> route already open:</p>
		<Sheet
			open={routed}
			ssrOpen
			closeHref="./"
			returnFocus={() => routeLink}
			title="Filter runs"
			description="This sheet is a route: its URL opens it, and closing it is a link."
			data-testid="sheet-route"
			class="[&:not(:modal)]:relative [&:not(:modal)]:z-auto [&:not(:modal)]:h-auto [&:not(:modal)]:w-full [&:not(:modal)]:rounded-card [&:not(:modal)]:border [&:not(:modal)]:shadow-none [&:not(:modal)]:hidden! noscript:[&:not(:modal)]:flex!"
		>
			<p class="m-0 text-sm text-fg-light">Showing {chosen.length} of {filters.length} statuses.</p>
		</Sheet>
	</div>
</div>
