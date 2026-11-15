<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { buttonClass } from '../ui/styles';
	import { Check, CircleCheck, CircleDot, GitBranch, Play } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import { Spring, prefersReducedMotion } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import { motionDuration, rise } from '../state/motion.svelte';
	import type { GitHubIssueData, GitHubLabel } from '../types';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children' | 'issue' | 'compact' | 'headingLevel' | 'onDispatchRun' | 'onOpenChat' | 'onClaimToggle' | 'actions'> {
		issue: GitHubIssueData;
		compact?: boolean;
		/** The title's heading level. */
		headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
		/** Gives the card its "Dispatch Agent" button. */
		onDispatchRun?: (issueNumber: number) => void;
		/** Gives the card its "Chat" button. */
		onOpenChat?: (issueNumber: number) => void;
		/** Gives the card its "Claim issue" button, which reads "Claimed" while the issue is in progress. */
		onClaimToggle?: (issueNumber: number, claimed: boolean) => void;
		/** Your own controls for the footer, in place of the card's buttons. */
		actions?: Snippet;
		class?: string;
	}

	let {
		issue,
		compact = false,
		headingLevel = 3,
		onDispatchRun,
		onOpenChat,
		onClaimToggle,
		actions,
		class: className = '',
		...rest
	}: Props = $props();

	let ready = $state(false);

	$effect(() => {
		ready = true;
	});

	let claimed = $derived(issue.state === 'in-progress');
	let buttons = $derived(Boolean(onClaimToggle || onDispatchRun || onOpenChat));

	let criteriaPercent = $derived(
		issue.criteriaTotal && issue.criteriaTotal > 0
			? Math.round(((issue.criteriaCompleted ?? 0) / issue.criteriaTotal) * 100)
			: 0
	);

	/** Who filed the issue and when, as far as it says. */
	let filed = $derived(
		[issue.author && (compact ? issue.author : `Filed by ${issue.author}`), issue.createdAt].filter(Boolean).join(' · ')
	);

	const criteriaSpring = new Spring(0, { stiffness: 0.16, damping: 0.78 });

	$effect(() => {
		void criteriaSpring.set(criteriaPercent, { instant: prefersReducedMotion.current });
	});

	/**
	 * Maps a GitHub label tone to semantic Tailwind badge classes.
	 *
	 * @param tone - Semantic tone of the label.
	 * @returns Tailwind class string.
	 */
	function labelClasses(tone: GitHubLabel['tone']): string {
		switch (tone) {
			case 'accent':
				return 'bg-accent-subtle text-accent-primary border-card-border';
			case 'success':
				return 'bg-status-success-subtle text-status-success border-card-border';
			case 'warning':
				return 'bg-status-warning-subtle text-status-warning border-card-border';
			case 'danger':
				return 'bg-status-danger-subtle text-status-danger border-card-border';
			default:
				return 'bg-canvas-secondary text-fg-light border-card-border';
		}
	}
</script>

<article {...rest}
	aria-label="GitHub Issue {issue.number}: {issue.title}"
	class={cn(`ak-micro-lift flex min-w-0 flex-col justify-between overflow-hidden rounded-card border border-card-border bg-card-bg ${compact ? 'p-3.5' : 'p-4'} text-sm transition-colors`, className)}
