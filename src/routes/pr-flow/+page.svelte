<script lang="ts">
	import AgentWorkTrace from '$lib/agents/AgentWorkTrace.svelte';
	import ThinkingShimmer from '$lib/agents/ThinkingShimmer.svelte';
	import GitHubChecksWaterfall from '$lib/github/GitHubChecksWaterfall.svelte';
	import GitHubPrActionBar from '$lib/github/GitHubPrActionBar.svelte';
	import GitHubPullRequestGraph from '$lib/github/GitHubPullRequestGraph.svelte';
	import { SAMPLE_CHECK_RUNS, SAMPLE_PR_DIFF, SAMPLE_PR_GRAPH_COMMITS, SAMPLE_PR_GRAPH_LANES } from '$lib/fixtures/github';
	import { SAMPLE_WORK_STEPS } from '$lib/fixtures/chat';
	import type { CheckRun, ChecksPhase, PrActionStatus, PrGraphCommit, PrMergeState, PrState, WorkStep } from '$lib/types';
	import { buttonClass, pillClass } from '$lib/ui/styles';
	import { cn } from '$lib/ui/cn';
	import { rise } from '$lib/state/motion.svelte';
	import { ArrowUp, ChevronDown, FolderGit2, Laptop, RotateCcw } from '@lucide/svelte';
	import { onMount, tick } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';

	/** Seconds of CI per real second, so a 70 s suite plays in about 9 s. */
	const SPEED = 8;
	const PR = 128;
	const FIX_COMMIT: PrGraphCommit = { sha: '4a1c9e2', message: 'Keep the refreshed session on redirects', lane: 'session', author: 'Claude', age: 'now' };

	/** Second run, on the fix commit: everything passes. */
	const RERUN: CheckRun[] = [
		{ id: 'lint', name: 'lint', status: 'passed', start: 1, duration: 11 },
		{ id: 'typecheck', name: 'typecheck', status: 'passed', start: 1, duration: 19 },
		{ id: 'unit', name: 'unit', status: 'passed', start: 2, duration: 33 },
		{ id: 'preview', name: 'Vercel Preview', status: 'passed', start: 0, duration: 38 },
		{ id: 'e2e', name: 'e2e', status: 'passed', start: 41, duration: 29 }
	];

	type FeedItem =
		| { id: string; type: 'user'; text: string }
		| { id: string; type: 'thinking' }
		| { id: string; type: 'text'; text: string }
		| { id: string; type: 'pr' }
		| { id: string; type: 'trace'; steps: WorkStep[]; status: 'running' | 'done'; elapsed: number; expanded: boolean };

	let feed = $state<FeedItem[]>([]);
	let action = $state<PrActionStatus>('idle');
	let prState = $state<PrState>('open');
	let mergeState = $state<PrMergeState>('checking');
	let commits = $state<PrGraphCommit[]>([...SAMPLE_PR_GRAPH_COMMITS]);
	let phase = $state<ChecksPhase>('checks');
	let schedule = $state<CheckRun[]>(SAMPLE_CHECK_RUNS);
	let simT = $state(0);
	let suiteCommit = $state({ sha: 'd29f50a', message: 'Add session refresh tests' });
	let showChecks = $state(false);
	let checksOpen = $state(true);
	let autoplay = $state(true);
	let draft = $state('');
	let pending = $state<'create' | 'fix' | 'merge' | null>(null);
	let feedEl: HTMLDivElement | undefined = $state();

	/** Where each check is at sim time `t`: queued, running, or its final result. */
	function checksAt(runs: CheckRun[], t: number): CheckRun[] {
		return runs.map((c) => {
			const start = c.start ?? 0;
			if (t < start) return { ...c, status: 'queued', start: undefined, duration: undefined, failure: undefined };
			if (c.duration !== undefined && t < start + c.duration) return { ...c, status: 'running', duration: undefined, failure: undefined };
			return c;
		});
	}
	let checks = $derived(checksAt(schedule, simT));
	let done = $derived(checks.filter((c) => c.status === 'passed').length);
	let failed = $derived(checks.filter((c) => c.status === 'failed'));
	let suiteEnd = $derived(Math.max(...schedule.map((c) => (c.start ?? 0) + (c.duration ?? 0))));

	let footer = $derived.by<{ label: string; tone: 'running' | 'success' | 'danger' | 'neutral' }>(() => {
		if (prState === 'merged') return { label: 'Merged into main', tone: 'neutral' };
		if (mergeState === 'checking') return { label: 'Checking it merges cleanly', tone: 'running' };
		if (phase === 'merging') return { label: 'Merging', tone: 'running' };
		if (phase === 'fixing') return { label: 'Fixing e2e', tone: 'running' };
		if (failed.length) return { label: `${failed[0].name} failed`, tone: 'danger' };
		if (done === checks.length) return { label: 'All checks passed', tone: 'success' };
		return { label: `Checks ${done}/${checks.length}`, tone: 'running' };
	});

	// --- the script ---------------------------------------------------------

	let gen = 0;
	let uid = 0;
	let autoTimer: ReturnType<typeof setTimeout> | undefined;
	let resolvePending: (() => void) | null = null;
	const CANCELLED = Symbol('cancelled');

	const id = () => `f${++uid}`;
	function guard(g: number): void {
		if (g !== gen) throw CANCELLED;
	}
	async function sleep(ms: number, g: number): Promise<void> {
		await new Promise((r) => setTimeout(r, prefersReducedMotion.current ? Math.min(ms, 120) : ms));
		guard(g);
	}
	async function frame(g: number): Promise<number> {
		const ts = await new Promise<number>((r) => requestAnimationFrame(r));
		guard(g);
		return ts;
	}
	function push(item: FeedItem): FeedItem {
		feed.push(item);
		return feed[feed.length - 1];
	}

	/** Waits for the person to press `kind`; with autoplay on, presses it for them after `ms`. */
	async function waitFor(kind: 'create' | 'fix' | 'merge', ms: number, g: number): Promise<void> {
		pending = kind;
		await new Promise<void>((r) => {
			resolvePending = r;
			if (autoplay) autoTimer = setTimeout(() => press(kind), ms);
		});
		guard(g);
	}
	function press(kind: 'create' | 'fix' | 'merge'): void {
		if (pending !== kind) return;
		clearTimeout(autoTimer);
		pending = null;
		resolvePending?.();
		resolvePending = null;
	}
	function toggleAutoplay(): void {
		autoplay = !autoplay;
		clearTimeout(autoTimer);
		if (autoplay && pending) {
			const kind = pending;
			autoTimer = setTimeout(() => press(kind), 1200);
		}
	}

	/** Plays the suite in fast-forward until every check has a result. */
	async function runSuite(runs: CheckRun[], g: number): Promise<void> {
		schedule = runs;
		simT = 0;
		const end = Math.max(...runs.map((c) => (c.start ?? 0) + (c.duration ?? 0)));
		if (prefersReducedMotion.current) {
			simT = end;
			return;
		}
		let last = await frame(g);
		while (simT < end) {
			const ts = await frame(g);
			simT = Math.min(end, simT + ((ts - last) / 1000) * SPEED);
			last = ts;
		}
	}

	async function script(g: number): Promise<void> {
		push({
			id: id(),
			type: 'trace',
			status: 'done',
			elapsed: 134,
			expanded: false,
			steps: [
				{ id: 'p1', label: 'Read the session code', status: 'done' },
				{ id: 'p2', label: 'Edited session.ts', kind: 'edit', status: 'done', files: ['src/lib/session.ts'] },
				{ id: 'p3', label: 'Added session refresh tests', kind: 'edit', status: 'done', files: ['src/lib/session.test.ts'] }
			]
		});
		push({ id: id(), type: 'text', text: 'Sessions now refresh five minutes before they expire, and the new tests cover it. The branch is ready for a pull request.' });

		// 1. Create the PR
		await waitFor('create', 1600, g);
		push({ id: id(), type: 'user', text: 'Create PR' });
		action = 'creating';
		const thinking = push({ id: id(), type: 'thinking' });
		await sleep(700, g);
		push({ id: id(), type: 'pr' });
		await sleep(1900, g);
		feed.splice(feed.indexOf(thinking), 1);
		push({
			id: id(),
			type: 'trace',
			status: 'done',
			elapsed: 4,
			expanded: false,
			steps: [
				{ id: 'o1', label: 'Pushed feat/session-refresh', kind: 'push', status: 'done' },
				{ id: 'o2', label: `Opened #${PR} against main`, status: 'done' }
			]
		});
		mergeState = 'clean';
		action = 'created';
		push({ id: id(), type: 'text', text: `PR #${PR} is open and merges cleanly into main. Checks are running now.` });
		showChecks = true;

		// 2. First run: e2e fails
		await runSuite(SAMPLE_CHECK_RUNS, g);
		await waitFor('fix', 2200, g);

		// 3. Fix it
		phase = 'fixing';
		checksOpen = false;
		push({ id: id(), type: 'user', text: 'Fix e2e' });
		const trace = push({ id: id(), type: 'trace', status: 'running', elapsed: 0, expanded: true, steps: [] });
		if (trace.type !== 'trace') return;
		const started = performance.now();
		const clock = setInterval(() => (trace.elapsed = (performance.now() - started) / 1000), 250);
		try {
			const steps = SAMPLE_WORK_STEPS.filter((s) => s.kind !== 'result');
			for (const step of steps) {
				trace.steps.push({ ...step, status: 'running', label: step.kind === 'run' ? 'Running 11 of 12 e2e tests' : step.label });
				await sleep(step.kind === 'run' ? 1100 : 700, g);
				trace.steps[trace.steps.length - 1] = { ...step };
			}
			const result = SAMPLE_WORK_STEPS.find((s) => s.kind === 'result');
			if (result) trace.steps.push({ ...result });
		} finally {
			clearInterval(clock);
		}
		trace.status = 'done';
		trace.elapsed = Math.max(5, trace.elapsed);
		push({
			id: id(),
			type: 'text',
			text: 'After a session refresh, the sign-in redirect dropped the new cookie, so checkout sent you back to sign in. middleware.ts now keeps the refreshed cookie on redirects. Checks are running again on 4a1c9e.'
		});
		commits = [FIX_COMMIT, ...commits];
		suiteCommit = { sha: FIX_COMMIT.sha, message: FIX_COMMIT.message };
		phase = 'checks';
		checksOpen = true;

		// 4. Second run: all green
		await runSuite(RERUN, g);
		await waitFor('merge', 1800, g);

		// 5. Merge
		phase = 'merging';
		await sleep(1500, g);
		phase = 'merged';
		prState = 'merged';
		mergeState = 'merged';
		checksOpen = false;
		push({ id: id(), type: 'text', text: `Merged #${PR} into main and deleted feat/session-refresh.` });
	}

	function start(): void {
		gen++;
		clearTimeout(autoTimer);
		resolvePending = null;
		pending = null;
		feed = [];
		action = 'idle';
		prState = 'open';
		mergeState = 'checking';
		commits = [...SAMPLE_PR_GRAPH_COMMITS];
		phase = 'checks';
		schedule = SAMPLE_CHECK_RUNS;
		simT = 0;
		suiteCommit = { sha: 'd29f50a', message: 'Add session refresh tests' };
		showChecks = false;
		checksOpen = true;
		const g = gen;
		script(g).catch((err) => {
			if (err !== CANCELLED) throw err;
		});
	}

	onMount(() => {
		start();
		return () => {
			gen++;
			clearTimeout(autoTimer);
		};
	});

	/** Keep the newest message in view. */
	$effect(() => {
		void feed.length;
		void showChecks;
		tick().then(() => feedEl?.scrollTo({ top: feedEl.scrollHeight, behavior: prefersReducedMotion.current ? 'auto' : 'smooth' }));
	});

	function send(event: SubmitEvent): void {
		event.preventDefault();
		const text = draft.trim();
		if (!text) return;
		draft = '';
		push({ id: id(), type: 'user', text });
		push({ id: id(), type: 'text', text: 'This demo only scripts the pull request flow. Press Replay to watch it again, or turn autoplay off and press the buttons yourself.' });
	}
