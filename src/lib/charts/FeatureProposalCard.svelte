<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Check, Flag, LoaderCircle, Pencil, X } from '@lucide/svelte';
	import { buttonClass } from '../ui/styles';
	import { dependencyLabels, normalizeProposalCards, removeProposalCard, renameProposalCard } from './proposal';
	import type { FeatureProposal, ProposalCard, ProposalStatus } from './types';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children' | 'title'> {
		title: string;
		summary?: string;
		/** Acceptance criteria the Feature must meet. */
		criteria?: string[];
		cards: ProposalCard[];
		/** E.g. "About 3 hours of agent time". */
		estimate?: string;
		status?: ProposalStatus;
		/** The person approved; `proposal.cards` holds their edits. */
		onApprove?: (proposal: FeatureProposal) => void;
		/** The person wants changes; `note` is what they typed. */
		onRevise?: (note: string, proposal: FeatureProposal) => void;
		onDecline?: () => void;
		class?: string;
	}

	let { title, summary, criteria = [], cards: cardsProp, estimate, status = 'proposed', onApprove, onRevise, onDecline, class: className = '', ...rest }: Props = $props();

	/** The person's edits; `null` means "as proposed". Cleared whenever the agent sends new cards. */
	let edited = $state<ProposalCard[] | null>(null);
	let cards = $derived(edited ?? normalizeProposalCards(cardsProp));
	$effect(() => {
		void cardsProp;
		edited = null;
	});

	let editable = $derived(status === 'proposed');
	let renamingId = $state<string | null>(null);
	let draftTitle = $state('');
	let revising = $state(false);
	let note = $state('');

	let proposal = $derived<FeatureProposal>({ title, summary, criteria, cards, estimate });

	const SIZE_LABEL = { S: 'Small', M: 'Medium', L: 'Large' } as const;
	const HEADER: Record<ProposalStatus, { label: string; tone: string }> = {
		proposed: { label: 'Proposed', tone: 'bg-accent-subtle text-accent-primary' },
		approving: { label: 'Approving', tone: 'bg-accent-subtle text-accent-primary' },
		approved: { label: 'Approved', tone: 'bg-status-success-subtle text-status-success' },
		declined: { label: 'Declined', tone: 'bg-canvas-secondary text-fg-light' }
	};

	function startRename(card: ProposalCard): void {
		renamingId = card.id;
		draftTitle = card.title;
	}

	function commitRename(): void {
		if (renamingId) edited = renameProposalCard(cards, renamingId, draftTitle);
		renamingId = null;
	}

	function remove(card: ProposalCard): void {
		if (renamingId === card.id) renamingId = null;
		edited = removeProposalCard(cards, card.id);
	}

	function submitRevision(): void {
		onRevise?.(note.trim(), proposal);
		revising = false;
		note = '';
	}
</script>