>
	<div class="min-w-0">
		<!-- Top Meta Row -->
		<div class="flex flex-wrap items-center justify-between gap-1.5 text-xs">
			<div class="flex min-w-0 items-center gap-1.5">
				{#key issue.state}
					<span
						in:fade={{ duration: motionDuration(140) }}
						class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-chip px-1.5 py-px text-[11px] font-medium {issue.state ===
						'closed'
							? 'bg-canvas-secondary text-fg-light'
							: issue.state === 'ready-for-human'
								? 'bg-status-warning-subtle text-status-warning'
								: 'bg-status-success-subtle text-status-success'}"
					>
						{#if issue.state === 'closed'}
							<CircleCheck aria-hidden="true" class="size-3 shrink-0" />
							<span>Closed</span>
						{:else}
							<CircleDot aria-hidden="true" class="size-3 shrink-0" />
							<span>
								{issue.state === 'in-progress'
									? 'In Progress'
									: issue.state === 'ready-for-human'
										? 'Ready for Review'
										: 'Open'}
							</span>
						{/if}
					</span>
				{/key}

				<svelte:element
					this={issue.href ? 'a' : 'span'}
					href={issue.href}
					class={cn(
						'font-mono text-xs text-fg-light',
						compact ? 'shrink-0 whitespace-nowrap font-medium' : 'min-w-0 truncate',
						issue.href && 'rounded-sm underline decoration-fg-light/50 underline-offset-4 hover:decoration-fg-main'
					)}
				>
					{compact ? `#${issue.number}` : `${issue.repo} · #${issue.number}`}
				</svelte:element>
			</div>

			<div class="flex shrink-0 items-center gap-1 text-xs text-fg-light">
				{#if issue.riskTier}
					<span class="whitespace-nowrap rounded border border-card-border bg-canvas-secondary px-1.5 py-0.5 text-fg-main">
						{issue.riskTier}
					</span>
				{/if}
				{#if issue.size && !compact}
					<span class="whitespace-nowrap rounded border border-card-border bg-canvas-secondary px-1.5 py-0.5">
						Size {issue.size}
					</span>
				{/if}
			</div>
		</div>

		<!-- Title & Summary -->
		<svelte:element this={`h${headingLevel}`} class="mt-2 font-medium leading-snug text-fg-main">
			{issue.title}
		</svelte:element>

		{#if issue.summary && !compact}
			<p class="mt-1.5 text-xs leading-relaxed text-fg-light">
				{issue.summary}
			</p>
		{/if}

		<!-- Labels -->
		{#if issue.labels?.length}
			<div class="mt-2.5 flex flex-wrap gap-1">
				{#each issue.labels as label (label.name)}
					<span
						class="whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium {labelClasses(
							label.tone
						)}"
					>
						{label.name}
					</span>
				{/each}
			</div>
		{/if}

		<!-- Active Worktree & Agent Run Strip -->
		{#if (issue.assignedAgent || issue.worktreeBranch) && !compact}
			<div
				in:rise
				class="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-card-border bg-canvas-secondary/60 px-3 py-2 text-xs"
			>
				{#if issue.assignedAgent}
					<div class="flex items-center gap-2">
						<span class="inline-block size-2 rounded-full bg-accent-primary"></span>
						<span class="font-medium text-fg-main">{issue.assignedAgent}</span>
					</div>
				{/if}
				{#if issue.worktreeBranch}
					<code class="inline-flex min-w-0 items-center gap-1 truncate rounded bg-card-bg px-1.5 py-0.5 text-xs text-fg-light">
						<GitBranch aria-hidden="true" class="size-3 shrink-0" />
						<span class="truncate">{issue.worktreeBranch}</span>
					</code>
				{/if}
			</div>
		{/if}

		<!-- Acceptance Criteria Progress Bar (Svelte 5 Spring) -->
		{#if issue.criteriaTotal && issue.criteriaTotal > 0}
			<div class="mt-3 space-y-1">
				<div class="flex items-center justify-between gap-2 text-xs text-fg-light">
					<span class="whitespace-nowrap">{compact ? 'Criteria' : 'Acceptance criteria'}</span>
					<span class="whitespace-nowrap tabular-nums text-fg-main">
						{issue.criteriaCompleted ?? 0}/{issue.criteriaTotal} ({Math.round(criteriaSpring.current)}%)
					</span>
				</div>
				<div class="h-1 w-full overflow-hidden rounded-full bg-canvas-secondary">
					<div
						class="h-full rounded-full bg-status-success"
						style="width: {Math.max(0, Math.min(100, criteriaSpring.current))}%;"
					></div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Card Footer: who filed it, its pull request, and your controls or a button for each handler -->
	{#if filed || issue.linkedPrNumber || actions || buttons}
		<div
			class="mt-3 border-t border-canvas-border pt-2.5 text-xs {compact
				? 'space-y-2'
				: 'flex flex-wrap items-center justify-between gap-2'}"
		>
			{#if filed || issue.linkedPrNumber}
				<div class="flex flex-wrap items-center justify-between gap-1 text-xs text-fg-light">
					{#if filed}<span class="truncate">{filed}</span>{/if}
					{#if issue.linkedPrNumber}
						<strong class="shrink-0 whitespace-nowrap font-medium text-accent-primary">
							PR #{issue.linkedPrNumber}
						</strong>
					{/if}
				</div>
			{/if}

			{#if actions}
				{@render actions()}
			{:else if buttons}
				<div class="flex flex-wrap items-center gap-1.5">
					{#if onClaimToggle}
						<button
							type="button"
							disabled={!ready}
							onclick={() => onClaimToggle(issue.number, !claimed)}
							class={buttonClass('secondary', 'sm')}
						>
							{#if claimed}
								<Check aria-hidden="true" class="size-3 shrink-0 text-status-success" />
								<span>Claimed</span>
							{:else}
								<span>{compact ? 'Claim' : 'Claim issue'}</span>
							{/if}
						</button>
					{/if}
					{#if onDispatchRun}
						<button
							type="button"
							disabled={!ready}
							onclick={() => onDispatchRun(issue.number)}
							class={buttonClass('primary', 'sm')}
						>
							<Play aria-hidden="true" class="size-2.5 shrink-0" />
							<span>{compact ? 'Dispatch' : 'Dispatch Agent'}</span>
						</button>
					{/if}
					{#if onOpenChat}
						<button
							type="button"
							disabled={!ready}
							onclick={() => onOpenChat(issue.number)}
							class={buttonClass('secondary', 'sm')}
						>
							Chat
						</button>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</article>
