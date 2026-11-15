<script lang="ts">
	import {
		SAMPLE_BENTO_STATS,
		SAMPLE_BOARD_ISSUES,
		SAMPLE_BRANCH,
		SAMPLE_CHECKS,
		SAMPLE_COMMIT,
		SAMPLE_ENVIRONMENTS,
		SAMPLE_INCIDENT,
		SAMPLE_ISSUE,
		SAMPLE_LIFECYCLE_STAGES,
		SAMPLE_MERGE_QUEUE,
		SAMPLE_PULL_REQUEST,
		SAMPLE_RELEASE,
		SAMPLE_REVIEW_FILES,
		SAMPLE_REVIEW_THREAD,
		SAMPLE_TRIAGE_ISSUE
	} from '$lib/fixtures/github';
	import GitHubBentoLayout from '$lib/github/GitHubBentoLayout.svelte';
	import GitHubChecksPanel from '$lib/github/GitHubChecksPanel.svelte';
	import GitHubCommitCard from '$lib/github/GitHubCommitCard.svelte';
	import GitHubIssueCard from '$lib/github/GitHubIssueCard.svelte';
	import GitHubKanbanBoard from '$lib/github/GitHubKanbanBoard.svelte';
	import GitHubPullRequestCard from '$lib/github/GitHubPullRequestCard.svelte';
	import GitHubReviewThreadCard from '$lib/github/GitHubReviewThreadCard.svelte';
	import GitHubBranchCard from '$lib/github/GitHubBranchCard.svelte';
	import GitHubDeploymentPipeline from '$lib/github/GitHubDeploymentPipeline.svelte';
	import GitHubIncidentCard from '$lib/github/GitHubIncidentCard.svelte';
	import GitHubIssueTriage from '$lib/github/GitHubIssueTriage.svelte';
	import GitHubLifecycleTimeline from '$lib/github/GitHubLifecycleTimeline.svelte';
	import GitHubMergeQueue from '$lib/github/GitHubMergeQueue.svelte';
	import GitHubPullRequestReview from '$lib/github/GitHubPullRequestReview.svelte';
	import GitHubReleaseCard from '$lib/github/GitHubReleaseCard.svelte';
	import { buttonClass, SEGMENT_GROUP_CLASS, segmentClass } from '$lib/ui/styles';
	import { Columns3, LayoutGrid, RotateCcw, Route, SquareStack } from '@lucide/svelte';

	const VIEWS = [
		{ id: 'lifecycle', label: 'Lifecycle', icon: Route },
		{ id: 'kanban', label: 'Kanban board', icon: Columns3 },
		{ id: 'bento', label: 'Repository pulse', icon: LayoutGrid },
		{ id: 'cards', label: 'Card primitives', icon: SquareStack }
	] as const;

	type ViewId = (typeof VIEWS)[number]['id'];

	/** The lifecycle view walks through the phases of shipping a change, in order. */
	const PHASES = [
		{ id: 'plan', step: '01', title: 'Plan', blurb: 'An issue arrives, gets triaged, and lands on someone’s plate.' },
		{ id: 'build', step: '02', title: 'Build', blurb: 'A branch is cut from the issue and commits start landing.' },
		{ id: 'review', step: '03', title: 'Review', blurb: 'The pull request is read file by file, with comments inline.' },
		{ id: 'verify', step: '04', title: 'Verify & merge', blurb: 'Required checks run, then the merge queue lands changes in order.' },
		{ id: 'ship', step: '05', title: 'Ship', blurb: 'The merge promotes through environments and becomes a release.' },
		{ id: 'operate', step: '06', title: 'Operate', blurb: 'When production misbehaves, the suspect change is found and reverted.' }
	] as const;

	let activeView = $state<ViewId>('lifecycle');
	let replays = $state<Record<string, number>>({});

	/**
	 * Restarts the live demos in one lifecycle phase.
	 *
	 * @param id - Phase (or `timeline`) to replay.
	 */
	function replay(id: string): void {
		replays = { ...replays, [id]: (replays[id] ?? 0) + 1 };
	}
	let ready = $state(false);
	let eventLog = $state<string[]>([
		'Connected to RSynapse/trailside (read-only installation token in memory)'
	]);

	$effect(() => {
		ready = true;
	});

	/**
	 * Prepends an interaction event to the live GitHub activity log.
	 *
	 * @param entry - Human-readable event description.
	 */
	function recordEvent(entry: string): void {
		eventLog = [`[${new Date().toLocaleTimeString()}] ${entry}`, ...eventLog.slice(0, 7)];
	}
</script>

