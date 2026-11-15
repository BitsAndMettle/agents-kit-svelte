<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { buttonClass } from '../ui/styles';
	import { ArrowRight, ChevronDown, ShieldCheck } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import AgentDisclosure from '../agents/AgentDisclosure.svelte';
	import CheckMark from './CheckMark.svelte';
	import { PR_STATES } from './pr-state';
	import type { GitHubPullRequestData } from '../types';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children' | 'pr' | 'defaultChecksOpen' | 'headingLevel' | 'actions' | 'onApproveMerge' | 'onRequestChanges'> {
		pr: GitHubPullRequestData;
		defaultChecksOpen?: boolean;
		/** The title's heading level. */
		headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
		/** Gives the card its "Approve & Queue Merge" button. */
		onApproveMerge?: (prNumber: number) => void;
		/** Gives the card its "Send back" button. */
		onRequestChanges?: (prNumber: number) => void;
		/** Your own controls for the footer, in place of the card's buttons. */
		actions?: Snippet;
		class?: string;
	}

	let {
		pr,
		defaultChecksOpen = true,
		headingLevel = 3,
		onApproveMerge,
		onRequestChanges,
		actions,
		class: className = '',
		...rest
	}: Props = $props();

	let checksOpen = $state(true);
	let ready = $state(false);

	$effect(() => {
		ready = true;
	});

	$effect(() => {
		checksOpen = defaultChecksOpen;
	});

	let byline = $derived([pr.author && `by ${pr.author}`, pr.updatedAt].filter(Boolean).join(' · '));
	let checks = $derived(pr.checks ?? []);
	let passedCount = $derived(checks.filter((c) => c.status === 'passed').length);
	/** How the checks stand as a whole: as the pull request says, or as its runs add up. */
	let checksStatus = $derived(
		pr.checksStatus ??
			(checks.some((c) => c.status === 'failed') ? 'failed' : checks.some((c) => c.status === 'running') ? 'running' : 'passed')
	);
	let prState = $derived(PR_STATES[pr.state]);
	const panelId = $props.id();
</script>

<article {...rest}
	aria-label="GitHub Pull Request {pr.number}{pr.title ? `: ${pr.title}` : ''}"
	class={cn('rounded-card border border-card-border bg-card-bg p-4 text-sm', className)}
