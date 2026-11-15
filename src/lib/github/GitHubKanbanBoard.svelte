<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { SEGMENT_GROUP_CLASS, segmentClass } from '../ui/styles';
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';
	import { fade } from 'svelte/transition';
	import { createBoardCrossfade, motionDuration, rise } from '../state/motion.svelte';
	import GitHubIssueCard from './GitHubIssueCard.svelte';
	import type { GitHubIssueData, GitHubIssueState } from '../types';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children' | 'issues' | 'title' | 'badge' | 'description' | 'onSelectIssue'> {
		issues?: GitHubIssueData[];
		title?: string;
		/** Small badge next to the title, such as the sync source. */
		badge?: string;
		description?: string;
		onSelectIssue?: (issue: GitHubIssueData) => void;
		class?: string;
	}

	const COLUMNS: { id: GitHubIssueState; label: string; description: string }[] = [
		{ id: 'open', label: 'Triage & Ready', description: 'Eligible issues awaiting agent claim' },
		{ id: 'in-progress', label: 'In Progress (Runs)', description: 'Active worktree agent runs' },
		{
			id: 'ready-for-human',
			label: 'Ready for You',
			description: 'CI green & awaiting referee review'
		},
		{ id: 'closed', label: 'Merged & Verified', description: 'Landed on main & verified live' }
	];

	let {
		issues = [],
		title = 'Board',
		badge,
		description,
		onSelectIssue,
		class: className = '',
		...rest
	}: Props = $props();

	const [send, receive] = createBoardCrossfade(260);

	let dispatchedOverrides = $state<Record<number, Partial<GitHubIssueData>>>({});
	let searchQuery = $state('');
	let selectedArea = $state<'all' | 'area:landing' | 'area:app'>('all');
	let activeDrawerIssue = $state<GitHubIssueData | null>(null);

	let boardItems = $derived(
		issues.map((item) => ({
			...item,
			...(dispatchedOverrides[item.number] ?? {})
		}))
	);

	let filteredIssues = $derived(
		boardItems.filter((item) => {
			const matchesQuery =
				!searchQuery.trim() ||
				item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				String(item.number).includes(searchQuery);
			const matchesArea =
				selectedArea === 'all' || item.labels?.some((lbl) => lbl.name === selectedArea);
			return matchesQuery && matchesArea;
		})
	);

	/**
	 * Moves an issue card to the `in-progress` column when dispatched, triggering
	 * Svelte 5 `crossfade` (`send`/`receive`) and `animate:flip` across columns.
	 *
	 * @param issueNumber - GitHub issue number.
	 */
	function handleDispatch(issueNumber: number): void {
		dispatchedOverrides = {
			...dispatchedOverrides,
			[issueNumber]: {
				state: 'in-progress',
				assignedAgent: 'AK-S Agent · Attempt 1 (Dispatched)',
				worktreeBranch: `trailside/${issueNumber}-auto-run`
			}
		};
	}
</script>

<section {...rest}
	aria-label="GitHub Reactive Board Layout"
	class={cn('@container space-y-4 rounded-2xl border border-card-border bg-canvas-secondary p-4 sm:p-5', className)}
>
	<!-- Board Toolbar -->
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<div class="flex flex-wrap items-center gap-2">
				<h2 class="text-base font-bold text-fg-main">{title}</h2>
				{#if badge}
					<span
						class="whitespace-nowrap rounded-full bg-status-success-subtle px-2 py-0.5 font-mono text-[11px] font-medium text-status-success"
					>
						{badge}
					</span>
				{/if}
			</div>
			{#if description}
				<p class="mt-0.5 text-xs text-fg-light">{description}</p>
			{/if}
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<input
				type="search"
				placeholder="Filter cards by title or number…"
				bind:value={searchQuery}
				aria-label="Filter board cards"
				class="h-8 w-56 rounded-lg border border-card-border bg-card-bg px-3 text-xs text-fg-main placeholder:text-fg-light focus:border-accent-primary focus:outline-none"
			/>

			<div role="group" aria-label="Filter by area" class="{SEGMENT_GROUP_CLASS} text-xs">
				<button
					type="button"
					onclick={() => (selectedArea = 'all')}
					class="{segmentClass(selectedArea === 'all')} whitespace-nowrap"
				>
					All ({boardItems.length})
				</button>
				<button
					type="button"
					onclick={() => (selectedArea = 'area:landing')}
					class="{segmentClass(selectedArea === 'area:landing')} whitespace-nowrap"
				>
					Landing
				</button>
				<button
					type="button"
					onclick={() => (selectedArea = 'area:app')}
					class="{segmentClass(selectedArea === 'area:app')} whitespace-nowrap"
				>
					App
				</button>
			</div>
		</div>
	</div>

	<!-- Container-Responsive Kanban Grid (2-col in medium containers, 4-col in wide >= 1024px containers) -->
	<div class="grid gap-3.5 @xl:grid-cols-2 @5xl:grid-cols-4">
		{#each COLUMNS as col (col.id)}
			{@const colItems = filteredIssues.filter((item) => item.state === col.id)}
			<div class="flex min-w-0 flex-col rounded-xl border border-card-border bg-canvas-primary p-3">
				<header class="mb-3 flex min-h-10 items-start justify-between gap-2 border-b border-canvas-border pb-2.5">
					<div class="min-w-0">
						<h3 class="truncate text-[13px] font-semibold text-fg-main">{col.label}</h3>
						<p class="mt-0.5 truncate text-[11px] text-fg-light">{col.description}</p>
					</div>
					<span class="shrink-0 rounded-full bg-canvas-secondary px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-fg-main">
						{colItems.length}
					</span>
				</header>

				<div class="space-y-2.5">
					{#each colItems as item (item.number)}
						<div
							in:receive={{ key: item.number }}
							out:send={{ key: item.number }}
							animate:flip={{ duration: motionDuration(250), easing: cubicOut }}
							class="min-w-0"
						>
							<GitHubIssueCard
								issue={item}
								compact={true}
								onDispatchRun={handleDispatch}
								onOpenChat={() => {
									activeDrawerIssue = item;
									onSelectIssue?.(item);
								}}
							/>
						</div>
					{:else}
						<p
							in:fade={{ duration: motionDuration(150) }}
							class="rounded-lg border border-dashed border-card-border py-6 text-center text-xs text-fg-light"
						>
							No cards in {col.label}
						</p>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	{#if activeDrawerIssue}
		<div
			transition:rise
			role="region"
			aria-label="Selected card inspector"
			class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-primary bg-accent-subtle px-4 py-3 text-xs"
		>
			<div>
				<span class="font-mono font-bold text-accent-primary">
					Selected Issue {activeDrawerIssue.number}:
				</span>
				<span class="ml-1 font-semibold text-fg-main">{activeDrawerIssue.title}</span>
				{#if activeDrawerIssue.worktreeBranch}
					<code class="ml-2 rounded bg-card-bg px-2 py-0.5 font-mono text-[11px] text-fg-main">
						{activeDrawerIssue.worktreeBranch}
					</code>
				{/if}
			</div>
			<button
				type="button"
				onclick={() => (activeDrawerIssue = null)}
				class="rounded-md bg-card-bg px-2.5 py-1 font-medium text-fg-main hover:bg-canvas-primary"
			>
				Close inspector
			</button>
		</div>
	{/if}
</section>
