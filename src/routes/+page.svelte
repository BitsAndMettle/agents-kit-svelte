<script lang="ts">
	import { SAMPLE_ARTIFACT_METADATA, SAMPLE_BLOCKED_ITEMS, SAMPLE_ARTIFACT_VERSIONS, SAMPLE_COMM_LOG, SAMPLE_EVAL_ITERATIONS, SAMPLE_FORM_FIELDS, SAMPLE_OPS_INCIDENTS, SAMPLE_OPS_METRICS, SAMPLE_OPS_SIGNALS, SAMPLE_PARALLEL_LANES, SAMPLE_ROUTES, SAMPLE_ROUTE_CLASSIFICATION, SAMPLE_ROUTING_HISTORY, SAMPLE_SUB_AGENTS, SAMPLE_TASKS, SAMPLE_TOOLS, SAMPLE_WORKFLOW_STEPS } from '$lib/fixtures/workflows';
	import { SAMPLE_CONTEXT_CHUNKS, SAMPLE_DIFF_ROWS, SAMPLE_FILTER_ROWS, SAMPLE_FINE_TUNE_FIELDS, SAMPLE_FLOWCHART_NODES, SAMPLE_INSIGHTS, SAMPLE_RECOMMENDATION_ALTERNATIVES, SAMPLE_RECOMMENDATION_REASONING, SAMPLE_RECORDS, SAMPLE_SEARCH_ITEMS, SAMPLE_SELECTION_ACTIONS, SAMPLE_TOOL_DIFFS, SAMPLE_TOOL_STEPS } from '$lib/fixtures/data';
	import { SAMPLE_CHAIN_OF_THOUGHT, SAMPLE_ENV_VARIABLES, SAMPLE_PACKAGE_DEPENDENCIES, SAMPLE_PACKAGE_SCRIPTS, SAMPLE_PLAN_MILESTONES, SAMPLE_PREVIEW_LOGS, SAMPLE_PROMPT_SUGGESTIONS, SAMPLE_SCHEMA_PARAMETERS, SAMPLE_SCHEMA_REQUEST_BODY, SAMPLE_SCHEMA_RESPONSE_BODY, SAMPLE_SIDEBAR_RESOURCES, SAMPLE_STACK_SNIPPET, SAMPLE_STACK_TRACE, SAMPLE_VOICE_DEVICES, SAMPLE_VOICE_PERSONAS, SAMPLE_WORK_STEPS } from '$lib/fixtures/chat';
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
		SAMPLE_TRIAGE_ISSUE,
		SAMPLE_CHECK_RUNS,
		SAMPLE_PR_DIFF,
		SAMPLE_PR_GRAPH_COMMITS,
		SAMPLE_PR_GRAPH_LANES
	} from '$lib/fixtures/github';
	import HeroDemo from './HeroDemo.svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { SEGMENT_GROUP_CLASS, badgeClass, buttonClass, segmentClass } from '$lib/ui/styles';
	import {
		ArrowRight,
		ArrowUpRight,
		Check,
		ChevronDown,
		Code,
		Copy,
		Eye,
		FileCode,
		GitMerge,
		GitPullRequest,
		LayoutTemplate,
		BookOpenText,
		ChartGantt,
		Network,
		MessagesSquare,
		RotateCcw,
		Scale,
		Search,
		Sparkle
	} from '@lucide/svelte';
	import { base } from '$app/paths';
	import {
		AISidebar,
		AgentActivity,
		AgentArtifact,
		AgentCheckpoint,
		AgentContextMeter,
		AgentDisclosure,
		AgentEvaluator,
		AgentFormGenerator,
		AgentGenerativeSurface,
		AgentOpsMonitor,
		AgentOrchestrator,
		AgentParallelProcessor,
		AgentProgress,
		AgentRoutingHub,
		AgentSequentialWorkflow,
		AgentTaskQueue,
		AgentThinkingIndicator,
		AgentToolPalette,
		ApprovalCard,
		BorderBeam,
		ChainOfThought,
		Citations,
		CodeBlock,
		ContextCards,
		DiffTable,
		EnvironmentVariables,
		FileDiff,
		FileTree,
		FilterTable,
		FineTuneCard,
		Flowchart,
		GitHubBentoLayout,
		GitHubLifecycleTimeline,
		GitHubIssueTriage,
		GitHubBranchCard,
		GitHubPullRequestReview,
		GitHubMergeQueue,
		GitHubDeploymentPipeline,
		GitHubReleaseCard,
		GitHubIncidentCard,
		GitHubChecksPanel,
		GitHubCommitCard,
		GitHubIssueCard,
		GitHubKanbanBoard,
		GitHubPullRequestCard,
		GitHubReviewThreadCard,
		ImageGeneration,
		InsightCards,
		IntelligentUIRenderer,
		Message,
		MessageBubble,
		MessageScroller,
		PackageInfo,
		PlanCard,
		PromptInput,
		PromptSuggestions,
		ReasoningText,
		RecommendationCard,
		RecordsTable,
		ResultActions,
		SchemaDisplay,
		SearchList,
		SelectionActions,
		SkillCard,
		SkillEditor,
		SkillInvocation,
		SkillLibrary,
		SkillProposalCard,
		SkillRouter,
		StackTrace,
		StreamingResponse,
		Svelte5MotionLab,
		GenerativeChart,
		AgentHandoffGantt,
		ModelPhaseStream,
		AgentWorkTrace,
		GitHubChecksWaterfall,
		GitHubPrActionBar,
		GitHubPullRequestGraph,
		FeatureCard,
		FeatureProposalCard,
		BlockedWorkList,
		FeatureLineage,
		FeatureTimeline,
		RunReplayScrubber,
		TokenBurnChart,
		Terminal,
		TestResults,
		ThinkingShimmer,
		TodoList,
		ToolApproval,
		ToolChips,
		ToolResult,
		ChatWorkbench,
		VoiceWaveVisualizer,
		WebPreview
	} from '$lib';
	import { SAMPLE_SKILLS, SAMPLE_SKILL_MANIFEST, SAMPLE_SKILL_PROPOSAL, SAMPLE_SKILL_STEPS } from '$lib/entries/fixtures';
	import { SAMPLE_BURN_POINTS, SAMPLE_CHART_SPECS, SAMPLE_FEATURE, SAMPLE_PROPOSAL, SAMPLE_FEATURE_START, SAMPLE_HANDOFFS, SAMPLE_RUN_DURATION, SAMPLE_RUN_MARKS, SAMPLE_TIMELINE_ITEMS, SAMPLE_TIMELINE_MILESTONES, SAMPLE_TIMELINE_TODAY, SAMPLE_TOKEN_BUDGET, SAMPLE_LINEAGE_EDGES, SAMPLE_LINEAGE_NODES, SAMPLE_HANDOFF_LANES, SAMPLE_HANDOFF_SPANS, SAMPLE_MODEL_EVENTS, SAMPLE_MODEL_SERIES, SAMPLE_PHASE_BANDS } from '$lib/fixtures/charts';
	import { CATALOG_ITEMS, type CatalogCategory } from '$site/catalog-registry';
	import { holdHeight } from '$site/hold-height';
	import { SvelteSet } from 'svelte/reactivity';
	import type {
		ActivityItem,
		ApprovalQuestion,
		CheckpointEntry,
		CitationItem,
		DynamicUINode,
		GeneratedSurfaceContent,
		GitHubCheckItem,
		GitHubCommitData,
		GitHubIssueData,
		GitHubPullRequestData,
		GitHubReviewThreadData,
		ResultActionState,
		SkillInvocationStep,
		SupportedAgentId,
		SupportedAgentOption,
		ContextSourceItem,
		TodoItem,
		ToolApprovalParam
	} from '$lib';

	const CATEGORIES: ('All' | CatalogCategory)[] = [
		'All',
		'beUI Agents',
		'Beautiful UI',
		'GitHub Cards & Layouts',
		'Intelligent UI & Generative',
		'Agents UI Orchestration',
		'AI Elements & Coding',
		'Agentic Skills',
		'Charts & Timelines',
		'Voice & Effects'
	];

	type CardTabMode = 'preview' | 'usage' | 'source';

	interface Props {
		data?: {
			componentSources?: Record<string, string>;
		};
	}

	let { data = {} }: Props = $props();

	let blockedItems = $state(SAMPLE_BLOCKED_ITEMS);
	let blockedBusy = $state<string[]>([]);
	let proposalStatus = $state<'proposed' | 'approving' | 'approved' | 'declined'>('proposed');
	function runBlockedAction(item: { id: string }): void {
		blockedBusy = [...blockedBusy, item.id];
		setTimeout(() => {
			blockedBusy = blockedBusy.filter((id) => id !== item.id);
			blockedItems = blockedItems.filter((i) => i.id !== item.id);
		}, 1200);
	}
	function approveProposal(): void {
		proposalStatus = 'approving';
		setTimeout(() => (proposalStatus = 'approved'), 1000);
	}
	let selectedCategory = $state<'All' | CatalogCategory>('All');
	let searchQuery = $state('');
	let cardTabs = $state<Record<string, CardTabMode>>({});
	let copiedSlug = $state<string | null>(null);
	let selectedRecordIds = $state<string[]>(['rec-1', 'rec-2']);
	let disclosureDemoOpen = $state(true);
	let resultActionMode = $state<ResultActionState>('view');
	let resultSaved = $state(false);
	let ready = $state(false);

	interface ScrollerTurn {
		id: string;
		from: 'user' | 'assistant';
		author: string;
		timestamp: string;
		content: string;
		streaming?: boolean;
	}

	let scrollerTurns = $state<ScrollerTurn[]>([
		{
			id: 'scope-question',
			from: 'user',
			author: 'You',
			timestamp: '20:41',
			content: 'What should the first field study include?'
		},
		{
			id: 'scope-answer',
			from: 'assistant',
			author: 'AK-S Agent',
			timestamp: '20:41',
			content: 'Start with eight rider interviews and two station walkthroughs across peak hours.'
		},
		{
			id: 'states-question',
			from: 'user',
			author: 'You',
			timestamp: '20:42',
			content: 'Include wheelchair users and people traveling with luggage.'
		},
		{
			id: 'states-answer',
			from: 'assistant',
			author: 'AK-S Agent',
			timestamp: '20:42',
			content: 'Yes. Both groups encounter the same lift bottlenecks and platform wayfinding gaps.'
		},
		{
			id: 'evidence-question',
			from: 'user',
			author: 'You',
			timestamp: '20:44',
			content: 'How should we present the synthesis findings?'
		},
		{
			id: 'evidence-answer',
			from: 'assistant',
			author: 'AK-S Agent',
			timestamp: '20:44',
			content:
				'Keep each finding beside the verbatim interview quote or field note that supports it.'
		},
		{
			id: 'approval-question',
			from: 'user',
			author: 'You',
			timestamp: '20:46',
			content: 'What needs confirmation before the field study begins?'
		},
		{
			id: 'approval-answer',
			from: 'assistant',
			author: 'AK-S Agent',
			timestamp: '20:46',
			content:
				'Confirm participant consent language, audio recording scope, and how station coordinates may be shared.'
		},
		{
			id: 'summary-question',
			from: 'user',
			author: 'You',
			timestamp: '20:48',
			content: 'Can the transcript stay easy to navigate as turns grow?'
		},
		{
			id: 'summary-answer',
			from: 'assistant',
			author: 'AK-S Agent',
			timestamp: '20:48',
			content:
				'Hover the right-hand preview rail to inspect any turn and click a tick to jump smoothly without losing your place.'
		}
	]);
	let scrollerInput = $state('');
	let scrollerStreaming = $state(false);

	/**
	 * Appends a user turn to the MessageScroller showcase and streams a simulated assistant reply.
	 *
	 * @param rawPrompt - User prompt submitted from the showcase composer.
	 */
	function submitScrollerTurn(rawPrompt: string): void {
		const trimmed = rawPrompt.trim();
		if (!trimmed || scrollerStreaming) return;

		const turnNum = scrollerTurns.length + 1;
		const userId = `scroller-user-${turnNum}`;
		const assistantId = `scroller-assistant-${turnNum + 1}`;
		const fullReply =
			"I'll prepare the interview guide, flag unresolved consent questions, and keep every synthesis claim linked to its source.";

		scrollerTurns = [
			...scrollerTurns,
			{
				id: userId,
				from: 'user',
				author: 'You',
				timestamp: 'Now',
				content: trimmed
			},
			{
				id: assistantId,
				from: 'assistant',
				author: 'AK-S Agent',
				timestamp: 'Streaming',
				content: '',
				streaming: true
			}
		];
		scrollerInput = '';
		scrollerStreaming = true;

		let charIdx = 0;
		const timer = setInterval(() => {
			charIdx = Math.min(fullReply.length, charIdx + 6);
			const nextSlice = fullReply.slice(0, charIdx);
			const done = charIdx >= fullReply.length;
			scrollerTurns = scrollerTurns.map((t) =>
				t.id === assistantId
					? {
							...t,
							content: nextSlice,
							timestamp: done ? 'Now' : 'Streaming',
							streaming: !done
						}
					: t
			);
			if (done) {
				clearInterval(timer);
				scrollerStreaming = false;
			}
		}, 35);
	}

	$effect(() => {
		ready = true;
	});

	let filteredCatalog = $derived.by(() => {
		return CATALOG_ITEMS.filter((item) => {
			const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
			const q = searchQuery.trim().toLowerCase();
			if (!q) return matchesCategory;
			return (
				matchesCategory &&
				(item.name.toLowerCase().includes(q) ||
					item.description.toLowerCase().includes(q) ||
					item.upstreamSource.toLowerCase().includes(q) ||
					item.sveltePath.toLowerCase().includes(q))
			);
		});
	});

	// Sample fixtures for live component previews
	const sampleActivity: ActivityItem[] = [
		{
			id: 'act-1',
			type: 'text',
			label: 'Auditing SSR hydration readiness across interactive surfaces',
			status: 'complete'
		},
		{
			id: 'act-2',
			type: 'tool',
			label: 'Read',
			target: 'apps/web/src/routes/w/[workspaceSlug]/board/+page.svelte',
			status: 'complete'
		},
		{
			id: 'act-3',
			type: 'tool',
			label: 'Edit',
			target: 'apps/web/src/lib/components/CardRunDrawer.svelte',
			additions: 18,
			deletions: 4,
			status: 'complete'
		}
	];

	const sampleTodos: TodoItem[] = [
		{ id: 't-1', label: 'Port beUI Agents & Beautiful UI to Svelte 5 Runes', status: 'completed' },
		{ id: 't-2', label: 'Build GitHub Issue, PR, Commit, Checks & Kanban cards', status: 'completed' },
		{ id: 't-3', label: 'Verify dynamic IntelligentUIRenderer schema engine', status: 'in-progress' },
		{ id: 't-4', label: 'Run Playwright browser showcase verification', status: 'pending' }
	];

	const sampleToolParams: ToolApprovalParam[] = [
		{ label: 'cwd', value: '/Users/gregory.winkler/agents-kit-svelte', code: true },
		{ label: 'timeoutMs', value: '10000', code: true }
	];

	const sampleQuestions: ApprovalQuestion[] = [
		{
			id: 'q-scope',
			question: 'Which validation suites should run before opening the PR?',
			options: [
				{
					id: 'all',
					label: '(Recommended) Unit + SvelteCheck + Playwright Browser',
					description: 'Full end-to-end verification across Light and Dark themes.'
				},
				{
					id: 'fast',
					label: 'Unit + SvelteCheck only',
					description: 'Fast static and unit verification.'
				}
			]
		}
	];

	const sampleContextSources: ContextSourceItem[] = [
		{ id: 'sys', label: 'System prompt and guardrails', tokens: 11_200, category: 'system' },
		{ id: 'wt', label: 'Worktree diff and symbols', tokens: 24_600, category: 'worktree' },
		{ id: 'conv', label: 'Conversation so far', tokens: 22_700, category: 'conversation' },
		{ id: 'tools', label: 'Tool schemas', tokens: 5_700, category: 'tools' }
	];

	const sampleAgents: SupportedAgentOption[] = [
		{ id: 'claude-code', label: 'AK-S Agent', version: '0.3.0', signedIn: true },
		{ id: 'codex', label: 'Codex CLI', version: '0.29.0', signedIn: true },
		{ id: 'gemini', label: 'Gemini CLI', version: '2.4.1', signedIn: false },
	];

	const sampleCitations: CitationItem[] = [
		{
			id: 'cit-1',
			title: 'Svelte 5 Runes Migration & Reactivity Contract',
			url: 'https://svelte.dev/docs/svelte/what-are-runes',
			domain: 'svelte.dev'
		},
		{
			id: 'cit-2',
			title: 'Agents Kit Design & Component Architecture',
			url: 'https://agents-ui.github.io/agents-kit/',
			domain: 'agents-ui.github.io'
		}
	];

	const sampleDiff = `@@ -14,4 +14,5 @@
-  let open = false;
+  let { defaultOpen = false }: Props = $props();
+  let open = $state(false);`;

	const sampleCode = `export function computeContextMeter(used: number, max: number) {
  const ratio = Math.min(1, used / Math.max(1, max));
  return { percent: Math.round(ratio * 100) };
}`;

	const sampleIssue: GitHubIssueData = {
		number: 2151,
		title: 'Card drawer hydration guard prevents lost early clicks on mobile viewports',
		repo: 'RSynapse/trailside',
		state: 'in-progress',
		author: 'grok-bot',
		createdAt: '8m ago',
		labels: [
			{ name: 'ready', tone: 'accent' },
			{ name: 'area:app', tone: 'neutral' },
			{ name: 'type:bug', tone: 'danger' }
		],
		size: 'S',
		riskTier: 'T2',
		assignedAgent: 'AK-S Agent 0.3',
		attemptNumber: 1,
		worktreeBranch: 'trailside/2151-drawer-hydration',
		criteriaCompleted: 4,
		criteriaTotal: 4
	};

	const sampleChecks: GitHubCheckItem[] = [
		{
			id: 'c-1',
			name: 'corepack pnpm check (svelte-check)',
			workflow: 'CI / Verify',
			status: 'passed',
			duration: '14s'
		},
		{
			id: 'c-2',
			name: 'Playwright Browser Parity (390x844 & 1440x900)',
			workflow: 'CI / Browser',
			status: 'passed',
			duration: '38s'
		}
	];

	const samplePR: GitHubPullRequestData = {
		number: 2153,
		title: 'fix(app): guard interactive controls until client hydration completes',
		repo: 'RSynapse/trailside',
		state: 'open',
		author: 'aks-agent[bot]',
		headBranch: 'trailside/2151-drawer-hydration',
		baseBranch: 'main',
		updatedAt: '3m ago',
		additions: 46,
		deletions: 9,
		changedFilesCount: 3,
		riskTier: 'T2',
		linkedIssueNumber: 2151,
		refereeStatus: 'pass',
		checks: sampleChecks
	};

	const sampleCommit: GitHubCommitData = {
		sha: '9f8e7d6c5b4a3210fedcba9876543210abcdef12',
		message: 'feat(agents-kit): port 89 agent & GitHub UI components to Svelte 5 Runes',
		author: 'AK-S Agent',
		branch: 'trailside/2151-drawer-hydration',
		timestamp: '2m ago',
		verified: true,
		additions: 435,
		deletions: 0,
		files: [
			{ path: 'src/lib/github/GitHubKanbanBoard.svelte', status: 'added', additions: 195, deletions: 0 },
			{ path: 'src/lib/intelligent-ui/IntelligentUIRenderer.svelte', status: 'added', additions: 240, deletions: 0 }
		]
	};

	const sampleThread: GitHubReviewThreadData = {
		id: 'th-1',
		filePath: 'apps/web/src/lib/components/CardRunDrawer.svelte',
		lineRange: 'L45-L49',
		resolved: false,
		diffHunk: `@@ -45,3 +45,5 @@\n-  <button type="button" onclick={submitRun}>\n+  <button type="button" disabled={!ready} onclick={submitRun}>`,
		comments: [
			{
				id: 'rc-1',
				author: 'claude-referee',
				role: 'Referee',
				timestamp: '4m ago',
				body: 'Clean SSR readiness gate. Matches .agents/skills/ssr-interaction-readiness/SKILL.md.',
				suggestedPatch: `<button type="button" disabled={!ready} aria-busy={!ready} onclick={submitRun}>`
			}
		]
	};

	const sampleSurfaceContent: GeneratedSurfaceContent = {
		type: 'comparison',
		title: 'Framework Portability Evaluation',
		description: 'Generated by AK-S Agent · 96% confidence',
		selectedId: 'svelte5',
		options: [
			{
				id: 'svelte5',
				title: 'Svelte 5 Runes (agents-kit-svelte)',
				description: 'Fine-grained reactivity with zero Virtual DOM overhead and 100% OKLCH tokens.',
				recommended: true,
				attributes: [
					{ label: 'Reactivity', value: '$props, $state, $derived' },
					{ label: 'Theme System', value: 'OKLCH CSS variables (@theme inline)' }
				]
			},
			{
				id: 'react',
				title: 'React Upstream',
				description: 'Original upstream reference implementation.',
				attributes: [
					{ label: 'Reactivity', value: 'useState / useMemo hooks' },
					{ label: 'Theme System', value: 'Tailwind utility classes' }
				]
			}
		]
	};

	const sampleDynamicNodes: DynamicUINode[] = [
		{
			id: 'dyn-1',
			component: 'agent-activity',
			title: 'Dynamic Schema Node 1 · AgentActivity',
			props: {
				items: sampleActivity,
				status: 'complete',
				durationSeconds: 4,
				defaultOpen: true
			}
		},
		{
			id: 'dyn-2',
			component: 'github-pr-card',
			title: 'Dynamic Schema Node 2 · GitHubPullRequestCard',
			props: {
				pr: samplePR
			}
		}
	];

	const sampleCheckpoint: CheckpointEntry = {
		id: 'cp-1',
		title: 'Verified 96 Svelte 5 components + unit suite',
		description: 'All static and unit checks green',
		commitSha: '456f3b4',
		worktreeBranch: 'trailside/2151-drawer-hydration',
		timestamp: '2m ago',
		filesChanged: 12,
		restorable: true
	};

	const sampleTestSuites = [
		{
			id: 'suite-1',
			name: 'tests/svelte5-audit.test.ts',
			status: 'passed' as const,
			tests: [
				{
					id: 'tc-1',
					name: 'all 96 Svelte components comply with Svelte 5 Runes and semantic tokens',
					status: 'passed' as const,
					durationMs: 6
				}
			]
		}
	];


	const sampleFileTree = [
		{
			path: 'src/lib',
			name: 'src/lib',
			kind: 'folder' as const,
			children: [
				{ path: 'src/lib/agents', name: 'agents/ (19 components)', kind: 'file' as const, additions: 19 },
				{ path: 'src/lib/beautiful', name: 'beautiful/ (11 components)', kind: 'file' as const, additions: 11 },
				{ path: 'src/lib/github', name: 'github/ (15 components)', kind: 'file' as const, additions: 15 },
				{ path: 'src/lib/intelligent-ui', name: 'intelligent-ui/ (3 components)', kind: 'file' as const, additions: 3 },
				{ path: 'src/lib/agents-ui', name: 'agents-ui/ (11 components)', kind: 'file' as const, additions: 11 },
				{ path: 'src/lib/ai-elements', name: 'ai-elements/ & runtime/ (14 components)', kind: 'file' as const, additions: 14 }
			]
		}
	];

	// Demo clock: each preview advances only while it is on screen. A preview that kept
	// looping above the viewport would change height and make the page re-anchor and jitter.
	const visibleSlugs = new SvelteSet<string>();
	let demoTicks = $state<Record<string, number>>({});
	let demoStarts = $state<Record<string, number>>({});
	let replayCounts = $state<Record<string, number>>({});

	$effect(() => {
		if (prefersReducedMotion.current) return;
		const timer = window.setInterval(() => {
			if (document.hidden) return;
			for (const slug of visibleSlugs) demoTicks[slug] = (demoTicks[slug] ?? 0) + 1;
		}, 900);
		return () => window.clearInterval(timer);
	});

	/** Adds a catalogue card to `visibleSlugs` while any part of it is on screen. */
	function trackVisible(node: HTMLElement, slug: string) {
		const observer = new IntersectionObserver(([entry]) => {
			if (entry?.isIntersecting) visibleSlugs.add(slug);
			else visibleSlugs.delete(slug);
		});
		observer.observe(node);
		return {
			destroy() {
				observer.disconnect();
				visibleSlugs.delete(slug);
			}
		};
	}

	/**
	 * Returns how far a looping demo has progressed, from 0 to `total`, holding on the
	 * finished state for `hold` ticks before starting again. Reduced motion shows the end.
	 */
	function liveStep(slug: string, total: number, hold = 5): number {
		if (prefersReducedMotion.current) return total;
		const t = Math.max(0, (demoTicks[slug] ?? 0) - (demoStarts[slug] ?? 0)) % (total + hold);
		return Math.min(total, t);
	}

	/** Remounts a preview and restarts its demo loop. */
	function replayDemo(slug: string): void {
		replayCounts = { ...replayCounts, [slug]: (replayCounts[slug] ?? 0) + 1 };
		demoStarts = { ...demoStarts, [slug]: demoTicks[slug] ?? 0 };
	}

	function liveActivity(): ActivityItem[] {
		const step = liveStep('agent-activity', sampleActivity.length);
		return sampleActivity.slice(0, Math.min(step + 1, sampleActivity.length)).map((item, i) =>
			item.type === 'text'
				? { ...item, status: i < step ? 'complete' : 'running' }
				: { ...item, status: i < step ? 'complete' : 'running' }
		) as ActivityItem[];
	}

	function liveTodos(): TodoItem[] {
		const step = liveStep('todo-list', sampleTodos.length * 2);
		return sampleTodos.map((todo, i) => ({
			...todo,
			status: step >= i * 2 + 2 ? 'completed' : step >= i * 2 + 1 ? 'in-progress' : 'pending'
		}));
	}

	const ROUTER_PROMPTS = [
		'Write the release notes for everything that shipped this week',
		'Chart weekly signups by region for the board deck',
		'Fill out the vendor PDF form with our billing details'
	];
	const ROUTER_TICKS_PER_PROMPT = 8;

	/** Types each sample request in a few chunks, then holds so the ranking can settle. */
	function liveRouterPrompt(): string {
		const total = ROUTER_PROMPTS.length * ROUTER_TICKS_PER_PROMPT;
		const step = Math.min(total - 1, liveStep('skill-router', total, 0));
		const prompt = ROUTER_PROMPTS[Math.floor(step / ROUTER_TICKS_PER_PROMPT)];
		if (prefersReducedMotion.current) return prompt;
		const typed = Math.min(1, ((step % ROUTER_TICKS_PER_PROMPT) + 1) / 4);
		return prompt.slice(0, Math.ceil(prompt.length * typed));
	}

	function liveSkillRun(): { steps: SkillInvocationStep[]; done: boolean } {
		const step = liveStep('skill-invocation', SAMPLE_SKILL_STEPS.length + 1);
		return {
			steps: SAMPLE_SKILL_STEPS.map((s, i) => ({
				...s,
				status: i < step - 1 ? 'complete' : i === step - 1 ? 'running' : 'pending'
			})),
			done: step > SAMPLE_SKILL_STEPS.length
		};
	}

	function liveActiveSkill(): string {
		const enabled = SAMPLE_SKILLS.filter((s) => s.enabled !== false);
		const step = liveStep('skill-library', enabled.length - 1, 1);
		return enabled[step].id;
	}

	const STREAM_TEXT =
		'All 96 Svelte 5 components verified with svelte-check (0 errors, 0 warnings), and every preview on this page is live.';

	function liveStream(): { text: string; done: boolean } {
		const words = STREAM_TEXT.split(' ');
		const step = liveStep('streaming-response', Math.ceil(words.length / 3));
		const shown = Math.min(words.length, step * 3);
		return { text: words.slice(0, shown).join(' '), done: shown >= words.length };
	}

	function liveTerminal(): { output: string; done: boolean } {
		const lines = LIVE_TERMINAL_LINES;
		const step = liveStep('terminal', lines.length);
		return { output: lines.slice(0, Math.max(1, step)).join('\n'), done: step >= lines.length };
	}

	const LIVE_TERMINAL_LINES = [
		'$ corepack pnpm check && corepack pnpm test',
		'svelte-check found 0 errors and 0 warnings',
		'▶ svelte5 audit',
		'  ✔ every component uses Runes (41ms)',
		'  ✔ no hex colors in components (12ms)',
		'✔ all 96 Svelte components pass audit (105ms)'
	];

	/**
	 * Returns the active tab mode for a component card.
	 */
	function getTabMode(slug: string): CardTabMode {
		return cardTabs[slug] ?? 'preview';
	}

	/**
	 * Sets the active tab mode (`preview`, `usage`, or `source`) for a component card.
	 */
	function setTabMode(slug: string, mode: CardTabMode): void {
		cardTabs = {
			...cardTabs,
			[slug]: mode
		};
	}

	/**
	 * Copies the active code snippet (Usage Code or full Component Source) for a catalog item.
	 */
	function copySnippet(slug: string, usageSnippet: string): void {
		const mode = getTabMode(slug);
		const textToCopy =
			mode === 'source' && data.componentSources?.[slug]
				? data.componentSources[slug]
				: usageSnippet;
		if (typeof navigator !== 'undefined' && navigator.clipboard) {
			navigator.clipboard.writeText(textToCopy).catch(() => {});
		}
		copiedSlug = slug;
		window.setTimeout(() => {
			if (copiedSlug === slug) copiedSlug = null;
		}, 1500);
	}

	const CREDITS = [
		{
			name: 'Agents Kit for React',
			role: 'Original library',
			href: 'https://github.com/agents-ui/agents-kit',
			note: 'By Emiliano, MIT licensed. This project is a Svelte 5 port of its components and design.'
		},
		{
			name: 'Claude Code',
			role: 'Visual inspiration',
			href: 'https://www.anthropic.com/claude-code',
			note: 'The warm, soft look is inspired by Claude Code. Not affiliated with or endorsed by Anthropic.'
		},
		{
			name: 'Lucide',
			role: 'Icons',
			href: 'https://lucide.dev',
			note: 'Every icon in the kit comes from Lucide, ISC licensed.'
		},
		{
			name: 'Svelte',
			role: 'Framework',
			href: 'https://svelte.dev',
			note: 'Built with Svelte 5 Runes, transitions and motion.'
		}
	];

	const APP_EXAMPLES = [
		{
			href: `${base}/claude-code/`,
			icon: MessagesSquare,
			eyebrow: 'Agentic coding workbench',
			title: 'AK-S Chat',
			description:
				'A multi-turn agent session with tool traces, inline diffs, bash permissions and a context meter.',
			cta: 'Try AK-S Chat'
		},
		{
			href: `${base}/github/`,
			icon: GitPullRequest,
			eyebrow: 'Repository and board suite',
			title: 'GitHub cards, bento and kanban',
			description:
				'A crossfading issue board, run dispatch cards, PR referee cards, CI checks and review threads.',
			cta: 'Try the GitHub suite'
		},
		{
			href: `${base}/skills/`,
			icon: BookOpenText,
			eyebrow: 'Agentic Skills',
			title: 'Skills studio',
			description:
				'Route a request to a skill, watch it run step by step, then edit it or save the improvement it suggests.',
			cta: 'Try the skills studio'
		},
		{
			href: `${base}/charts/`,
			icon: ChartGantt,
			eyebrow: 'Charts & Timelines',
			title: 'Handoff Gantt and model stream',
			description:
				'Replay an agent run: who held the work, what they handed on, which model ran each phase, and charts an agent draws from JSON.',
			cta: 'Try the charts'
		},
		{
			href: `${base}/pr-flow/`,
			icon: GitMerge,
			eyebrow: 'GitHub · in the chat',
			title: 'PR flow',
			description:
				'Create a PR from the composer, watch its checks as a waterfall, let the agent fix the failing test, then merge.',
			cta: 'Watch the PR flow'
		},
		{
			href: `${base}/features/`,
			icon: Network,
			eyebrow: 'Features & lineage',
			title: 'Feature cards and lineage',
			description:
				'A Feature, its cards, every agent attempt, the PRs they opened and the releases they shipped in, as a graph you can trace and fold.',
			cta: 'Try the features'
		},
		{
			href: `${base}/intelligent-ui/`,
			icon: LayoutTemplate,
			eyebrow: 'Generative surfaces',
			title: 'Intelligent UI playground',
			description:
				'A JSON schema to Svelte renderer plus generated surfaces you can edit, compare and export.',
			cta: 'Try the playground'
		}
	];
