<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { pillClass } from '../ui/styles';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fly } from 'svelte/transition';
	import { Check, FileCode, MessageCircle, RotateCcw, Sparkle, SquareTerminal } from '@lucide/svelte';
	import AgentActivity from '../agents/AgentActivity.svelte';
	import ApprovalCard from '../agents/ApprovalCard.svelte';
	import CodeBlock from '../agents/CodeBlock.svelte';
	import FileDiff from '../agents/FileDiff.svelte';
	import Message from '../agents/Message.svelte';
	import MessageScroller from '../agents/MessageScroller.svelte';
	import PromptInput from '../agents/PromptInput.svelte';
	import StreamingResponse from '../agents/StreamingResponse.svelte';
	import ThinkingShimmer from '../agents/ThinkingShimmer.svelte';
	import TodoList from '../agents/TodoList.svelte';
	import ToolApproval from '../agents/ToolApproval.svelte';
	import ToolResult from '../agents/ToolResult.svelte';
	import AgentCheckpoint from '../runtime/AgentCheckpoint.svelte';
	import AgentContextMeter from '../runtime/AgentContextMeter.svelte';
	import FileTree, { type WorktreeFileNode } from '../runtime/FileTree.svelte';
	import Terminal from '../runtime/Terminal.svelte';
	import TestResults, { type SuiteGroup } from '../runtime/TestResults.svelte';
	import type {
		ActivityItem,
		ApprovalCardAnswers,
		ApprovalQuestion,
		CheckpointEntry,
		CitationItem,
		PromptAttachment,
		PromptContextOption,
		ContextSourceItem,
		SupportedAgentId,
		SupportedAgentOption,
		TodoItem,
		ToolApprovalParam,
		ToolApprovalStatus
	} from '../types';

	interface ConversationEntry {
		id: string;
		role: 'user' | 'assistant';
		author: string;
		badge?: string;
		timestamp: string;
		text: string;
		activityItems?: ActivityItem[];
	}

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'initialDark' | 'embedded'> {
		initialDark?: boolean;
		embedded?: boolean;
		class?: string;
	}

	let { initialDark = false, embedded = false, class: className = '', ...rest }: Props = $props();

	const SUPPORTED_AGENTS: SupportedAgentOption[] = [
		{ id: 'claude-code', label: 'AK-S Agent', version: 'v0.3.0', signedIn: true },
		{ id: 'codex', label: 'Codex CLI', version: 'v0.29.0', signedIn: true },
		{ id: 'gemini', label: 'Gemini CLI', version: 'v2.4.1', signedIn: false }
	];

	const CONTEXT_SOURCES: ContextSourceItem[] = [
		{ id: 'sys', label: 'System & Trailside Brief (T2 guardrails)', tokens: 11_200, category: 'system' },
		{ id: 'wt', label: 'Worktree diff & AST symbols (4 files)', tokens: 18_400, category: 'worktree' },
		{ id: 'conv', label: 'Attempt #2 conversation log', tokens: 12_900, category: 'conversation' },
		{ id: 'tools', label: 'MCP & Companion tool schemas', tokens: 5_700, category: 'tools' }
	];

	const INITIAL_ACTIVITY: ActivityItem[] = [
		{
			id: 'act-1',
			type: 'text',
			label: 'Traced GitHub OAuth callback redirect flow and inspected returnTo sanitization.'
		},
		{
			id: 'act-2',
			type: 'tool',
			label: 'Read',
			target: 'apps/web/src/routes/auth/callback/+server.ts',
			meta: 'lines 1-64',
			status: 'complete'
		},
		{
			id: 'act-3',
			type: 'search',
			label: 'Searched',
			target: 'sanitizeReturnTo in apps/web/src/lib/server/auth',
			meta: '3 matches',
			status: 'complete'
		},
		{
			id: 'act-4',
			type: 'tool',
			label: 'Edit',
			target: 'apps/web/src/routes/auth/callback/+server.ts',
			additions: 3,
			deletions: 1,
			status: 'complete'
		}
	];

	const CALLBACK_DIFF_PATCH = [
		'@@ -18,4 +18,6 @@ export async function verifyCallback(url: URL) {',
		'   const code = url.searchParams.get("code");',
		'-  return redirect(302, "/login");',
		'+  const next = sanitizeReturnTo(url.searchParams.get("next"));',
		'+  if (!code) return redirect(303, "/login?error=missing_code");',
		'+  return redirect(303, next);',
		' }'
	].join('\n');

	const TEST_DIFF_PATCH = [
		'@@ -41,2 +41,8 @@ test("preserves deep link query across GitHub OAuth callback", async () => {',
		'   const res = await verifyCallback(new URL("https://trailside.io/auth/callback?code=ok&next=%2Fw%2Fboard%3Ffilter%3Dready"));',
		'+  expect(res.status).toBe(303);',
		'+  expect(res.headers.get("location")).toBe("/w/board?filter=ready");',
		' });'
	].join('\n');

	const TOOL_APPROVAL_PARAMS: ToolApprovalParam[] = [
		{
			label: 'Command',
			value: 'corepack pnpm --filter @trailside/web test tests/auth-callback.test.ts',
			code: true
		},
		{ label: 'Computer', value: 'studio-mac (Connected · local worktree)' },
		{ label: 'Worktree', value: 'trailside/1210-auth-redirect', code: true },
		{ label: 'Risk tier', value: 'T2 · Scoped read/test in disposable worktree' }
	];

	const APPROVAL_QUESTIONS: ApprovalQuestion[] = [
		{
			id: 'redirect-policy',
			question: 'Where should unauthenticated deep links redirect after GitHub sign-in?',
			options: [
				{
					id: 'opt-preserve',
					label: 'Preserve original path and query string',
					description: 'Sanitizes relative /w/* paths and keeps filter/card query parameters intact.'
				},
				{
					id: 'opt-board',
					label: 'Redirect to workspace Board root (/w)',
					description: 'Drops deep-link query parameters and always lands on the default Board.'
				},
				{
					id: 'opt-prompt',
					label: 'Show a confirmation interstitial before redirecting',
					description: 'Displays the target workspace route before completing navigation.'
				}
			],
			allowCustom: true,
			customPlaceholder: 'Or specify a custom redirect rule…'
		}
	];

	const CITATION_SOURCES: CitationItem[] = [
		{
			id: 'cit-1',
			title: 'M1 Hosted Foundation Design — §4.2 GitHub OAuth Callback & Session Cookie',
			domain: 'docs/superpowers/specs',
			url: '#spec-m1-oauth'
		},
		{
			id: 'cit-2',
			title: 'apps/web/src/routes/auth/callback/+server.ts',
			domain: 'worktree:trailside/1210',
			url: '#file-callback-server'
		}
	];

	const CHECKPOINT_ENTRY: CheckpointEntry = {
		id: 'cp-8f4a21c',
		title: 'Checkpoint',
		commitSha: '8f4a21c',
		description: 'Before callback redirect patch',
		worktreeBranch: 'trailside/1210-auth-redirect',
		timestamp: '2m ago',
		filesChanged: 2,
		restorable: true
	};

	const WORKTREE_FILES: WorktreeFileNode[] = [
		{
			path: 'apps/web/src/routes/auth/callback',
			name: 'apps/web/src/routes/auth/callback',
			kind: 'folder',
			children: [
				{
					path: 'apps/web/src/routes/auth/callback/+server.ts',
					name: '+server.ts',
					kind: 'file',
					additions: 3,
					deletions: 1
				}
			]
		},
		{
			path: 'tests',
			name: 'tests',
			kind: 'folder',
			children: [
				{
					path: 'tests/auth-callback.test.ts',
					name: 'auth-callback.test.ts',
					kind: 'file',
					additions: 6,
					deletions: 0
				}
			]
		}
	];

	const TEST_SUITES: SuiteGroup[] = [
		{
			id: 'suite-auth',
			name: 'tests/auth-callback.test.ts',
			status: 'passed',
			tests: [
				{
					id: 't-1',
					name: 'preserves deep link query across GitHub OAuth callback',
					status: 'passed',
					durationMs: 38
				},
				{
					id: 't-2',
					name: 'rejects external protocol-relative returnTo URLs',
					status: 'passed',
					durationMs: 19
				},
				{
					id: 't-3',
					name: 'redirects missing OAuth code to /login?error=missing_code',
					status: 'passed',
					durationMs: 24
				}
			]
		},
		{
			id: 'suite-boundaries',
			name: 'scripts/check-boundaries.ts',
			status: 'passed',
			tests: [
				{
					id: 't-4',
					name: 'verifies T2 path confinement and zero cross-service imports',
					status: 'passed',
					durationMs: 112
				}
			]
		}
	];

	let isDark = $state(false);
	let activeTab = $state<'chat' | 'changes' | 'checks'>('chat');
	let selectedAgentId = $state<SupportedAgentId>('claude-code');
	let selectedFile = $state('apps/web/src/routes/auth/callback/+server.ts');
	let approvalStatus = $state<ToolApprovalStatus>('pending');
	let decisionSummary = $state<string | null>(null);
	let promptText = $state('');
	const WORKTREE_CHIP: PromptAttachment = { id: 'worktree:trailside/1210-auth-redirect', label: 'trailside/1210-auth-redirect', kind: 'worktree' };
	let attachments = $state<PromptAttachment[]>([WORKTREE_CHIP]);
	const CONTEXT_OPTIONS: PromptContextOption[] = [
		{ label: 'Attach callback/+server.ts', attachment: { id: 'file:callback', label: 'apps/web/src/routes/auth/callback/+server.ts', kind: 'file' } },
		{ label: 'Pin skill: Backend v2', attachment: { id: 'skill:backend-v2', label: 'Backend v2', kind: 'skill' } },
		{ label: 'Include boundary gate check', attachment: { id: 'gate:check-boundaries', label: 'check-boundaries', kind: 'gate' } }
	];
	let isAgentWorking = $state(false);
	let usedTokens = $state(48_200);
	let root: HTMLElement | undefined = $state();

	const TERMINAL_LINES = [
		'$ corepack pnpm --filter @trailside/web test tests/auth-callback.test.ts',
		'✔ preserves deep link query across GitHub OAuth callback (38ms)',
		'✔ rejects external protocol-relative returnTo URLs (19ms)',
		'✔ redirects missing OAuth code to /login?error=missing_code (24ms)',
		'ℹ pass 3 · fail 0 · duration 193ms'
	];
	let terminalOutput = $state(TERMINAL_LINES.join('\n'));

	const ANSWER =
		'The loop came from verifyCallback, which always redirected to /login instead of reading the sanitized next parameter. I now keep the relative return path and query string, and send a missing code to /login with an error. All three redirect tests pass.';

	const INITIAL_TODOS: TodoItem[] = [
		{ id: 'todo-1', label: 'Trace the OAuth callback and session redirect', status: 'completed' },
		{ id: 'todo-2', label: 'Patch the return path handling in the callback', status: 'completed' },
		{ id: 'todo-3', label: 'Run the redirect tests', detail: 'Needs your approval', status: 'in-progress' },
		{ id: 'todo-4', label: 'Confirm the fallback policy with you', status: 'pending' }
	];
	let todoItems = $state<TodoItem[]>(INITIAL_TODOS);

	/*
	 * Scripted demo timeline. The agent works on its own, then pauses at the two
	 * moments that need a person: approving the test run and choosing a policy.
	 * 1 thinking · 2 activity · 3 plan · 4 diff · 5 approval gate · 6 test output
	 * 7 answer · 8 decision gate · 9 wrapped up
	 */
	let step = $state(0);
	let activityShown = $state(0);
	let termShown = $state(0);
	let answerShown = $state(0);
	let runToken = 0;

	let extraMessages = $state<ConversationEntry[]>([]);

	$effect(() => {
		isDark = initialDark;
	});

	$effect(() => {
		if (initialDark && typeof document !== 'undefined') {
			document.documentElement.classList.toggle('dark', isDark);
			document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
		}
	});

	let activeAgent = $derived(
		SUPPORTED_AGENTS.find((item) => item.id === selectedAgentId) ?? SUPPORTED_AGENTS[0]
	);

	let activityItems = $derived<ActivityItem[]>(
		INITIAL_ACTIVITY.slice(0, Math.max(1, activityShown)).map((item, i) =>
			item.type === 'text'
				? item
				: ({ ...item, status: i < activityShown - 1 || step > 2 ? 'complete' : 'running' } as ActivityItem)
		)
	);

	let answerText = $derived(ANSWER.split(' ').slice(0, answerShown).join(' '));
	let answerDone = $derived(answerShown >= ANSWER.split(' ').length);

	let yourTurn = $derived(
		step === 5 && approvalStatus === 'pending'
			? 'Your turn: approve the test run'
			: step === 8 && !decisionSummary
				? 'Your turn: pick a redirect policy'
				: ''
	);

	/** Waits `ms`, resolving false if the demo was restarted meanwhile. */
	function sleep(ms: number, token: number): Promise<boolean> {
		const fast = prefersReducedMotion.current;
		return new Promise((resolve) => window.setTimeout(() => resolve(token === runToken), fast ? 0 : ms));
	}

	/** Plays the agent's turn up to the tool approval gate. */
	async function playIntro(): Promise<void> {
		const token = ++runToken;
		step = 1;
		if (!(await sleep(1100, token))) return;
		step = 2;
		for (let i = 1; i <= INITIAL_ACTIVITY.length; i++) {
			activityShown = i;
			if (!(await sleep(600, token))) return;
		}
		step = 3;
		if (!(await sleep(700, token))) return;
		step = 4;
		if (!(await sleep(900, token))) return;
		step = 5;
	}

	/** Continues after approval: streams the test output, then the answer, then asks for a decision. */
	async function playAfterApproval(): Promise<void> {
		const token = ++runToken;
		step = 6;
		for (let i = 1; i <= TERMINAL_LINES.length; i++) {
			termShown = i;
			if (!(await sleep(320, token))) return;
		}
		step = 7;
		const words = ANSWER.split(' ').length;
		while (answerShown < words) {
			answerShown = Math.min(words, answerShown + 2);
			if (!(await sleep(45, token))) return;
		}
		if (!(await sleep(400, token))) return;
		step = 8;
	}

	/** Resets the session and plays it again from the first prompt. */
	function restartDemo(): void {
		runToken += 1;
		step = 0;
		activityShown = 0;
		termShown = 0;
		answerShown = 0;
		approvalStatus = 'pending';
		decisionSummary = null;
		todoItems = INITIAL_TODOS;
		extraMessages = [];
		attachments = [WORKTREE_CHIP];
		usedTokens = 48_200;
		activeTab = 'chat';
		void playIntro();
	}

	// Start playing once the workbench scrolls into view.
	$effect(() => {
		if (!root) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && step === 0) void playIntro();
			},
			{ threshold: 0.15 }
		);
		observer.observe(root);
		return () => {
			observer.disconnect();
			runToken += 1;
		};
	});

	/**
	 * Marks the pending tool approval as approved and continues the demo.
	 */
	function handleToolApprove(): void {
		approvalStatus = 'approved';
		todoItems = todoItems.map((item) =>
			item.id === 'todo-3'
				? { ...item, status: 'completed', detail: '3 of 3 tests passed' }
				: item.id === 'todo-4'
					? { ...item, status: 'in-progress' }
					: item
		);
		usedTokens += 3_100;
		void playAfterApproval();
	}

	/**
	 * Records the user's answer to the ApprovalCard question and wraps up the run.
	 *
	 * @param answers - Map of question IDs to selected option labels.
	 */
	function handleDecisionSubmit(answers: ApprovalCardAnswers): void {
		decisionSummary = Object.values(answers).flat().join(' · ');
		todoItems = todoItems.map((item) => ({ ...item, status: 'completed', detail: undefined }));
		step = 9;
	}

	/**
	 * Appends a follow-up prompt and a short simulated agent reply.
	 *
	 * @param submittedPrompt - Non-empty prompt text from `PromptInput`.
	 */
	function handlePromptSubmit(submittedPrompt: string): void {
		const stamp = Date.now();
		extraMessages = [
			...extraMessages,
			{ id: `msg-user-${stamp}`, role: 'user', author: 'You', timestamp: 'Just now', text: submittedPrompt }
		];
		isAgentWorking = true;
		window.setTimeout(() => {
			isAgentWorking = false;
			extraMessages = [
				...extraMessages,
				{
					id: `msg-agent-${stamp}`,
					role: 'assistant',
					author: activeAgent.label,
					timestamp: 'Just now',
					text: `Done. I ran that in trailside/1210-auth-redirect and everything passed.`,
					activityItems: [
						{
							id: `act-dyn-${stamp}`,
							type: 'tool',
							label: 'Bash',
							target: 'corepack pnpm test:affected',
							meta: '4 passed (1.42s)',
							status: 'complete'
						}
					]
				}
			];
			usedTokens = Math.min(200_000, usedTokens + 2_400);
		}, prefersReducedMotion.current ? 0 : 1400);
	}
