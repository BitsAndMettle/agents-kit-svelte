<!--
	The Studio chrome: AppShell, NativeSelect, ChatWorkbench, Message and Progress at the Studio design's measure,
	inside the Studio palette. The box stands in for the browser window, a little wider than the design's 1280px grid,
	so the log and the composer are held by their caps. Also the fixture for tests/browser/keyboard/studio.spec.ts.
-->
<script lang="ts">
	import NativeSelect from '$lib/primitives/form/NativeSelect.svelte';
	import Progress from '$lib/primitives/display/Progress.svelte';
	import AppShell, { type AppShellItem } from '$lib/primitives/navigation/AppShell.svelte';
	import ChatWorkbench from '$lib/workbench/ChatWorkbench.svelte';
	import type { ChatWorkbenchConversation, ChatWorkbenchMessage, PromptAttachment } from '$lib/types';

	// These places are queries, so the fixture stays on this page. An app passes its router's paths.
	const items: AppShellItem[] = [
		{ label: 'Dashboard', href: '?place=dashboard', count: 2, countLabel: 'need you', countTone: 'warning' },
		{ label: 'Referee', href: '?place=referee', fill: true },
		{ label: 'Settings', href: '?place=settings' }
	];
	const REPOS = ['acme/web', 'acme/api', 'acme/docs'].map((name) => ({ value: name, label: name }));
	const CHIPS = ['Retry card 203 with the new key', 'Show me the review'];

	let path = $state('?place=referee');
	let fill = $derived(path === '?place=referee');
	let repo = $state('acme/web');
	let steps = $state(false);
	let draft = $state('');
	let frame = $state<HTMLElement>();
	let log = $state<string[]>([]);
	let n = 0;

	let conversations = $state<ChatWorkbenchConversation[]>([
		{ id: 'blocked', title: 'What is blocked right now?', date: '14:02', group: 'Today', mark: 'acme/api', active: true },
		{ id: 'review', title: 'Why did card 203 fail review?', date: '11:40', group: 'Today', mark: 'acme/web' },
		{ id: 'morning', title: 'Morning status', date: '08:30', group: 'Today' },
		{ id: 'plan', title: 'Plan the sign-in redirects', date: '1d', group: 'Yesterday', mark: 'acme/web' },
		{ id: 'image', title: 'Bump the base image', date: '1d', group: 'Yesterday', mark: 'acme/docs' },
		{ id: 'key', title: 'Rotate the signing key', date: '4d', group: 'Earlier', mark: 'acme/api' },
		{ id: 'avatars', title: 'Cache the avatar images', date: '5d', group: 'Earlier', mark: 'acme/docs' }
	]);
	let open = $derived(conversations.find((row) => row.active));
	let messages = $state<ChatWorkbenchMessage[]>([
		{ id: 'm1', role: 'user', text: 'What is blocked right now?', timestamp: '14:01' },
		{
			id: 'm2',
			role: 'assistant',
			timestamp: '14:02',
			text: 'Two cards are **blocked**, both on review:\n\n- Card 203 waits on a signing key\n- Card 218 needs a decision on the redirect policy'
		}
	]);

	/** A router does this for you: `path` is where it is, and a new page opens at the top. */
	function follow(event: MouseEvent): void {
		const link = (event.target as Element).closest('a');
		if (!link) return;
		event.preventDefault();
		path = link.getAttribute('href') ?? path;
		frame?.scrollTo(0, 0);
	}

	function send(text: string, sent: PromptAttachment[]): void {
		log.push(`send:${text}:${sent.map((item) => item.id).join(',')}`);
		messages.push({ id: `u${++n}`, role: 'user', text });
	}
</script>

<div class="space-y-4 px-4 py-6">
	<h1 class="text-xl font-semibold text-fg-main">The Studio chrome</h1>

	<div bind:this={frame} data-testid="studio" data-palette="studio" style="--ak-chat-surface: var(--ak-color-surface)" class="h-[720px] overflow-y-auto rounded-xl border border-card-border">
		<AppShell chrome="studio" title="Acme" {items} {path} class={fill ? 'h-full' : 'min-h-full'} onclick={follow}>
			{#snippet mark()}
				<svg aria-hidden="true" class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20l6-14 4 8 3-5 5 11z" /></svg>
			{/snippet}
			{#snippet actions()}
				<div class="flex items-center gap-2">
					<label for="studio-repo" class="text-[13px] text-fg-light">Repository</label>
					<NativeSelect id="studio-repo" size="studio" mono aria-label="Repository" class="w-56" options={REPOS} bind:value={repo} onValueChange={(value) => log.push(`repo:${value}`)} />
				</div>
			{/snippet}

			{#if fill}
				<ChatWorkbench
					aria-label="Referee"
					chrome="studio"
					title={open?.title ?? 'Referee'}
					subtitle={open?.mark ?? ''}
					status={{ text: 'Ready · build box online', tone: 'success' }}
					assistantName="Referee"
					newConversationLabel="New chat"
					searchLabel="Search"
					{messages}
					{conversations}
					onSelectConversation={(id) => {
						log.push(`select:${id}`);
						conversations = conversations.map((row) => ({ ...row, active: row.id === id }));
					}}
					onNewConversation={() => log.push('new')}
					bind:value={draft}
					placeholder="Message the Referee"
					onSend={send}
				>
					{#snippet messageFooter(message: ChatWorkbenchMessage, c: { actions: string; action: string; chips: string; chip: string })}
						{#if message.role === 'assistant'}
							<div class={c.actions}>
								<button type="button" class={c.action} aria-expanded={steps} onclick={() => (steps = !steps)}>2 steps</button>
								<button type="button" class={c.action} onclick={() => log.push(`copy:${message.id}`)}>Copy</button>
								<button type="button" class={c.action} onclick={() => log.push(`retry:${message.id}`)}>Retry</button>
							</div>
							{#if steps}<p class="text-[13px] text-fg-light">Read the board, then the review of Card 203.</p>{/if}
							<div class={c.chips}>
								{#each CHIPS as chip (chip)}
									<button type="button" class={c.chip} onclick={() => (draft = chip)}>{chip}</button>
								{/each}
							</div>
						{/if}
					{/snippet}
					{#snippet aside()}
						<section class="flex flex-col gap-2">
							<h3 class="text-xs text-fg-light">Needs you</h3>
							<a href="?place=dashboard" class="text-sm text-fg-main underline-offset-2 hover:underline">2 need you</a>
						</section>
						<section class="flex flex-col gap-2">
							<h3 class="text-xs text-fg-light">Checkout</h3>
							<Progress size="xs" tone="neutral" aria-label="Checkout" value={7} max={24} />
							<p class="text-[13px] text-fg-light">7 of 24 files</p>
						</section>
					{/snippet}
				</ChatWorkbench>
			{:else}
				<div class="space-y-2 px-4 py-6 text-sm text-fg-main sm:px-5">
					<p>{path === '?place=dashboard' ? 'Two cards need you: Card 203 and Card 218.' : 'Workspace settings live here.'}</p>
					<p class="text-fg-light">This place scrolls with the box; the Referee fills it.</p>
				</div>
			{/if}
		</AppShell>
	</div>

	<section aria-labelledby="log-heading">
		<h2 id="log-heading" class="text-sm font-medium text-fg-light">Events</h2>
		<ol data-testid="events" class="mt-1 font-mono text-xs text-fg-main">
			{#each log as entry, index (index)}<li>{entry}</li>{/each}
		</ol>
	</section>
</div>