</script>

<svelte:head>
	<title>Agents Kit Svelte · {CATALOG_ITEMS.length} Svelte 5 Agent, Skill, GitHub & Intelligent UI Components</title>
</svelte:head>

<main>
	<!-- 1. Hero: warm serif headline + live PromptInput -->
	<section class="relative overflow-hidden">
		<div
			aria-hidden="true"
			class="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_oklch,var(--color-accent-primary)_9%,transparent),transparent_70%)]"
		></div>
		<div class="relative mx-auto max-w-[880px] px-5 pt-16 pb-14 text-center sm:pt-24">
			<a
				href="#components"
				class="inline-flex items-center gap-2 rounded-full border border-card-border bg-card-bg py-1 pr-3 pl-1 text-xs text-fg-light no-underline ak-shadow-btn transition-colors hover:text-fg-main"
			>
				<span class={badgeClass('accent')}>v0.1</span>
				<span>{CATALOG_ITEMS.length} Svelte 5 components, now with Agentic Skills</span>
				<ArrowRight aria-hidden="true" class="size-3.5" />
			</a>

			<h1
				class="mt-7 font-display text-[2.6rem] leading-[1.05] font-normal tracking-[-0.02em] text-fg-main sm:text-[4.25rem]"
			>
				Gentle interfaces for
				<br class="hidden sm:block" />
				<span class="text-accent-primary">thoughtful</span> agents.
			</h1>

			<p class="mx-auto mt-6 max-w-xl text-base leading-7 text-fg-light sm:text-[17px]">
				Chat, tools, approvals, GitHub workflows and generated results, built with Svelte 5
				Runes. Soft by default, and yours to copy and change.
			</p>

			<!-- Live, self-playing agent conversation -->
			<div class="mx-auto mt-10 w-full max-w-[720px]">
				<HeroDemo agents={sampleAgents} />
			</div>

			<div class="mt-8 flex flex-wrap justify-center gap-2.5">
				<a href="#components" class="{buttonClass('primary', 'lg')} no-underline">
					Browse {CATALOG_ITEMS.length} components
					<ArrowRight aria-hidden="true" />
				</a>
				<a href="{base}/claude-code/" class="{buttonClass('secondary', 'lg')} no-underline">
					<Sparkle aria-hidden="true" class="fill-current text-accent-primary" />
					Open AK-S Chat
				</a>
			</div>

			<p class="mt-6 text-xs leading-5 text-fg-light">
				A Svelte 5 port of
				<a
					href="https://github.com/agents-ui/agents-kit"
					class="font-medium text-fg-main underline decoration-card-border underline-offset-4 hover:decoration-fg-light"
					>Agents Kit for React</a
				>
				by Emiliano, with a look inspired by Claude Code.
				<a href="#credits" class="text-fg-light underline decoration-card-border underline-offset-4 hover:text-fg-main"
					>Credits</a
				>
			</p>
		</div>
	</section>

	<!-- 2. Build with the kit · complete app examples -->
	<section id="app-examples" class="mx-auto max-w-[1160px] px-5 pt-4 pb-16 sm:px-8">
		<div class="mb-7 flex flex-wrap items-end justify-between gap-4">
			<div>
				<p class="text-xs font-medium text-accent-primary">Build with the kit</p>
				<h2 class="mt-2 font-display text-[1.75rem] leading-tight font-normal tracking-[-0.015em] text-fg-main">
					Start with a complete app.
				</h2>
			</div>
			<a
				href="{base}/claude-code/"
				class="{buttonClass('ghost', 'md')} no-underline"
			>
				Explore the workbenches
				<ArrowRight aria-hidden="true" />
			</a>
		</div>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each APP_EXAMPLES as example (example.href)}
				<a
					href={example.href}
					class="group flex flex-col justify-between rounded-window border border-card-border bg-card-bg p-5 no-underline ak-shadow-soft-sm ak-hover-soft hover:border-accent-primary/30"
				>
					<div>
						<span
							class="inline-flex size-9 items-center justify-center rounded-full bg-accent-subtle text-accent-primary [&_svg]:size-4"
						>
							<example.icon aria-hidden="true" />
						</span>
						<p class="mt-4 text-xs text-fg-light">{example.eyebrow}</p>
						<h3 class="mt-1 text-[15px] font-semibold text-fg-main">{example.title}</h3>
						<p class="mt-2 text-[13px] leading-6 text-fg-light">{example.description}</p>
					</div>
					<span class="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-fg-main">
						{example.cta}
						<ArrowRight
							aria-hidden="true"
							class="size-3.5 text-fg-light transition-colors group-hover:text-accent-primary"
						/>
					</span>
				</a>
			{/each}
		</div>
	</section>

	<!-- Credits & license -->
	<section id="credits" class="mx-auto max-w-[1160px] scroll-mt-20 px-5 pb-16 sm:px-8">
		<div class="rounded-window border border-card-border bg-chat-surface p-6 ak-shadow-soft-sm sm:p-8">
			<div class="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
				<div>
					<p class="text-xs font-medium text-accent-primary">Credits</p>
					<h2 class="mt-2 font-display text-[1.75rem] leading-tight font-normal tracking-[-0.015em] text-fg-main">
						Built on other people’s good work.
					</h2>
					<p class="mt-3 text-sm leading-6 text-fg-light">
						Agents Kit Svelte is free to use under the Apache License 2.0. If you ship it, or something
						built from it, keep the license and the NOTICE file so the credit travels with the code.
					</p>
					<div class="mt-5 flex flex-wrap gap-2">
						<a
							href="https://github.com/rsynapse/agents-kit-svelte/blob/main/LICENSE"
							class="{buttonClass('secondary', 'md')} no-underline"
						>
							<Scale aria-hidden="true" />
							Apache 2.0 license
						</a>
						<a
							href="https://github.com/rsynapse/agents-kit-svelte/blob/main/NOTICE"
							class="{buttonClass('ghost', 'md')} no-underline"
						>
							Read the NOTICE
							<ArrowRight aria-hidden="true" />
						</a>
					</div>
				</div>

				<ul class="grid gap-3 sm:grid-cols-2">
					{#each CREDITS as credit (credit.name)}
						<li class="rounded-[18px] border border-card-border bg-card-bg p-4">
							<p class="text-xs text-fg-light">{credit.role}</p>
							<a
								href={credit.href}
								class="mt-1 inline-flex items-center gap-1 text-[15px] font-semibold text-fg-main no-underline hover:text-accent-primary"
							>
								{credit.name}
								<ArrowUpRight aria-hidden="true" class="size-3.5 text-fg-light" />
							</a>
							<p class="mt-1.5 text-[13px] leading-5 text-fg-light">{credit.note}</p>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</section>

	<!-- 3. Upstream Two-Column Sticky Sidebar + Main Component Catalogue -->
	<div
		id="components"
		class="mx-auto grid max-w-7xl scroll-mt-16 border-t border-canvas-border/70 lg:grid-cols-[240px_minmax(0,1fr)]"
	>
		<!-- Left Sticky Sidebar (matches components/gallery/catalogue.tsx) -->
		<aside
			aria-label="Catalogue filter and component index"
			class="border-b border-canvas-border/70 p-4 lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:overflow-auto lg:border-r lg:border-b-0 lg:py-6"
		>
			<label
				class="flex h-9 items-center gap-2 rounded-full border border-card-border bg-card-bg px-3.5 ak-shadow-btn transition-[border-color,box-shadow] focus-within:border-accent-primary/50 focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-accent-primary)_14%,transparent)]"
			>
				<Search aria-hidden="true" class="size-3.5 text-fg-light" />
				<input
					type="search"
					aria-label="Search components"
					placeholder="Search {CATALOG_ITEMS.length} components"
					bind:value={searchQuery}
					class="min-w-0 flex-1 bg-transparent text-[13px] text-fg-main outline-none placeholder:text-fg-light"
				/>
			</label>

			<div class="mt-4">
				<label for="collection-source" class="px-1 text-xs font-medium text-fg-light">Collection</label>
				<select
					id="collection-source"
					value={selectedCategory}
					onchange={(e) =>
						(selectedCategory = (e.currentTarget as HTMLSelectElement).value as
							| 'All'
							| CatalogCategory)}
					class="mt-1.5 h-9 w-full rounded-full border border-card-border bg-card-bg px-3 text-[13px] text-fg-main"
				>
					{#each CATEGORIES as cat (cat)}
						{@const count =
							cat === 'All'
								? CATALOG_ITEMS.length
								: CATALOG_ITEMS.filter((i) => i.category === cat).length}
						<option value={cat}>
							{cat === 'All' ? `All collections (${count})` : `${cat} (${count})`}
						</option>
					{/each}
				</select>
			</div>

			<nav class="mt-6 hidden lg:block" aria-label="Component families">
				<p class="mb-2 px-3 text-xs font-medium text-fg-light">
					Components ({filteredCatalog.length})
				</p>
				<div class="space-y-0.5">
					{#each filteredCatalog as item (item.slug)}
						<a
							href="#{item.slug}"
							class="block truncate rounded-full px-3 py-1.5 text-[13px] text-fg-light no-underline transition-colors hover:bg-canvas-secondary hover:text-fg-main"
						>
							{item.name}
						</a>
					{/each}
				</div>
			</nav>
		</aside>

		<!-- Right Main Catalogue Column -->
		<div class="min-w-0 px-4 py-8 sm:px-6 lg:px-10">
			<header class="mb-7 max-w-2xl">
				<p class="text-xs font-medium text-accent-primary">Components</p>
				<h2 class="mt-2 font-display text-[2rem] leading-tight font-normal tracking-[-0.015em] text-fg-main">
					An interface for every part of agent work.
				</h2>
				<p class="mt-2.5 text-sm leading-6 text-fg-light">
					From the first prompt to the final result. Explore thinking, tools, decisions, GitHub
					workflows, and generated interfaces in one consistent Svelte 5 collection.
				</p>

			</header>

			<!-- Category Tab Strip (accessible tablist for quick one-click filtering) -->
			<div
				class="mb-8 flex flex-wrap items-center gap-1.5"
				role="tablist"
				aria-label="Component category filter"
			>
				{#each CATEGORIES as category (category)}
					{@const count =
						category === 'All'
							? CATALOG_ITEMS.length
							: CATALOG_ITEMS.filter((i) => i.category === category).length}
					<button
						type="button"
						role="tab"
						disabled={!ready}
						aria-selected={selectedCategory === category}
						onclick={() => (selectedCategory = category)}
						class="inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-colors {selectedCategory ===
						category
							? 'border-fg-main bg-fg-main text-fg-inverse'
							: 'border-card-border bg-card-bg text-fg-light hover:border-fg-light/40 hover:text-fg-main'}"
					>
						{category}
						<span class="tabular-nums opacity-60">{count}</span>
					</button>
				{/each}
			</div>

			<!-- Component Sections (upstream dashed-border FamilyPreview layout) -->
			<div class="space-y-6">
				{#each filteredCatalog as item (item.slug)}
					{@const tabMode = getTabMode(item.slug)}
					{@const showCode = tabMode !== 'preview'}
					<article
						id={item.slug}
						data-component-slug={item.slug}
						use:trackVisible={item.slug}
						class="scroll-mt-24 rounded-window border border-card-border bg-card-bg p-4 ak-shadow-soft-sm sm:p-5"
					>
						<!-- Upstream FamilyPreview Header -->
						<header class="mb-4 flex flex-wrap items-start justify-between gap-3 px-1">
							<div class="max-w-2xl">
								<div class="flex flex-wrap items-center gap-2">
									<h3 class="text-[15px] font-semibold text-fg-main">
										{item.name}
									</h3>
									<span class={badgeClass('neutral')}>
										{item.category}
									</span>
								</div>
								<p class="mt-1 text-[13px] leading-5 text-fg-light">{item.description}</p>
								<p class="mt-1 truncate font-mono text-[11px] text-fg-light/80">
									{item.sveltePath}
								</p>
							</div>

							<!-- Preview | Usage | Source segmented control + copy -->
							<div class="flex items-center gap-1.5">
								<div class={SEGMENT_GROUP_CLASS} role="group" aria-label="{item.name} view">
									<button
										type="button"
										disabled={!ready}
										aria-pressed={tabMode === 'preview'}
										onclick={() => setTabMode(item.slug, 'preview')}
										class={segmentClass(tabMode === 'preview')}
									>
										<Eye aria-hidden="true" />
										Preview
									</button>
									<button
										type="button"
										disabled={!ready}
										aria-pressed={tabMode === 'usage'}
										onclick={() => setTabMode(item.slug, 'usage')}
										class={segmentClass(tabMode === 'usage')}
									>
										<Code aria-hidden="true" />
										Usage
									</button>
									<button
										type="button"
										disabled={!ready}
										aria-pressed={tabMode === 'source'}
										onclick={() => setTabMode(item.slug, 'source')}
										class={segmentClass(tabMode === 'source')}
									>
										<FileCode aria-hidden="true" />
										Source
									</button>
								</div>

								<button
									type="button"
									disabled={!ready}
									aria-label="Replay {item.name} demo"
									title="Replay demo"
									onclick={() => replayDemo(item.slug)}
									class={buttonClass('ghost', 'icon-sm')}
								>
									<RotateCcw aria-hidden="true" />
								</button>
								<button
									type="button"
									disabled={!ready}
									aria-label={copiedSlug === item.slug ? 'Snippet copied' : `Copy ${item.name} usage snippet`}
									title="Copy usage snippet"
									onclick={() => copySnippet(item.slug, item.usageSnippet)}
									class={buttonClass('ghost', 'icon-sm')}
								>
									{#if copiedSlug === item.slug}
										<Check aria-hidden="true" class="text-status-success" />
									{:else}
										<Copy aria-hidden="true" />
									{/if}
								</button>
							</div>
						</header>

						<!-- Upstream rounded-[14px] Stage -->
						<div
							use:holdHeight={`${tabMode}:${replayCounts[item.slug] ?? 0}`}
							class="relative isolate overflow-x-auto rounded-[18px] bg-canvas-secondary/70 p-4 sm:p-6"
						>
							{#key replayCounts[item.slug] ?? 0}
							{#if tabMode === 'usage'}
								<CodeBlock
									filename="{item.slug}-example.svelte"
									language="svelte"
									code={item.usageSnippet}
								/>
							{:else if tabMode === 'source'}
								<CodeBlock
									filename={item.sveltePath}
									language="svelte"
									code={data.componentSources?.[item.slug] ?? item.usageSnippet}
								/>
							{:else if item.slug === 'chat-workbench'}
								<ChatWorkbench
									embedded={true}
									class="rounded-xl border border-card-border"
								/>
							{:else if item.slug === 'agent-activity'}
								{@const activityItems = liveActivity()}
								<AgentActivity
									items={activityItems}
									status={activityItems.every((i) => i.status === 'complete') ? 'complete' : 'working'}
									durationSeconds={6}
									defaultOpen={true}
								/>
							{:else if item.slug === 'agent-disclosure'}
								<div class="space-y-2">
									<button
										type="button"
										disabled={!ready}
										onclick={() => (disclosureDemoOpen = !disclosureDemoOpen)}
										aria-expanded={disclosureDemoOpen}
										class={buttonClass('secondary', 'sm')}
									>
										<ChevronDown aria-hidden="true" class="transition-transform duration-200 {disclosureDemoOpen ? 'rotate-180' : ''}" />
										{disclosureDemoOpen ? 'Collapse' : 'Expand'}
									</button>
									<AgentDisclosure open={disclosureDemoOpen}>
										<div
											class="rounded-card border border-card-border bg-card-bg p-3 text-[13px] text-fg-main"
										>
											Accessible Svelte 5 slide+fade disclosure panel with
											<code class="text-accent-primary">inert</code> hidden state.
										</div>
									</AgentDisclosure>
								</div>
							{:else if item.slug === 'todo-list'}
								<TodoList
									title="Svelte 5 Port & Verification Plan"
									items={liveTodos()}
									defaultOpen={true}
								/>
							{:else if item.slug === 'tool-approval'}
								<ToolApproval
									tool="Bash"
									summary="corepack pnpm check && corepack pnpm test"
									params={sampleToolParams}
								/>
							{:else if item.slug === 'tool-result'}
								<ToolResult
									tool="Bash"
									summary="corepack pnpm test"
									status="success"
									meta="96ms · 9 passed"
									output="✔ all 96 Svelte components in src/ comply with Svelte 5 Runes, Props typing, and semantic token rules"
									defaultOpen={true}
								/>
							{:else if item.slug === 'file-diff'}
								<FileDiff filename="src/lib/agents/AgentActivity.svelte" patch={sampleDiff} />
							{:else if item.slug === 'code-block'}
								<CodeBlock
									filename="src/lib/state/chat-helpers.ts"
									language="typescript"
									code={sampleCode}
									highlightLines={[2]}
								/>
							{:else if item.slug === 'approval-card'}
								<ApprovalCard
									title="Confirm verification scope before creating PR"
									questions={sampleQuestions}
								/>
							{:else if item.slug === 'prompt-input'}
								<PromptInput agents={sampleAgents} selectedAgentId="claude-code" />
							{:else if item.slug === 'message'}
								<Message
									role="assistant"
									author="AK-S Agent"
									badge="Connected Computer"
									timestamp="21:18"
								>
									<p class="text-sm text-fg-main">
										Verified worktree
										<code class="rounded bg-card-bg px-1.5 py-0.5 font-mono text-xs"
											>trailside/2151-drawer-hydration</code
										>
										with zero TypeScript diagnostics.
									</p>
								</Message>
							{:else if item.slug === 'message-bubble'}
								<div class="space-y-2">
									<MessageBubble
										variant="tint"
										align="end"
										author="gregory.winkler"
										timestamp="21:15"
										status="delivered"
										text="Port the entire agents-kit suite to Svelte 5 Runes and include GitHub card layouts."
									/>
									<MessageBubble
										variant="soft"
										align="start"
										author="AK-S Agent"
										timestamp="21:16"
										collapsible={true}
										text="All 96 Svelte 5 components are live with strict TypeScript Props, OKLCH dark/light tokens, and interactive showcases."
									/>
								</div>
							{:else if item.slug === 'message-scroller'}
								<div
									class="mx-auto flex h-[440px] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-card-border bg-card-bg shadow-[var(--shadow-card)]"
								>
									<MessageScroller
										navigation="rail"
										streaming={scrollerStreaming}
										busy={scrollerStreaming}
										class="min-h-0 flex-1"
									>
										{#each scrollerTurns as turn (turn.id)}
											<MessageBubble
												id={turn.id}
												variant={turn.from === 'user' ? 'solid' : 'soft'}
												align={turn.from === 'user' ? 'end' : 'start'}
												author={turn.author}
												avatar={turn.from === 'user' ? 'YO' : 'AK'}
												timestamp={turn.timestamp}
												status={turn.streaming ? 'streaming' : 'delivered'}
												collapsible={false}
												text={turn.content || 'Preparing response…'}
											/>
										{/each}
									</MessageScroller>

									<form
										onsubmit={(event) => {
											event.preventDefault();
											submitScrollerTurn(
												scrollerInput || 'Draft the synthesis checklist for station interviews.'
											);
										}}
										class="flex shrink-0 items-center gap-2 border-t border-card-border bg-canvas-secondary px-3 py-2.5"
									>
										<input
											type="text"
											bind:value={scrollerInput}
											aria-label="Send a message to test MessageScroller auto-follow"
											placeholder="Ask about the study or click Stream turn to test auto-follow…"
											class="h-8 min-w-0 flex-1 rounded-lg border border-card-border bg-card-bg px-3 text-xs text-fg-main outline-none focus:border-accent-primary"
										/>
										<button
											type="submit"
											disabled={scrollerStreaming}
											class="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-fg-main px-3 text-xs font-medium text-fg-inverse transition-opacity hover:opacity-90 disabled:opacity-50"
										>
											<span>{scrollerStreaming ? 'Streaming…' : 'Stream turn'}</span>
										</button>
									</form>
								</div>
							{:else if item.slug === 'streaming-response'}
								{@const stream = liveStream()}
								<StreamingResponse
									status={stream.done ? 'complete' : 'streaming'}
									copyText={STREAM_TEXT}
									sources={sampleCitations}
									showActions={stream.done}
								>
									<p class="min-h-10 text-sm text-fg-main">{stream.text}</p>
								</StreamingResponse>
							{:else if item.slug === 'citations'}
								<Citations citations={sampleCitations} defaultOpen={true} />
							{:else if item.slug === 'image-generation'}
								<ImageGeneration prompt="Architectural isometric diagram of an isolated Git worktree pipeline, warm editorial technical illustration" />
							{:else if item.slug === 'ai-sidebar'}
								<AISidebar items={SAMPLE_SIDEBAR_RESOURCES} defaultExpandedIds={['wt-184', 'src-agents', 'proj-contracts']} />
							{:else if item.slug === 'thinking-shimmer'}
								<ThinkingShimmer spark label="Analyzing repository structure..." />
							{:else if item.slug === 'agent-progress'}
								<AgentProgress label="Running Playwright suite" initialSeconds={14} />
							{:else if item.slug === 'reasoning-text'}
								<ReasoningText />
							{:else if item.slug === 'tool-chips'}
								<ToolChips steps={SAMPLE_TOOL_STEPS} diffs={SAMPLE_TOOL_DIFFS} />
							{:else if item.slug === 'recommendation-card'}
								<RecommendationCard title="Use atomic outbox + journal transaction for Run dispatch" summary="Ensures every dispatched workflow card records its state transition and companion payload atomically before notifying the worker stream." confidence={0.94} reasoning={SAMPLE_RECOMMENDATION_REASONING} alternatives={SAMPLE_RECOMMENDATION_ALTERNATIVES} />
							{:else if item.slug === 'context-cards'}
								<ContextCards chunks={SAMPLE_CONTEXT_CHUNKS} />
							{:else if item.slug === 'diff-table'}
								<DiffTable rows={SAMPLE_DIFF_ROWS} />
							{:else if item.slug === 'records-table'}
								<RecordsTable records={SAMPLE_RECORDS}
									selectedIds={selectedRecordIds}
									onSelectionChange={(ids) => (selectedRecordIds = ids)}
								/>
							{:else if item.slug === 'selection-actions'}
								<SelectionActions selectedText="Retries must reauthorize before the idempotency lookup, and the lookup must precede new-intent revision checks." actions={SAMPLE_SELECTION_ACTIONS}
									selectedCount={selectedRecordIds.length || 2}
									onClear={() => (selectedRecordIds = [])}
								/>
							{:else if item.slug === 'filter-table'}
								<FilterTable rows={SAMPLE_FILTER_ROWS} />
							{:else if item.slug === 'flowchart'}
								<Flowchart nodes={SAMPLE_FLOWCHART_NODES} />
							{:else if item.slug === 'insight-cards'}
								<InsightCards insights={SAMPLE_INSIGHTS} />
							{:else if item.slug === 'fine-tune-card'}
								<FineTuneCard title="Agent Runtime Parameters" fields={SAMPLE_FINE_TUNE_FIELDS} />
							{:else if item.slug === 'search-list'}
								<SearchList items={SAMPLE_SEARCH_ITEMS} placeholder="Search issues, files, runs, and ADRs…" />
							{:else if item.slug === 'github-issue-card'}
								<GitHubIssueCard issue={sampleIssue} />
							{:else if item.slug === 'github-pr-card'}
								<GitHubPullRequestCard pr={samplePR} />
							{:else if item.slug === 'github-commit-card'}
								<GitHubCommitCard commit={sampleCommit} />
							{:else if item.slug === 'github-checks-panel'}
								<GitHubChecksPanel checks={sampleChecks} />
							{:else if item.slug === 'github-review-thread'}
								<GitHubReviewThreadCard currentUser="argon-agent" thread={sampleThread} />
							{:else if item.slug === 'github-kanban-board'}
								<GitHubKanbanBoard title="RSynapse/trailside · Reactive Board" badge="GitHub App Read-Only Sync" description="What's in motion across Triage, Active Worktree Runs, Referee Review, and Merged cards" issues={SAMPLE_BOARD_ISSUES} />
							{:else if item.slug === 'github-bento-layout'}
								<GitHubBentoLayout repoName="RSynapse/trailside" repoDetail="GitHub App installation active" branchDetail="Protected · Referee merge queue" stats={SAMPLE_BENTO_STATS} pullRequest={SAMPLE_PULL_REQUEST} checks={SAMPLE_CHECKS} issue={SAMPLE_ISSUE} commit={SAMPLE_COMMIT} thread={SAMPLE_REVIEW_THREAD} />
							{:else if item.slug === 'github-lifecycle-timeline'}
								<GitHubLifecycleTimeline stages={SAMPLE_LIFECYCLE_STAGES} live={visibleSlugs.has(item.slug)} />
							{:else if item.slug === 'github-issue-triage'}
								<GitHubIssueTriage issue={SAMPLE_TRIAGE_ISSUE} live={visibleSlugs.has(item.slug)} />
							{:else if item.slug === 'github-branch-card'}
								<GitHubBranchCard branch={SAMPLE_BRANCH} live={visibleSlugs.has(item.slug)} />
							{:else if item.slug === 'github-pr-review'}
								<GitHubPullRequestReview prNumber={2210} title="fix(export): quote CSV fields per RFC 4180" reviewer="mira-chen" files={SAMPLE_REVIEW_FILES} live={visibleSlugs.has(item.slug)} />
							{:else if item.slug === 'github-merge-queue'}
								<GitHubMergeQueue entries={SAMPLE_MERGE_QUEUE} live={visibleSlugs.has(item.slug)} />
							{:else if item.slug === 'github-deployment-pipeline'}
								<GitHubDeploymentPipeline sha="9b07d3e" environments={SAMPLE_ENVIRONMENTS} live={visibleSlugs.has(item.slug)} />
							{:else if item.slug === 'github-release-card'}
								<GitHubReleaseCard release={SAMPLE_RELEASE} live={visibleSlugs.has(item.slug)} />
							{:else if item.slug === 'github-incident-card'}
								<GitHubIncidentCard incident={SAMPLE_INCIDENT} live={visibleSlugs.has(item.slug)} />
							{:else if item.slug === 'agent-generative-surface'}
								<AgentGenerativeSurface content={sampleSurfaceContent} />
							{:else if item.slug === 'result-actions'}
								<ResultActions
									state={resultActionMode}
									saved={resultSaved}
									onExpand={() =>
										(resultActionMode = resultActionMode === 'expanded' ? 'view' : 'expanded')}
									onEdit={() =>
										(resultActionMode = resultActionMode === 'editing' ? 'view' : 'editing')}
									onCompare={() =>
										(resultActionMode = resultActionMode === 'comparing' ? 'view' : 'comparing')}
									onSave={() => (resultSaved = !resultSaved)}
								/>
							{:else if item.slug === 'intelligent-ui-renderer'}
								<IntelligentUIRenderer nodes={sampleDynamicNodes} />
							{:else if item.slug === 'agent-orchestrator'}
								<AgentOrchestrator subAgents={SAMPLE_SUB_AGENTS} communicationLog={SAMPLE_COMM_LOG} orchestratorName="Supervisor Delegation Graph · Card 191" supervisorModel="Claude Opus 4 Supervisor" description="Coordinates repository discovery, isolated worktree implementation, and referee verification as one accountable run." aggregatedResult="Discovery complete. Worktree Builder is validating idempotency replay semantics before Referee verification." timestamp="Updated moments ago" isProcessing={true} />
							{:else if item.slug === 'agent-parallel-processor'}
								<AgentParallelProcessor lanes={SAMPLE_PARALLEL_LANES} taskDescription="Execute concurrent worktree verification lanes and merge into a unified referee report." mergedOutput="1 of 4 lanes complete · Aggregating contract and domain test artifacts." mergeStatus="merging" />
							{:else if item.slug === 'agent-sequential-workflow'}
								<AgentSequentialWorkflow steps={SAMPLE_WORKFLOW_STEPS} workflowName="Sequential Stage-Gate Pipeline" description="Each stage validates its gate dependency before handing structured output to the next stage." currentStepId="contract-export" totalDuration="3m 36s" totalTokens={15380} isRunning={true} />
							{:else if item.slug === 'agent-routing-hub'}
								<AgentRoutingHub routes={SAMPLE_ROUTES} routingHistory={SAMPLE_ROUTING_HISTORY} inputQuery="Implement idempotent retry reauthorization before revision check in outbox handler" classification={SAMPLE_ROUTE_CLASSIFICATION} />
							{:else if item.slug === 'agent-evaluator'}
								<AgentEvaluator iterations={SAMPLE_EVAL_ITERATIONS} taskDescription="Rubric-based Referee & Red-Team Scorecard for Card 191 (Risk Tier T2)" />
							{:else if item.slug === 'agent-ops-monitor'}
								<AgentOpsMonitor signals={SAMPLE_OPS_SIGNALS} metrics={SAMPLE_OPS_METRICS} incidents={SAMPLE_OPS_INCIDENTS} environment="Companion + Service Telemetry" uptime="99.98%" />
							{:else if item.slug === 'agent-task-queue'}
								<AgentTaskQueue tasks={SAMPLE_TASKS} timestamp="Updated moments ago" />
							{:else if item.slug === 'agent-artifact'}
								<AgentArtifact versions={SAMPLE_ARTIFACT_VERSIONS} metadata={SAMPLE_ARTIFACT_METADATA} title="G0 Browser Read Contract · Design Artifact" currentVersion="v2" />
							{:else if item.slug === 'agent-form-generator'}
								<AgentFormGenerator fields={SAMPLE_FORM_FIELDS} formTitle="Dispatch Worktree Run Tool Schema" formDescription="Dynamic schema-to-form generator for structured agent tool inputs with live validation and JSON payload preview." />
							{:else if item.slug === 'agent-tool-palette'}
								<AgentToolPalette tools={SAMPLE_TOOLS} defaultSelectedId="mcp-verify-svelte5" />
							{:else if item.slug === 'agent-thinking-indicator'}
								<AgentThinkingIndicator detail="Claude Code 1.0 · Card 191 Attempt 1 · 18.4k tokens" />
							{:else if item.slug === 'agent-context-meter'}
								<div class="min-h-56"><AgentContextMeter usedTokens={64200} maxTokens={200000} sources={sampleContextSources} /></div>
							{:else if item.slug === 'agent-checkpoint'}
								<AgentCheckpoint checkpoint={sampleCheckpoint} />
							{:else if item.slug === 'chain-of-thought'}
								<ChainOfThought steps={SAMPLE_CHAIN_OF_THOUGHT} />
							{:else if item.slug === 'stack-trace'}
								<StackTrace trace={SAMPLE_STACK_TRACE} sourceSnippet={SAMPLE_STACK_SNIPPET} />
							{:else if item.slug === 'schema-display'}
								<SchemaDisplay parameters={SAMPLE_SCHEMA_PARAMETERS} requestBody={SAMPLE_SCHEMA_REQUEST_BODY} responseBody={SAMPLE_SCHEMA_RESPONSE_BODY} path={'/api/v1/workspaces/{workspaceId}/runs'} description="Dispatches an isolated agent workflow run on a paired computer with idempotency verification." />
							{:else if item.slug === 'environment-variables'}
								<EnvironmentVariables variables={SAMPLE_ENV_VARIABLES} />
							{:else if item.slug === 'package-info'}
								<PackageInfo scripts={SAMPLE_PACKAGE_SCRIPTS} dependencies={SAMPLE_PACKAGE_DEPENDENCIES} name="@trailside/agents-kit-svelte" description="Svelte 5 Runes agentic UI primitives, GitHub workflow cards, and generative surfaces." />
							{:else if item.slug === 'web-preview'}
								<WebPreview logs={SAMPLE_PREVIEW_LOGS} defaultUrl="http://localhost:5173/w/board" />
							{:else if item.slug === 'plan-card'}
								<PlanCard milestones={SAMPLE_PLAN_MILESTONES} riskTier="T2" title="Implementation Plan: Svelte 5 Agent Kit Unification" description="Three-milestone execution plan scoped to isolated worktree with automated referee checks." />
							{:else if item.slug === 'prompt-suggestions'}
								<PromptSuggestions suggestions={SAMPLE_PROMPT_SUGGESTIONS} />
							{:else if item.slug === 'test-results'}
								<TestResults suites={sampleTestSuites} />
							{:else if item.slug === 'terminal'}
								{@const term = liveTerminal()}
								<Terminal output={term.output} streaming={!term.done} title="~/agents-kit-svelte · zsh" />
							{:else if item.slug === 'file-tree'}
								<FileTree nodes={sampleFileTree} />
							{:else if item.slug === 'skill-library'}
								<SkillLibrary skills={SAMPLE_SKILLS} activeSkillId={liveActiveSkill()} />
							{:else if item.slug === 'skill-card'}
								<div class="mx-auto max-w-md">
									<SkillCard
										skill={{ ...SAMPLE_SKILLS[0], invocations: (SAMPLE_SKILLS[0].invocations ?? 0) + liveStep('skill-card', 3, 3) }}
										defaultFilesOpen={true}
									/>
								</div>
							{:else if item.slug === 'skill-router'}
								<div class="mx-auto max-w-xl">
									<SkillRouter skills={SAMPLE_SKILLS} prompt={liveRouterPrompt()} readonly={true} />
								</div>
							{:else if item.slug === 'skill-invocation'}
								{@const run = liveSkillRun()}
								<div class="mx-auto max-w-xl">
									<SkillInvocation
										skill={SAMPLE_SKILLS[0]}
										steps={run.steps}
										status={run.done ? 'complete' : 'running'}
										durationSeconds={8}
									>
										{#snippet result()}
											<p class="font-mono text-xs text-fg-light">
												{run.done ? 'Wrote RELEASE_NOTES.md · 42 lines, 14 linked PRs' : 'Writing RELEASE_NOTES.md…'}
											</p>
										{/snippet}
									</SkillInvocation>
								</div>
							{:else if item.slug === 'skill-editor'}
								<SkillEditor manifest={SAMPLE_SKILL_MANIFEST} />
							{:else if item.slug === 'skill-proposal-card'}
								<div class="mx-auto max-w-xl">
									<SkillProposalCard proposal={SAMPLE_SKILL_PROPOSAL} />
								</div>
							{:else if item.slug === 'voice-wave-visualizer'}
								<VoiceWaveVisualizer devices={SAMPLE_VOICE_DEVICES} personas={SAMPLE_VOICE_PERSONAS} defaultPersonaId="sol" defaultMicId="mic-macbook-pro" transcript="Check the failing unit test in chat-helpers and explain why the token ratio threshold triggered a warning." />
							{:else if item.slug === 'generative-chart'}
								<GenerativeChart spec={SAMPLE_CHART_SPECS.latency} />
							{:else if item.slug === 'agent-handoff-gantt'}
								<AgentHandoffGantt title="Add SSO to the billing portal" lanes={SAMPLE_HANDOFF_LANES} spans={SAMPLE_HANDOFF_SPANS} handoffs={SAMPLE_HANDOFFS} />
							{:else if item.slug === 'model-phase-stream'}
								<ModelPhaseStream title="Model throughput by phase" phases={SAMPLE_PHASE_BANDS} series={SAMPLE_MODEL_SERIES} events={SAMPLE_MODEL_EVENTS} />
							{:else if item.slug === 'agent-work-trace'}
								<div class="mx-auto max-w-xl"><AgentWorkTrace steps={SAMPLE_WORK_STEPS} status="done" elapsed={5} /></div>
							{:else if item.slug === 'github-pr-action-bar'}
								<div class="flex min-h-24 items-end"><GitHubPrActionBar diff={SAMPLE_PR_DIFF} /></div>
							{:else if item.slug === 'github-pr-graph'}
								<GitHubPullRequestGraph title="Refresh sessions before they expire" number={128} lanes={SAMPLE_PR_GRAPH_LANES} commits={SAMPLE_PR_GRAPH_COMMITS} head="session" mergeState="clean" footer={{ label: 'Checks 2/5', tone: 'running' }} />
							{:else if item.slug === 'github-checks-waterfall'}
								<GitHubChecksWaterfall prNumber={128} commit={{ sha: 'd29f50a', message: 'Add session refresh tests' }} checks={SAMPLE_CHECK_RUNS} />
							{:else if item.slug === 'feature-card'}
								<div class="mx-auto max-w-md">
									<FeatureCard feature={SAMPLE_FEATURE} />
								</div>
							{:else if item.slug === 'feature-proposal'}
								<div class="mx-auto max-w-md">
									<FeatureProposalCard title={SAMPLE_PROPOSAL.title} summary={SAMPLE_PROPOSAL.summary} criteria={SAMPLE_PROPOSAL.criteria} cards={SAMPLE_PROPOSAL.cards} estimate={SAMPLE_PROPOSAL.estimate} status={proposalStatus} onApprove={approveProposal} onDecline={() => (proposalStatus = 'declined')} />
								</div>
							{:else if item.slug === 'blocked-work-list'}
								<div class="mx-auto max-w-xl">
									<BlockedWorkList items={blockedItems} busyIds={blockedBusy} onAction={runBlockedAction} />
								</div>
							{:else if item.slug === 'feature-lineage'}
								<FeatureLineage title="F-12 lineage" nodes={SAMPLE_LINEAGE_NODES} edges={SAMPLE_LINEAGE_EDGES} />
							{:else if item.slug === 'feature-timeline'}
								<FeatureTimeline title="F-12 timeline" items={SAMPLE_TIMELINE_ITEMS} milestones={SAMPLE_TIMELINE_MILESTONES} today={SAMPLE_TIMELINE_TODAY} start={SAMPLE_FEATURE_START} />
							{:else if item.slug === 'token-burn-chart'}
								<TokenBurnChart title="Token burn" points={SAMPLE_BURN_POINTS} budget={SAMPLE_TOKEN_BUDGET} marks={SAMPLE_RUN_MARKS} />
							{:else if item.slug === 'run-replay-scrubber'}
								<RunReplayScrubber duration={SAMPLE_RUN_DURATION} phases={SAMPLE_PHASE_BANDS} marks={SAMPLE_RUN_MARKS} />
							{:else if item.slug === 'border-beam'}
								<BorderBeam />
							{:else if item.slug === 'svelte5-motion-lab'}
								<Svelte5MotionLab />
							{/if}
							{/key}
						</div>
					</article>
				{/each}
			</div>
		</div>
	</div>
</main>