</script>

<div {...rest}
	bind:this={root}
	class={cn(`flex ${embedded ? 'h-[760px]' : 'h-[calc(100dvh-5.375rem)] min-h-[520px] lg:h-[calc(100dvh-4.0625rem)]'} flex-col overflow-hidden bg-chat-surface text-fg-main`, className)}
>
	<!-- Top bar -->
	<header class="border-b border-chat-border/70 bg-chat-surface px-4 pt-3 sm:px-6">
		<div class="flex items-start justify-between gap-3">
			<div class="flex min-w-0 items-center gap-3">
				<span
					class="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-chat-accent-subtle text-chat-accent"
				>
					<Sparkle aria-hidden="true" class="size-4 fill-current" />
				</span>
				<div class="min-w-0">
					<h1 class="truncate text-[15px] font-semibold text-fg-main">
						Fix OAuth callback redirect loop on deep links
					</h1>
					<p class="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-xs text-fg-light">
						<span aria-hidden="true" class="size-1.5 shrink-0 rounded-full bg-status-success"></span>
						<span class="truncate"
							><span class="text-fg-main">studio-mac</span> · trailside/1210-auth-redirect · Attempt 2</span
						>
					</p>
				</div>
			</div>

			<div class="flex shrink-0 items-center gap-1.5">
				<div class="hidden sm:block">
					<AgentContextMeter {usedTokens} maxTokens={200_000} sources={CONTEXT_SOURCES} />
				</div>
				<button
					type="button"
					onclick={restartDemo}
					aria-label="Restart demo"
					title="Restart demo"
					class={pillClass('ghost', 'sm')}
				>
					<RotateCcw aria-hidden="true" />
					<span class="hidden sm:inline">Restart</span>
				</button>
			</div>
		</div>

		<div
			role="tablist"
			aria-label="Workbench views"
			class="-mb-px mt-2.5 flex gap-1 overflow-x-auto [scrollbar-width:none]"
		>
			{#each [{ id: 'chat', label: 'Chat', icon: MessageCircle }, { id: 'changes', label: 'Changes', count: 2, icon: FileCode }, { id: 'checks', label: 'Checks', icon: SquareTerminal }] as tab (tab.id)}
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === tab.id}
					onclick={() => (activeTab = tab.id as typeof activeTab)}
					class="inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 pt-1 pb-2 text-[13px] font-medium transition-colors [&_svg]:size-3.5 {activeTab ===
					tab.id
						? 'border-chat-accent text-fg-main'
						: 'border-transparent text-fg-light hover:text-fg-main'}"
				>
					<tab.icon aria-hidden="true" />
					{tab.label}
					{#if tab.count}
						<span class="rounded-full bg-chat-user px-1.5 text-[11px] tabular-nums text-fg-light">{tab.count}</span>
					{/if}
				</button>
			{/each}
		</div>
	</header>

	<div class="flex min-h-0 flex-1 overflow-hidden">
		<!-- Sidebar -->
		<aside
			aria-label="Runs and worktree files"
			class="hidden min-h-0 w-60 shrink-0 flex-col gap-5 overflow-y-auto border-r border-chat-border/70 bg-chat-user/30 p-3.5 lg:flex"
		>
			<div>
				<h2 class="px-1 text-[11px] font-medium text-fg-light">Runs</h2>
				<ul class="mt-1.5 space-y-0.5 text-[13px]">
					<li
						class="flex items-center justify-between gap-2 rounded-xl bg-card-bg px-3 py-2 font-medium text-fg-main ak-shadow-soft-sm"
					>
						<span class="truncate">OAuth redirect loop</span>
						<span aria-hidden="true" class="ak-breathe size-1.5 shrink-0 rounded-full bg-status-success"></span>
					</li>
					<li class="flex items-center justify-between gap-2 px-3 py-1.5 text-fg-light">
						<span class="truncate">Pairing token expiry</span>
						<span class="text-[11px]">Merged</span>
					</li>
					<li class="flex items-center justify-between gap-2 px-3 py-1.5 text-fg-light">
						<span class="truncate">Board column focus</span>
						<span class="text-[11px]">Passed</span>
					</li>
				</ul>
			</div>

			{#if step >= 4}
				<div in:fly={{ y: 4, duration: 180 }}>
					<h2 class="px-1 text-[11px] font-medium text-fg-light">Changed files</h2>
					<FileTree
						nodes={WORKTREE_FILES}
						selectedPath={selectedFile}
						onSelect={(path) => {
							selectedFile = path;
							activeTab = 'changes';
						}}
						class="mt-1.5"
					/>
				</div>
			{/if}
		</aside>

		<main class="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-chat-surface">
			{#if activeTab === 'chat'}
				<MessageScroller navigation="none" followOutput streaming={step > 0 && step < 9} contentClass="pb-10">
					<Message id="msg-user-1" role="user" author="You" timestamp="20:54">
						<p>
							Deep links lose their place after GitHub sign-in and bounce back to /login. Can you find
							out why and fix it?
						</p>
					</Message>

					{#if step === 1}
						<div in:fly={{ y: 4, duration: 180 }}>
							<ThinkingShimmer spark label="Thinking" />
						</div>
					{:else if step >= 2}
						<Message id="msg-agent-1" role="assistant" author={activeAgent.label} timestamp="20:55">
							<AgentActivity
								items={activityItems}
								status={step === 2 ? 'working' : 'complete'}
								durationSeconds={6}
								defaultOpen={step <= 3}
							/>

							{#if step >= 3}
								<div in:fly={{ y: 6, duration: 200 }}>
									<TodoList title="Plan" items={todoItems} defaultOpen={true} />
								</div>
							{/if}

							{#if step >= 4}
								<div in:fly={{ y: 6, duration: 200 }} class="space-y-3">
									<FileDiff
										filename="apps/web/src/routes/auth/callback/+server.ts"
										patch={CALLBACK_DIFF_PATCH}
									/>
									<AgentCheckpoint checkpoint={CHECKPOINT_ENTRY} />
								</div>
							{/if}

							{#if step >= 5}
								<div in:fly={{ y: 6, duration: 200 }}>
									<ToolApproval
										tool="Bash"
										summary="corepack pnpm --filter @trailside/web test tests/auth-callback.test.ts"
										params={TOOL_APPROVAL_PARAMS}
										status={approvalStatus}
										onApprove={handleToolApprove}
										onAlwaysApprove={handleToolApprove}
										onDeny={() => (approvalStatus = 'denied')}
									/>
								</div>
							{/if}

							{#if step >= 6}
								<div in:fly={{ y: 6, duration: 200 }}>
									<ToolResult
										tool="Bash"
										summary="tests/auth-callback.test.ts"
										output={TERMINAL_LINES.slice(0, termShown).join('\n')}
										status={step === 6 ? 'running' : 'success'}
										meta="193ms"
										defaultOpen={true}
									/>
								</div>
							{/if}

							{#if step >= 7}
								<StreamingResponse
									status={answerDone ? 'complete' : 'streaming'}
									copyText={ANSWER}
									sources={answerDone ? CITATION_SOURCES : []}
									showActions={answerDone}
								>
									<p>{answerText}</p>
								</StreamingResponse>
							{/if}

							{#if step >= 8}
								<div in:fly={{ y: 6, duration: 200 }}>
									<ApprovalCard
										title="One decision before I open the PR"
										description="The callback now keeps safe relative paths. How should it treat deep links?"
										questions={APPROVAL_QUESTIONS}
										onSubmit={handleDecisionSubmit}
									/>
								</div>
							{/if}
						</Message>
					{/if}

					{#if step >= 9 && decisionSummary}
						<div in:fly={{ y: 6, duration: 200 }}>
							<Message id="msg-agent-2" role="assistant" author={activeAgent.label} timestamp="20:58">
								<p>
									<Check aria-hidden="true" class="mr-1 inline size-4 text-status-success" />
									Applied “{decisionSummary}”. The branch is ready for review whenever you are.
								</p>
							</Message>
						</div>
					{/if}

					{#each extraMessages as msg (msg.id)}
						<div in:fly={{ y: 6, duration: 200 }}>
							<Message id={msg.id} role={msg.role} author={msg.author} timestamp={msg.timestamp}>
								{#if msg.activityItems}
									<AgentActivity items={msg.activityItems} status="complete" />
								{/if}
								<p>{msg.text}</p>
							</Message>
						</div>
					{/each}

					{#if isAgentWorking}
						<ThinkingShimmer spark label="Working" />
					{/if}
				</MessageScroller>

				<!-- Composer -->
				<div class="relative px-4 pt-1 pb-4 sm:px-8">
					<div
						aria-hidden="true"
						class="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-chat-surface to-transparent"
					></div>
					{#if yourTurn}
						<p
							in:fly={{ y: 4, duration: 180 }}
							class="mx-auto mb-2 flex w-fit items-center gap-2 rounded-full bg-chat-accent-subtle px-3 py-1 text-xs font-medium text-chat-accent"
							aria-live="polite"
						>
							<span aria-hidden="true" class="ak-breathe size-1.5 rounded-full bg-current"></span>
							{yourTurn}
						</p>
					{/if}
					<PromptInput
						class="mx-auto max-w-3xl"
						bind:value={promptText}
						bind:attachments
						contextOptions={CONTEXT_OPTIONS}
						activeSkill="Backend v2"
						busy={isAgentWorking}
						agents={SUPPORTED_AGENTS}
						{selectedAgentId}
						onAgentChange={(id) => (selectedAgentId = id)}
						onSubmit={handlePromptSubmit}
						onStop={() => (isAgentWorking = false)}
					/>
				</div>
			{:else if activeTab === 'changes'}
				<div class="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
					<div class="mx-auto max-w-3xl space-y-4">
						<div class="lg:hidden">
							<FileTree
								nodes={WORKTREE_FILES}
								selectedPath={selectedFile}
								onSelect={(path) => (selectedFile = path)}
							/>
						</div>
						<FileDiff
							filename={selectedFile}
							patch={selectedFile.includes('test') ? TEST_DIFF_PATCH : CALLBACK_DIFF_PATCH}
						/>
						<CodeBlock
							filename="apps/web/src/routes/auth/callback/+server.ts"
							language="typescript"
							highlightLines={[4, 5, 6]}
							code={[
								'import { redirect } from "@sveltejs/kit";',
								'import { sanitizeReturnTo } from "$lib/server/auth/return-to";',
								'',
								'export async function verifyCallback(url: URL) {',
								'  const code = url.searchParams.get("code");',
								'  const next = sanitizeReturnTo(url.searchParams.get("next"));',
								'  if (!code) return redirect(303, "/login?error=missing_code");',
								'  return redirect(303, next);',
								'}'
							].join('\n')}
						/>
					</div>
				</div>
			{:else}
				<div class="flex-1 overflow-y-auto p-4 sm:p-6">
					<div class="mx-auto max-w-3xl space-y-4">
						<TestResults suites={TEST_SUITES} durationMs={193} />
						<Terminal title="studio-mac · zsh (worktree: trailside/1210-auth-redirect)" output={terminalOutput} onClear={() => (terminalOutput = '$ # Terminal cleared')} />
					</div>
				</div>
			{/if}
		</main>
	</div>
</div>
