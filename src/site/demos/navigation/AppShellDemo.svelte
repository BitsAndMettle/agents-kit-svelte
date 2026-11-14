<script lang="ts">
	import { ListRow, Notice } from '$lib/primitives/display';
	import { AppShell, type AppShellItem } from '$lib/primitives/navigation';
	import { buttonClass } from '$lib/ui/styles';

	const CARDS = ['Send the digest every Monday', 'Add the unsubscribe link', 'Fix the flaky upload test', 'Render the digest template', 'Rotate the signing key', 'Bump the base image', 'Cache the avatar images', 'Retire the old export'];
	const MEMBERS = ['Ada', 'Grace', 'Linus', 'Margaret', 'Edsger', 'Barbara'];

	// These places are queries, so the showcase stays on this page. An app passes its router's paths.
	let path = $state('?page=board');
	let notices = $state(['Build box is offline', 'A label could not be written']);
	let frame = $state<HTMLElement>();

	let items = $derived<AppShellItem[]>([
		{ label: 'Board', href: '?page=board' },
		{ label: 'Chat', href: '?page=chat', fill: true },
		{ label: 'Settings', href: '?page=settings', count: notices.length, countLabel: 'open notices' }
	]);

	/** A router does this for you: `path` is where it is, and a new page opens at the top. */
	function follow(event: MouseEvent): void {
		const link = (event.target as Element).closest('a');
		if (!link) return;
		event.preventDefault();
		path = link.getAttribute('href') ?? path;
		frame?.scrollTo(0, 0);
	}
</script>

<!-- This box stands in for the browser window: it is what scrolls, and the shell takes its height where an app's takes the viewport's. -->
<div bind:this={frame} class="h-96 overflow-y-auto rounded-card border border-card-border">
	<AppShell title="Acme" {items} {path} onclick={follow} class={path === '?page=chat' ? 'h-full' : 'min-h-full'}>
		{#snippet actions()}
			<button type="button" class={buttonClass('ghost', 'xs')}>Sign out</button>
		{/snippet}
		{#if path === '?page=chat'}
			<div class="flex h-full flex-col text-[13px]">
				<p class="m-0 flex-1 px-4 py-3 text-fg-light sm:px-6">This place fills: its page takes <code>h-full</code> and gets exactly the space under the bar, so its composer stays at the bottom.</p>
				<p class="m-0 border-t border-canvas-border px-4 py-3 text-fg-light sm:px-6">Message…</p>
			</div>
		{:else}
			<div class="flex flex-col gap-3 px-4 py-3 sm:px-6">
				{#if path === '?page=settings'}
					{#each notices as notice (notice)}
						<Notice title={notice} onDismiss={() => (notices = notices.filter((other) => other !== notice))} />
					{/each}
				{/if}
				<ul class="m-0 list-none p-0">
					{#each path === '?page=settings' ? MEMBERS : CARDS as title, index (title)}
						<ListRow {title} description={path === '?page=settings' ? 'Member' : `Card ${index + 1}`} />
					{/each}
				</ul>
			</div>
		{/if}
	</AppShell>
</div>