<article {...rest} class={cn('rounded-card border bg-card-bg ak-shadow-btn', status === 'approved' ? 'border-status-success' : 'border-card-border', className)}>
	<header class={cn('flex items-start gap-3 rounded-t-card p-4', status === 'approved' && 'bg-status-success-subtle')}>
		<span class={cn('grid size-9 shrink-0 place-items-center rounded-control', status === 'approved' ? 'bg-card-bg text-status-success' : 'bg-accent-subtle text-accent-primary')}>
			{#if status === 'approved'}<Check class="size-4" aria-hidden="true" />{:else}<Flag class="size-4" aria-hidden="true" />{/if}
		</span>
		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-center gap-1.5 text-[11px]">
				<span class={cn('rounded-full px-2 py-0.5 font-medium', HEADER[status].tone)}>{HEADER[status].label}</span>
				<span class="text-fg-light">New Feature</span>
			</div>
			<h3 class="mt-1 text-[15px] leading-snug font-semibold text-fg-main">{title}</h3>
			{#if summary}<p class="mt-1 text-[12px] leading-5 text-fg-light">{summary}</p>{/if}
		</div>
	</header>

	{#if criteria.length}
		<section class="px-4 pb-4" aria-label="Acceptance criteria">
			<p class="text-[11px] text-fg-light">Acceptance criteria</p>
			<ul class="mt-1.5 space-y-1">
				{#each criteria as criterion (criterion)}
					<li class="flex gap-2 text-[12px] leading-5 text-fg-main"><span class="mt-2 size-1 shrink-0 rounded-full bg-fg-light" aria-hidden="true"></span>{criterion}</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section class="border-t border-card-border px-4 py-3" aria-label="Cards">
		<p class="text-[11px] text-fg-light">{cards.length} {cards.length === 1 ? 'card' : 'cards'}{estimate ? ` · ${estimate}` : ''}</p>
		{#if cards.length === 0}
			<p class="mt-2 text-[12px] text-fg-light">No cards left to approve.</p>
		{:else}
			<ol class="mt-2 space-y-2">
				{#each cards as card, i (card.id)}
					{@const deps = dependencyLabels(card, cards)}
					<li class="rounded-control bg-canvas-secondary px-2.5 py-2">
						<div class="flex items-start gap-2">
							<span class="mt-0.5 font-mono text-[12px] text-fg-light" aria-hidden="true">#{i + 1}</span>
							<div class="min-w-0 flex-1">
								{#if renamingId === card.id}
									<form
										class="flex flex-wrap items-center gap-2"
										onsubmit={(e) => {
											e.preventDefault();
											commitRename();
										}}
									>
										<input
											type="text"
											aria-label="Rename card {i + 1}"
											bind:value={draftTitle}
											onkeydown={(e) => e.key === 'Escape' && (renamingId = null)}
											class="min-w-0 flex-1 basis-40 rounded-md border border-card-border bg-card-bg px-2.5 py-1 text-[13px] text-fg-main outline-none focus:border-accent-primary"
										/>
										<button type="submit" class={buttonClass('primary', 'sm')}>Save</button>
										<button type="button" class={buttonClass('ghost', 'sm')} onclick={() => (renamingId = null)}>Cancel</button>
									</form>
								{:else}
									<p class="text-[13px] leading-snug font-medium text-fg-main"><span class="sr-only">Card {i + 1}: </span>{card.title}</p>
								{/if}
								{#if card.note}<p class="mt-0.5 text-[12px] leading-5 text-fg-light">{card.note}</p>{/if}
								{#if card.size || deps.length}
									<div class="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
										{#if card.size}<span class="rounded-full border border-card-border px-2 py-0.5 font-mono text-fg-light">{card.size}<span class="sr-only"> ({SIZE_LABEL[card.size].toLowerCase()})</span></span>{/if}
										{#each deps as dep (dep)}<span class="rounded-full bg-status-info-subtle px-2 py-0.5 text-status-info">{dep}</span>{/each}
									</div>
								{/if}
							</div>
							{#if editable && renamingId !== card.id}
								<div class="flex shrink-0 gap-0.5">
									<button type="button" class={buttonClass('ghost', 'icon-sm')} onclick={() => startRename(card)}><Pencil aria-hidden="true" /><span class="sr-only">Rename card {i + 1}: {card.title}</span></button>
									<button type="button" class={buttonClass('ghost', 'icon-sm')} onclick={() => remove(card)}><X aria-hidden="true" /><span class="sr-only">Remove card {i + 1}: {card.title}</span></button>
								</div>
							{/if}
						</div>
					</li>
				{/each}
			</ol>
		{/if}
	</section>

	{#if editable}
		<footer class="border-t border-card-border px-4 py-3">
			{#if revising}
				<label class="block text-[12px] text-fg-light" for="proposal-note">What should change?</label>
				<textarea id="proposal-note" rows="3" bind:value={note} class="mt-1 w-full rounded-md border border-card-border bg-card-bg px-3 py-2 text-[13px] text-fg-main outline-none focus:border-accent-primary"></textarea>
				<div class="mt-2 flex flex-wrap gap-2">
					<button type="button" class={buttonClass('primary', 'md')} disabled={!note.trim()} onclick={submitRevision}>Send revision</button>
					<button type="button" class={buttonClass('ghost', 'md')} onclick={() => (revising = false)}>Cancel</button>
				</div>
			{:else}
				<div class="flex flex-wrap items-center gap-2">
					<button type="button" class={buttonClass('primary', 'md')} disabled={cards.length === 0} onclick={() => onApprove?.(proposal)}><Check aria-hidden="true" />Approve {cards.length} {cards.length === 1 ? 'card' : 'cards'}</button>
					<button type="button" class={buttonClass('secondary', 'md')} onclick={() => (revising = true)}>Request changes</button>
					<button type="button" class={buttonClass('ghost', 'md', 'ml-auto')} onclick={() => onDecline?.()}>Decline</button>
				</div>
			{/if}
		</footer>
	{:else if status === 'approving'}
		<footer class="flex items-center gap-2 border-t border-card-border px-4 py-3 text-[12px] text-fg-light" aria-live="polite"><LoaderCircle class="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Approving {cards.length} {cards.length === 1 ? 'card' : 'cards'}</footer>
	{:else if status === 'approved'}
		<footer class="flex items-center gap-2 border-t border-card-border px-4 py-3 text-[12px] font-medium text-status-success" aria-live="polite"><Check class="size-4" aria-hidden="true" />Approved: {cards.length} {cards.length === 1 ? 'card' : 'cards'}</footer>
	{/if}
</article>