<div class="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6">
	<!-- Page Header -->
	<div class="flex flex-wrap items-end justify-between gap-5">
		<div class="max-w-2xl">
			<p class="text-xs font-medium text-accent-primary">GitHub suite</p>
			<h1 class="mt-2 font-display text-[2.25rem] leading-tight font-normal tracking-[-0.02em] text-fg-main">
				The whole dev lifecycle, from first issue to the 2am incident.
			</h1>
			<p class="mt-3 text-sm leading-6 text-fg-light">
				Portable Svelte 5 components for triage, branches, reviews, CI checks, merge queues,
				deployments, releases and incidents. Every one plays itself, and takes over when you click.
			</p>
		</div>

		<div role="tablist" aria-label="GitHub layout views" class="{SEGMENT_GROUP_CLASS} max-w-full overflow-x-auto">
			{#each VIEWS as view (view.id)}
				<button
					type="button"
					role="tab"
					disabled={!ready}
					aria-selected={activeView === view.id}
					onclick={() => (activeView = view.id)}
					class="{segmentClass(activeView === view.id)} shrink-0 whitespace-nowrap"
				>
					<view.icon aria-hidden="true" />
					{view.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Live Interaction Telemetry Bar -->
	<div class="flex flex-wrap items-center justify-between gap-2 rounded-full border border-card-border bg-card-bg px-4 py-2 text-xs ak-shadow-soft-sm">
		<span class="inline-flex items-center gap-1.5 font-medium text-fg-main"><span aria-hidden="true" class="ak-breathe size-1.5 rounded-full bg-status-success"></span>Live intent stream</span>
		<span class="min-w-0 flex-1 truncate font-mono text-[11px] text-fg-light">{eventLog[0]}</span>
		<span class="text-fg-light">{eventLog.length} events</span>
	</div>

	{#if activeView === 'lifecycle'}
		<div class="space-y-10">
			<div class="relative">
				{#key replays.timeline ?? 0}
					<GitHubLifecycleTimeline title="From issue to release" description="Every hand-off between people, agents and GitHub, in order." doneLabel="Shipped" stages={SAMPLE_LIFECYCLE_STAGES} live onSelectStage={(stage) => recordEvent(`Inspected lifecycle stage: ${stage.label}`)} />
				{/key}
			</div>

			{#each PHASES as phase (phase.id)}
				<section aria-labelledby="phase-{phase.id}" class="space-y-4">
					<div class="flex flex-wrap items-end justify-between gap-3 px-1">
						<div>
							<p class="font-mono text-[11px] text-accent-primary">{phase.step}</p>
							<h2 id="phase-{phase.id}" class="mt-0.5 text-base font-semibold tracking-[-0.01em] text-fg-main">{phase.title}</h2>
							<p class="mt-0.5 text-[13px] text-fg-light">{phase.blurb}</p>
						</div>
						<button type="button" disabled={!ready} onclick={() => replay(phase.id)} class={buttonClass('ghost', 'sm')}>
							<RotateCcw aria-hidden="true" />Replay
						</button>
					</div>

					{#key replays[phase.id] ?? 0}
						{#if phase.id === 'plan'}
							<div class="grid items-start gap-4 [&>*]:min-w-0 lg:grid-cols-2">
								<GitHubIssueTriage issue={SAMPLE_TRIAGE_ISSUE} live
									onApply={(n, applied) => recordEvent(`Applied triage to Issue ${n}: ${applied.join(', ')}`)}
									onMarkDuplicate={(n, d) => recordEvent(`Linked Issue ${n} to Issue ${d}`)}
								/>
								<GitHubIssueCard issue={SAMPLE_ISSUE}
									onDispatchRun={(n) => recordEvent(`Dispatched Claude Code worktree run on Issue ${n}`)}
									onClaimToggle={(n, c) => recordEvent(`${c ? 'Claimed' : 'Released'} Issue ${n}`)}
								/>
							</div>
						{:else if phase.id === 'build'}
							<div class="grid items-start gap-4 [&>*]:min-w-0 lg:grid-cols-2">
								<GitHubBranchCard branch={SAMPLE_BRANCH} live
									onOpenWorktree={(b) => recordEvent(`Opened worktree for ${b}`)}
									onCompare={(b, base) => recordEvent(`Comparing ${base}...${b}`)}
								/>
								<GitHubCommitCard commit={SAMPLE_COMMIT} onRestore={(sha) => recordEvent(`Restored worktree to commit ${sha}`)} />
							</div>
						{:else if phase.id === 'review'}
							<div class="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[3fr_2fr]">
								<GitHubPullRequestReview prNumber={2210} title="fix(export): quote CSV fields per RFC 4180" reviewer="mira-chen" files={SAMPLE_REVIEW_FILES} live onSubmitReview={(n, v) => recordEvent(`Submitted review on PR ${n}: ${v}`)} />
								<div class="space-y-4">
									<GitHubPullRequestCard pr={SAMPLE_PULL_REQUEST}
										onApproveMerge={(n) => recordEvent(`Queued PR ${n} for referee merge`)}
										onRequestChanges={(n) => recordEvent(`Sent back PR ${n} for agent revision`)}
									/>
									<GitHubReviewThreadCard currentUser="argon-agent" thread={SAMPLE_REVIEW_THREAD}
										onApplySuggestion={(id) => recordEvent(`Applied suggested patch on thread ${id}`)}
										onReply={(id, text) => recordEvent(`Replied on ${id}: "${text}"`)}
									/>
								</div>
							</div>
						{:else if phase.id === 'verify'}
							<div class="grid items-start gap-4 [&>*]:min-w-0 lg:grid-cols-2">
								<GitHubChecksPanel checks={SAMPLE_CHECKS}
									onFixWithAgent={(id) => recordEvent(`Launched Claude Code to fix check ${id}`)}
									onRerunCheck={(id) => recordEvent(`Re-running check ${id}`)}
								/>
								<GitHubMergeQueue entries={SAMPLE_MERGE_QUEUE} live onRemove={(n) => recordEvent(`Removed PR ${n} from the merge queue`)} />
							</div>
						{:else if phase.id === 'ship'}
							<div class="grid items-start gap-4 [&>*]:min-w-0 lg:grid-cols-2">
								<GitHubDeploymentPipeline sha="9b07d3e" environments={SAMPLE_ENVIRONMENTS} live
									onApprove={(env) => recordEvent(`Approved deployment to ${env}`)}
									onRollback={(env) => recordEvent(`Rolled back ${env}`)}
								/>
								<GitHubReleaseCard release={SAMPLE_RELEASE} live onPublish={(tag, pre) => recordEvent(`Published ${tag}${pre ? ' as a pre-release' : ''}`)} />
							</div>
						{:else}
							<div class="grid items-start gap-4 [&>*]:min-w-0 lg:grid-cols-2">
								<GitHubIncidentCard incident={SAMPLE_INCIDENT} live onRevert={(pr, sha) => recordEvent(`Opened revert of PR ${pr} (${sha})`)} />
								<div class="rounded-card border border-dashed border-card-border p-5 text-[13px] leading-6 text-fg-light">
									<p class="font-medium text-fg-main">Closing the loop</p>
									<p class="mt-1">
										The incident’s follow-up issue goes straight back to Plan, where triage picks it up
										and the cycle starts again. Hit Replay on the timeline above to watch it from the top.
									</p>
									<button type="button" disabled={!ready} onclick={() => replay('timeline')} class="{buttonClass('secondary', 'sm')} mt-3">
										<RotateCcw aria-hidden="true" />Replay timeline
									</button>
								</div>
							</div>
						{/if}
					{/key}
				</section>
			{/each}
		</div>
	{:else if activeView === 'kanban'}
		<GitHubKanbanBoard title="RSynapse/trailside · Reactive Board" badge="GitHub App Read-Only Sync" description="What's in motion across Triage, Active Worktree Runs, Referee Review, and Merged cards" issues={SAMPLE_BOARD_ISSUES}
			onSelectIssue={(issue) => recordEvent(`Opened card inspector for Issue ${issue.number}`)}
		/>
	{:else if activeView === 'bento'}
		<GitHubBentoLayout repoName="RSynapse/trailside" repoDetail="GitHub App installation active" branchDetail="Protected · Referee merge queue" stats={SAMPLE_BENTO_STATS} pullRequest={SAMPLE_PULL_REQUEST} checks={SAMPLE_CHECKS} issue={SAMPLE_ISSUE} commit={SAMPLE_COMMIT} thread={SAMPLE_REVIEW_THREAD} />
	{:else}
		<div class="grid gap-6 lg:grid-cols-2">
			<div class="space-y-4">
				<h2 class="px-1 text-xs font-medium text-fg-light">
					GitHubIssueCard & GitHubPullRequestCard
				</h2>
				<GitHubIssueCard issue={SAMPLE_ISSUE}
					onDispatchRun={(n) => recordEvent(`Dispatched Claude Code worktree run on Issue ${n}`)}
					onClaimToggle={(n, c) => recordEvent(`${c ? 'Claimed' : 'Released'} Issue ${n}`)}
				/>
				<GitHubPullRequestCard pr={SAMPLE_PULL_REQUEST}
					onApproveMerge={(n) => recordEvent(`Queued PR ${n} for referee merge`)}
					onRequestChanges={(n) => recordEvent(`Sent back PR ${n} for agent revision`)}
				/>
			</div>
			<div class="space-y-4">
				<h2 class="px-1 text-xs font-medium text-fg-light">
					GitHubChecksPanel, GitHubCommitCard & GitHubReviewThreadCard
				</h2>
				<GitHubChecksPanel checks={SAMPLE_CHECKS}
					onFixWithAgent={(id) => recordEvent(`Launched Claude Code to fix check ${id}`)}
					onRerunCheck={(id) => recordEvent(`Re-running check ${id}`)}
				/>
				<GitHubCommitCard commit={SAMPLE_COMMIT}
					onRestore={(sha) => recordEvent(`Restored worktree to commit ${sha}`)}
				/>
				<GitHubReviewThreadCard currentUser="argon-agent" thread={SAMPLE_REVIEW_THREAD}
					onApplySuggestion={(id) => recordEvent(`Applied suggested patch on thread ${id}`)}
					onReply={(id, text) => recordEvent(`Replied on ${id}: "${text}"`)}
				/>
			</div>
		</div>
	{/if}
</div>