</script>

<svelte:head>
	<title>PR flow · Agents Kit Svelte</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
	<div>
		<p class="text-xs font-medium text-accent-primary">GitHub · Intelligent UI</p>
		<h1 class="mt-2 font-display text-[2.25rem] leading-tight font-normal tracking-[-0.02em] text-fg-main">
			From diff to merged, without leaving the chat.
		</h1>
		<p class="mt-3 text-sm leading-6 text-fg-light">
			The agent opens a pull request, watches its checks, fixes the one that fails, and merges. It plays by itself. Press
			any button to take over, or turn autoplay off and drive it.
		</p>
	</div>

	<section aria-label="Demo controls" class="flex flex-wrap items-center gap-3">
		<button type="button" class={buttonClass('primary', 'sm')} onclick={start}><RotateCcw class="size-3.5" aria-hidden="true" />Replay</button>
		<label class="flex cursor-pointer items-center gap-2 text-xs text-fg-light">
			<input type="checkbox" checked={autoplay} onchange={toggleAutoplay} class="accent-[var(--ak-color-accent)]" />
			Autoplay
		</label>
		{#if pending && !autoplay}
			<span class="text-xs text-fg-light" in:rise={{ y: 3, duration: 160 }}>
				Waiting for you to press <strong class="font-medium text-fg-main">{pending === 'create' ? 'Create PR' : pending === 'fix' ? 'Fix' : 'Merge'}</strong>
			</span>
		{/if}
	</section>

	<div class="flex h-[min(46rem,calc(100dvh-8rem))] min-h-[34rem] flex-col overflow-hidden rounded-soft border border-chat-border bg-canvas-bg ak-shadow-soft-sm">
		<div bind:this={feedEl} class="flex-1 space-y-5 overflow-y-auto px-4 pt-6 pb-4 sm:px-6">
			{#each feed as item (item.id)}
				<div in:rise={{ y: 6, duration: 220 }}>
					{#if item.type === 'user'}
						<p class="ml-auto w-fit max-w-[80%] rounded-[18px] bg-chat-user px-4 py-2 text-sm text-fg-main">{item.text}</p>
					{:else if item.type === 'thinking'}
						<ThinkingShimmer label="Thinking" class="text-sm" />
					{:else if item.type === 'text'}
						<p class="text-[15px] leading-7 text-fg-main">{item.text}</p>
					{:else if item.type === 'trace'}
						<AgentWorkTrace steps={item.steps} status={item.status} elapsed={item.elapsed} bind:expanded={item.expanded} />
					{:else if item.type === 'pr'}
						<GitHubPullRequestGraph
							title="Refresh sessions before they expire"
							number={PR}
							state={prState}
							lanes={SAMPLE_PR_GRAPH_LANES}
							{commits}
							head="session"
							{mergeState}
							{footer}
						/>
					{/if}
				</div>
			{/each}
		</div>

		<div class="space-y-2 px-3 pb-3 sm:px-4">
			{#if showChecks}
				<div in:rise={{ y: 8, duration: 240 }}>
					<GitHubChecksWaterfall
						prNumber={PR}
						commit={suiteCommit}
						{checks}
						now={simT < suiteEnd ? simT : undefined}
						{phase}
						bind:expanded={checksOpen}
						onFix={() => press('fix')}
						onMerge={() => press('merge')}
						class="max-h-80 overflow-y-auto"
					/>
				</div>
			{:else}
				<GitHubPrActionBar diff={SAMPLE_PR_DIFF} status={action} prNumber={PR} onCreate={() => press('create')} />
			{/if}

			<form onsubmit={send} class="rounded-[20px] border border-chat-border bg-card-bg px-3 pt-3 pb-2 ak-shadow-soft-sm">
				<label class="sr-only" for="pr-flow-prompt">Message</label>
				<input
					id="pr-flow-prompt"
					bind:value={draft}
					placeholder="Ask for follow-up changes"
					autocomplete="off"
					class="w-full bg-transparent px-1 text-[15px] text-fg-main outline-none placeholder:text-fg-light"
				/>
				<div class="mt-2.5 flex items-center gap-1.5 text-[13px] text-fg-light">
					<span class={pillClass('ghost', 'sm', 'pointer-events-none')}><FolderGit2 aria-hidden="true" />acme-webapp</span>
					<span class={pillClass('ghost', 'sm', 'pointer-events-none')}><Laptop aria-hidden="true" />Local</span>
					<span class="ml-auto inline-flex items-center gap-1 px-2">Medium <ChevronDown class="size-3.5" aria-hidden="true" /></span>
					<button
						type="submit"
						aria-label="Send"
						disabled={!draft.trim()}
						class={cn('inline-flex size-8 items-center justify-center rounded-full bg-fg-main text-canvas-bg transition-opacity disabled:opacity-30')}
					>
						<ArrowUp class="size-4" aria-hidden="true" />
					</button>
				</div>
			</form>
		</div>
	</div>
</div>