>
	<!-- Header Row -->
	<div class="flex flex-wrap items-center justify-between gap-2 text-xs">
		<div class="flex flex-wrap items-center gap-2">
			<span class="inline-flex items-center gap-1.5 rounded-chip px-1.5 py-px text-[11px] font-medium {prState.class}">
				<prState.icon aria-hidden="true" class="size-3" />
				<span>{prState.label}</span>
			</span>
			<svelte:element this={pr.href ? 'a' : 'span'} href={pr.href} class={cn('font-mono font-medium text-fg-main', pr.href && 'rounded-sm underline decoration-fg-light/50 underline-offset-4 hover:decoration-fg-main')}>PR #{pr.number}</svelte:element>
			{#if pr.linkedIssueNumber}
				<span class="rounded bg-canvas-secondary px-1.5 py-0.5 font-mono text-[11px] text-fg-light">
					Fixes #{pr.linkedIssueNumber}
				</span>
			{/if}
		</div>

		<div class="flex items-center gap-2 text-xs tabular-nums">
			{#if pr.additions !== undefined}<span class="font-medium text-diff-add-fg">+{pr.additions}</span>{/if}
			{#if pr.deletions !== undefined}<span class="font-medium text-diff-del-fg">−{pr.deletions}</span>{/if}
			{#if pr.changedFilesCount !== undefined}<span class="font-mono text-fg-light">({pr.changedFilesCount} files)</span>{/if}
			{#if pr.riskTier}
				<span class="rounded border border-card-border bg-canvas-secondary px-1.5 py-0.5 font-mono text-[11px] text-fg-main">
					{pr.riskTier}
				</span>
			{/if}
		</div>
	</div>

	<!-- Title & Branch Pill -->
	{#if pr.title}
		<svelte:element this={`h${headingLevel}`} class="mt-2 font-medium leading-snug text-fg-main">{pr.title}</svelte:element>
	{/if}

	{#if pr.headBranch || pr.baseBranch || byline}
		<div class="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-xs text-fg-light">
			{#if pr.headBranch}
				<code class="rounded bg-canvas-secondary px-2 py-0.5 text-[11px] text-fg-main">
					{pr.headBranch}
				</code>
			{/if}
			{#if pr.headBranch && pr.baseBranch}<ArrowRight aria-hidden="true" class="size-3" />{/if}
			{#if pr.baseBranch}
				<code class="rounded bg-canvas-secondary px-2 py-0.5 text-[11px] text-fg-main">
					{pr.baseBranch}
				</code>
			{/if}
			{#if byline}<span class="ml-auto text-[11px]">{byline}</span>{/if}
		</div>
	{/if}

	<!-- Referee Verdict Banner -->
	{#if pr.refereeSummary}
		<div
			class="mt-3 flex items-start gap-2.5 rounded-lg border border-card-border px-3 py-2 text-xs {pr.refereeStatus ===
			'pass'
				? 'bg-status-success-subtle text-status-success'
				: pr.refereeStatus === 'send-back'
					? 'bg-status-danger-subtle text-status-danger'
					: 'bg-status-warning-subtle text-status-warning'}"
		>
			<ShieldCheck aria-hidden="true" class="mt-0.5 size-3.5 shrink-0" />
			<p class="leading-relaxed font-medium">{pr.refereeSummary}</p>
		</div>
	{/if}

	<!-- CI Checks: a rollup that opens where the runs are held, one line where only their summary is -->
	{#if checks.length}
		<div class="mt-3 overflow-hidden rounded-lg border border-card-border bg-canvas-secondary/30">
			<button
				type="button"
				aria-expanded={checksOpen}
				aria-controls={panelId}
				onclick={() => (checksOpen = !checksOpen)}
				class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-fg-main transition-colors hover:bg-canvas-secondary"
			>
				<span class="flex items-center gap-2">
					<CheckMark status={checksStatus} />
					<span>Checks ({passedCount}/{checks.length} passed)</span>
				</span>
				<ChevronDown aria-hidden="true" class="size-3.5 text-fg-light transition-transform duration-150 {checksOpen
						? 'rotate-180'
						: ''}" />
			</button>

			<AgentDisclosure id={panelId} open={checksOpen}>
				<ul class="divide-y divide-canvas-border border-t border-canvas-border bg-card-bg text-xs">
					{#each checks as check (check.id)}
						<li class="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
							<div class="min-w-0">
								<div class="flex items-center gap-2">
									<CheckMark status={check.status} />
									<span class="font-medium text-fg-main">{check.name}</span>
									{#if check.workflow}
										<span class="rounded bg-canvas-secondary px-1.5 py-0.5 font-mono text-[10px] text-fg-light">
											{check.workflow}
										</span>
									{/if}
								</div>
								{#if check.summary}
									<p class="mt-0.5 pl-5.5 text-[11px] text-fg-light">{check.summary}</p>
								{/if}
							</div>
							{#if check.duration}<span class="font-mono text-[11px] tabular-nums text-fg-light">{check.duration}</span>{/if}
						</li>
					{/each}
				</ul>
			</AgentDisclosure>
		</div>
	{:else if pr.checksStatus}
		<p class="mt-3 flex items-center gap-2 rounded-lg border border-card-border bg-canvas-secondary/30 px-3 py-2 text-xs font-medium text-fg-main">
			<CheckMark status={pr.checksStatus} spoken={false} />
			<span>Checks {pr.checksStatus}</span>
		</p>
	{/if}

	<!-- Actions: yours, or a button for each handler the card is given -->
	{#if actions || onRequestChanges || onApproveMerge}
		<div class="mt-3.5 flex flex-wrap items-center justify-end gap-1.5 border-t border-canvas-border pt-2.5 text-xs">
			{#if actions}
				{@render actions()}
			{:else}
				{#if onRequestChanges}
					<button type="button" disabled={!ready} onclick={() => onRequestChanges(pr.number)} class={buttonClass('secondary', 'sm')}>
						Send back
					</button>
				{/if}
				{#if onApproveMerge}
					<button type="button" disabled={!ready} onclick={() => onApproveMerge(pr.number)} class={buttonClass('primary', 'sm')}>
						Approve & Queue Merge
					</button>
				{/if}
			{/if}
		</div>
	{/if}
</article>
