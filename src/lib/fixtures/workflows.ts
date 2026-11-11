/**
 * Sample data for the workflow components (orchestration, evaluation, queues and
 * tools). Import from `agents-kit-svelte/fixtures`; components never fall back to it.
 */
import type { ArtifactMetadata, ArtifactVersion } from '../agents-ui/AgentArtifact.svelte';
import type { EvalIteration } from '../agents-ui/AgentEvaluator.svelte';
import type { FormField } from '../agents-ui/AgentFormGenerator.svelte';
import type { IncidentEvent, OpsServiceMetric, OpsSignal } from '../agents-ui/AgentOpsMonitor.svelte';
import type { CommLogEntry, SubAgent } from '../agents-ui/AgentOrchestrator.svelte';
import type { ParallelLane } from '../agents-ui/AgentParallelProcessor.svelte';
import type { AgentRoute, RouteClassification, RoutingHistoryEntry } from '../agents-ui/AgentRoutingHub.svelte';
import type { WorkflowStep } from '../agents-ui/AgentSequentialWorkflow.svelte';
import type { AgentTask } from '../agents-ui/AgentTaskQueue.svelte';
import type { AgentTool } from '../agents-ui/AgentToolPalette.svelte';
import type { BlockedItem } from '../agents-ui/blocked-work';

/** Sample data for `AgentArtifact`. */
export const SAMPLE_ARTIFACT_VERSIONS: ArtifactVersion[] = [
	{
		id: 'v1',
		label: 'v1 · Initial Spec Draft',
		timestamp: '13:40',
		summary: 'Initial G0 browser read contract outline',
		content: [
			'Title: G0 Browser Read Contract',
			'Section: Scope & Provenance',
			'- Isolate /w sample routes from paired device authority',
			'- Require explicit provenance badge on every stream card',
			'- Keep installation tokens strictly in server memory'
		].join('\n')
	},
	{
		id: 'v2',
		label: 'v2 · Revision 3 Aligned',
		timestamp: '14:05',
		summary: 'Added WorkspaceSource stream invariants and referee checks',
		content: [
			'Title: G0 Browser Read Contract (Revision 3)',
			'Section: WorkspaceSource & Stream Invariants',
			'- Isolate /w sample routes from paired Companion authority',
			'- Require explicit provenance label on every board and run card',
			'- Verify reauthorization before idempotency lookup on all retries',
			'- Keep installation tokens in server memory with zero webhook writes'
		].join('\n')
	}
];

/** Sample data for `AgentEvaluator`. */
export const SAMPLE_EVAL_ITERATIONS: EvalIteration[] = [
	{
		id: 'iter-1',
		number: 1,
		output: 'Added retry handler in outbox service, checking revision before idempotency key.',
		score: 58,
		feedback:
			'Referee send-back: Idempotency lookup must precede new-intent revision checks per ENG-0001.',
		criteria: [
			{
				label: 'Authorization & Idempotency Order',
				score: 40,
				maxScore: 100,
				weight: 40,
				status: 'fail',
				note: 'Revision check ran before idempotency lookup.'
			},
			{
				label: 'Atomic Outbox & Journal Transaction',
				score: 82,
				maxScore: 100,
				weight: 35,
				status: 'warn',
				note: 'Journal write lacked rollback test coverage.'
			},
			{
				label: 'Svelte 5 Runes & Semantic Tokens',
				score: 95,
				maxScore: 100,
				weight: 25,
				status: 'pass',
				note: 'Zero legacy reactivity or hardcoded hex tokens.'
			}
		],
		status: 'failed'
	},
	{
		id: 'iter-2',
		number: 2,
		output:
			'Reordered domain pipeline: reauthorize session -> lookup idempotency key -> check revision -> atomic outbox commit.',
		score: 94,
		feedback:
			'Referee pass: All red-team invariants satisfied with deterministic SQLite fixture coverage.',
		criteria: [
			{
				label: 'Authorization & Idempotency Order',
				score: 96,
				maxScore: 100,
				weight: 40,
				status: 'pass',
				note: 'Verified replay returns stored effect prior to revision check.'
			},
			{
				label: 'Atomic Outbox & Journal Transaction',
				score: 92,
				maxScore: 100,
				weight: 35,
				status: 'pass',
				note: 'Effects, outbox, and journal commit in single transaction.'
			},
			{
				label: 'Svelte 5 Runes & Semantic Tokens',
				score: 95,
				maxScore: 100,
				weight: 25,
				status: 'pass',
				note: 'Passes static audit and typecheck.'
			}
		],
		status: 'passed'
	}
];

/** Sample data for `AgentFormGenerator`. */
export const SAMPLE_FORM_FIELDS: FormField[] = [
	{
		id: 'worktreeBranch',
		label: 'Worktree Branch Name',
		type: 'text',
		placeholder: 'trailside/card-191-attempt-1',
		required: true,
		defaultValue: 'trailside/card-191-attempt-1',
		validation: { minLength: 5, maxLength: 80 }
	},
	{
		id: 'agentId',
		label: 'Target Supported Agent',
		type: 'select',
		required: true,
		options: ['claude-code', 'codex', 'gemini'],
		defaultValue: 'claude-code'
	},
	{
		id: 'riskTier',
		label: 'Risk Tier Gate',
		type: 'select',
		required: true,
		options: ['T0', 'T1', 'T2', 'T3', 'T4'],
		defaultValue: 'T2'
	},
	{
		id: 'tokenBudget',
		label: 'Max Token Budget',
		type: 'number',
		required: true,
		defaultValue: 40000,
		validation: { min: 1000, max: 200000 }
	},
	{
		id: 'verificationPrompt',
		label: 'Verification Acceptance Instructions',
		type: 'textarea',
		placeholder: 'Describe the test suite and contract checks required…',
		required: true,
		defaultValue: 'Run corepack pnpm test and verify zero uncommitted schema diffs.',
		validation: { minLength: 10, maxLength: 500 }
	},
	{
		id: 'isolatedDb',
		label: 'Use disposable SQLite fixture database',
		type: 'checkbox',
		defaultValue: true
	}
];

/** Sample data for `AgentOpsMonitor`. */
export const SAMPLE_OPS_METRICS: OpsServiceMetric[] = [
	{
		label: 'P95 Stream Latency',
		value: '340 ms',
		threshold: '< 550 ms',
		trend: 'down'
	},
	{
		label: 'Token Throughput',
		value: '148 tok/s',
		threshold: '> 90 tok/s',
		trend: 'up'
	},
	{
		label: 'Tool Success Rate',
		value: '99.4%',
		threshold: '> 98.5%',
		trend: 'stable'
	},
	{
		label: 'Companion Heartbeat',
		value: '12 ms RTT',
		threshold: 'Bun 1.4.2',
		trend: 'stable'
	}
];

/** Sample data for `AgentOpsMonitor`. */
export const SAMPLE_OPS_SIGNALS: OpsSignal[] = [
	{
		id: 'sig-daemon',
		title: 'Companion Daemon · MacBook-Pro-M3',
		status: 'healthy',
		detail: 'Local WebSocket tunnel healthy; 2 isolated worktrees mounted under Connect consent.',
		owner: 'trailside up',
		lastUpdated: 'Just now'
	},
	{
		id: 'sig-context',
		title: 'Worktree B Context Window Pressure',
		status: 'warning',
		detail: 'Card 191 attempt 1 reached 78% of 200k context window during contract schema diff.',
		owner: 'Claude Code 1.0',
		lastUpdated: '2 min ago'
	},
	{
		id: 'sig-probe',
		title: 'Agent CLI Metadata Probe Gate',
		status: 'healthy',
		detail: 'Direct argv probe completed in 84 ms with zero credential reads.',
		owner: 'agents/probe.ts',
		lastUpdated: '5 min ago'
	}
];

/** Sample data for `AgentOpsMonitor`. */
export const SAMPLE_OPS_INCIDENTS: IncidentEvent[] = [
	{
		id: 'inc-1',
		timestamp: '13:58',
		summary: 'Auto-compacted conversation transcript on Card 188 worktree',
		actionNeeded: 'Resolved'
	},
	{
		id: 'inc-2',
		timestamp: '14:04',
		summary: 'Rate-limit backoff (1.2s) on secondary search subagent',
		actionNeeded: 'Monitoring'
	}
];

/** Sample data for `AgentOrchestrator`. */
export const SAMPLE_SUB_AGENTS: SubAgent[] = [
	{
		id: 'researcher',
		name: 'Repo Explorer',
		role: 'Codebase & Contract Discovery',
		model: 'Claude Code 1.0',
		status: 'completed',
		task: 'Inspect G0 schema definitions and locate outbox transaction boundaries',
		progress: 100,
		metrics: { tokens: 14200, budgetTokens: 20000, cost: '$0.04', latency: '9.4s' },
		logs: [
			'Scanned contracts/g0/src/index.ts and verified envelope versions.',
			'Mapped atomic outbox writer in apps/service/src/db/outbox.ts.',
			'Returned 4 contract invariants to Supervisor.'
		]
	},
	{
		id: 'implementer',
		name: 'Worktree Builder',
		role: 'TDD Patch Implementation',
		model: 'Claude Code 1.0',
		status: 'running',
		task: 'Implement idempotent retry handler before revision check in worktree',
		progress: 68,
		metrics: { tokens: 24800, budgetTokens: 40000, cost: '$0.08', latency: '18.2s' },
		logs: [
			'Created isolated branch trailside/card-191-attempt-1.',
			'Added failing unit test for duplicate idempotency key replay.',
			'Updating domain handler to reauthorize prior to lookup…'
		]
	},
	{
		id: 'verifier',
		name: 'Referee & Verifier',
		role: 'Independent Gate Evaluation',
		model: 'Codex 0.42',
		status: 'idle',
		task: 'Run contract export check and independent acceptance suite',
		progress: 0,
		metrics: { tokens: 0, budgetTokens: 15000, cost: '$0.00', latency: '—' },
		logs: ['Waiting for Worktree Builder handoff before starting referee checks.']
	}
];

/** Sample data for `AgentOrchestrator`. */
export const SAMPLE_COMM_LOG: CommLogEntry[] = [
	{
		id: 'log-1',
		timestamp: '14:02:11',
		from: 'Supervisor',
		to: 'Repo Explorer',
		message: 'Locate all idempotency lookup call sites and verify revision ordering.'
	},
	{
		id: 'log-2',
		timestamp: '14:02:20',
		from: 'Repo Explorer',
		to: 'Supervisor',
		message: 'Found 3 call sites; domain spec requires reauthorization before lookup.'
	},
	{
		id: 'log-3',
		timestamp: '14:02:22',
		from: 'Supervisor',
		to: 'Worktree Builder',
		message: 'Apply TDD patch on branch trailside/card-191-attempt-1 with 40k token budget.'
	}
];

/** Sample data for `AgentParallelProcessor`. */
export const SAMPLE_PARALLEL_LANES: ParallelLane[] = [
	{
		id: 'lane-contracts',
		label: 'Contract Schema Export & Diff',
		agentName: 'Claude Code Worker A',
		worktree: 'wt/contracts-check',
		status: 'done',
		progress: 100,
		output: 'Exported 14 JSON schemas with zero breaking wire changes.',
		tokens: 3420
	},
	{
		id: 'lane-domain',
		label: 'Domain Idempotency Unit Suite',
		agentName: 'Claude Code Worker B',
		worktree: 'wt/domain-tests',
		status: 'processing',
		progress: 72,
		output: 'Running 48 domain replay assertions across SQLite fixture states…',
		tokens: 5180
	},
	{
		id: 'lane-companion',
		label: 'Companion Bun Daemon Probe',
		agentName: 'Codex Worker C',
		worktree: 'wt/companion-probe',
		status: 'processing',
		progress: 45,
		output: 'Verifying direct argv probe bounds and timeout enforcement.',
		tokens: 2890
	},
	{
		id: 'lane-ui-audit',
		label: 'Svelte 5 Runes & Token Audit',
		agentName: 'Gemini Flash Worker D',
		worktree: 'wt/svelte5-audit',
		status: 'waiting',
		progress: 0,
		tokens: 0
	}
];

/** Sample data for `AgentRoutingHub`. */
export const SAMPLE_ROUTES: AgentRoute[] = [
	{
		id: 'claude-code',
		agentName: 'Claude Code 1.0',
		specialty: 'Multi-file TDD & Worktree Refactoring',
		matchScore: 96,
		status: 'selected',
		description:
			'Deep repository context, atomic database/outbox edits, and Svelte 5 Runes migration.'
	},
	{
		id: 'codex',
		agentName: 'Codex 0.42',
		specialty: 'Referee Verification & Contract Audits',
		matchScore: 78,
		status: 'available',
		description:
			'Fast deterministic static analysis, schema validation, and adversarial diff review.'
	},
	{
		id: 'gemini',
		agentName: 'Gemini 2.5 Pro',
		specialty: 'Long-Context Architecture & Spec Synthesis',
		matchScore: 64,
		status: 'available',
		description:
			'Cross-document ADR synthesis, large transcript analysis, and visual layout comparison.'
	}
];

/** Sample data for `AgentRoutingHub`. */
export const SAMPLE_ROUTE_CLASSIFICATION: RouteClassification = {
	intent: 'Multi-file TDD Implementation (Risk Tier T2)',
	confidence: 96,
	reasoning:
		'Task requires editing domain handlers and adding unit tests inside an isolated git worktree, matching Claude Code 1.0 capabilities.'
};

/** Sample data for `AgentRoutingHub`. */
export const SAMPLE_ROUTING_HISTORY: RoutingHistoryEntry[] = [
	{
		id: 'hist-1',
		query: 'Audit PR 204 against ENG-0001 boundary constraints',
		intent: 'Referee Review',
		agentName: 'Codex 0.42',
		timestamp: '3 min ago'
	},
	{
		id: 'hist-2',
		query: 'Compare G0 spec with M3 onboarding amendments',
		intent: 'Spec Synthesis',
		agentName: 'Gemini 2.5 Pro',
		timestamp: '14 min ago'
	}
];

/** Sample data for `AgentSequentialWorkflow`. */
export const SAMPLE_WORKFLOW_STEPS: WorkflowStep[] = [
	{
		id: 'spec-align',
		number: 1,
		title: 'Spec & ADR Gate Check',
		agentName: 'Claude Code Planner',
		gateDependency: 'Requires approved spec in docs/superpowers/specs',
		inputSummary: 'Card 191 requirements & ENG-0001 boundaries',
		outputSummary: 'Verified zero forbidden runtime capabilities; test plan locked.',
		status: 'completed',
		duration: '48s',
		tokens: 3820
	},
	{
		id: 'red-green-tdd',
		number: 2,
		title: 'Red-Green Worktree Implementation',
		agentName: 'Claude Code Builder',
		gateDependency: 'Depends on Step 01 · Spec & ADR Gate Check',
		inputSummary: 'Locked test plan and worktree branch',
		outputSummary: 'All 12 unit tests passing in isolated worktree.',
		status: 'completed',
		duration: '2m 14s',
		tokens: 9410
	},
	{
		id: 'contract-export',
		number: 3,
		title: 'Contract Schema Export & Verification',
		agentName: 'Companion Verifier',
		gateDependency: 'Depends on Step 02 · Red-Green Worktree Implementation',
		inputSummary: 'Updated domain and contract TypeScript definitions',
		outputSummary: 'Running corepack pnpm contracts:export and schema checksum check…',
		status: 'running',
		duration: '34s',
		tokens: 2150
	},
	{
		id: 'referee-review',
		number: 4,
		title: 'Independent Referee Scorecard',
		agentName: 'Codex Referee',
		gateDependency: 'Depends on Step 03 · Contract Schema Export',
		inputSummary: 'Worktree diff and verification evidence log',
		outputSummary: '',
		status: 'waiting'
	}
];

/** Sample data for `AgentTaskQueue`. */
export const SAMPLE_TASKS: AgentTask[] = [
	{
		id: 'task-191',
		title: 'Card 191 · Outbox Idempotency Replay Guard',
		description: 'Verify reauthorization happens prior to idempotency key lookup.',
		status: 'running',
		progress: 68,
		priority: 'high',
		tool: 'Claude Code · wt/card-191',
		updatedLabel: 'Updated 1m ago',
		estimatedDuration: '2m remaining',
		checkpoints: [
			{ id: 'cp-1', title: 'Create isolated git worktree', status: 'completed', timestamp: '14:01' },
			{ id: 'cp-2', title: 'Run domain replay unit suite', status: 'active', timestamp: '14:03' },
			{ id: 'cp-3', title: 'Export G0 JSON schemas', status: 'pending' }
		],
		metrics: { tokens: 18400, cost: '$0.06', confidence: 0.94 }
	},
	{
		id: 'task-194',
		title: 'Card 194 · SSR Interaction Readiness Audit',
		description: 'Ensure filter buttons preserve pre-hydration state across /w routes.',
		status: 'queued',
		priority: 'high',
		tool: 'Claude Code · wt/card-194',
		updatedLabel: 'Next in queue'
	},
	{
		id: 'task-198',
		title: 'Card 198 · Companion CLI Doctor Repair Check',
		description: 'Validate reversible repair checklist reporting to service.',
		status: 'paused',
		progress: 35,
		priority: 'medium',
		tool: 'Codex · wt/card-198',
		updatedLabel: 'Paused for human approval'
	},
	{
		id: 'task-185',
		title: 'Card 185 · M2-Lite Read-Only Board Sync',
		status: 'completed',
		progress: 100,
		priority: 'medium',
		tool: 'Claude Code · wt/card-185',
		updatedLabel: 'Completed 13:45'
	}
];

/** Sample data for `AgentToolPalette`. */
export const SAMPLE_TOOLS: AgentTool[] = [
	{
		id: 'mcp-worktree-create',
		name: 'worktree.create_isolated',
		description: 'Creates an isolated git worktree branch for a dispatched card attempt.',
		category: 'worktree',
		enabled: true,
		usageCount: 42,
		lastUsedLabel: '2m ago',
		parameters: [
			{ name: 'cardId', type: 'string', required: true, description: 'Card identifier' },
			{ name: 'attemptNumber', type: 'number', required: true, description: 'Attempt counter' }
		]
	},
	{
		id: 'mcp-contracts-export',
		name: 'contracts.export_g0_schema',
		description: 'Exports TypeScript G0 contracts into canonical JSON schema artifacts.',
		category: 'contracts',
		enabled: true,
		usageCount: 28,
		lastUsedLabel: '6m ago',
		parameters: [
			{ name: 'verifyClean', type: 'boolean', required: false, description: 'Fail on drift' }
		]
	},
	{
		id: 'mcp-companion-probe',
		name: 'companion.probe_agents',
		description:
			'Runs fixed read-only direct argv version probe for Claude Code, Codex, and Gemini.',
		category: 'companion',
		enabled: true,
		usageCount: 19,
		lastUsedLabel: '14m ago',
		parameters: [
			{ name: 'timeoutMs', type: 'number', required: false, description: 'Bounded timeout' }
		]
	},
	{
		id: 'mcp-verify-svelte5',
		name: 'verify.audit_svelte5_runes',
		description:
			'Audits all .svelte files for Runes compliance, Props typing, and semantic CSS tokens.',
		category: 'verification',
		enabled: true,
		usageCount: 64,
		lastUsedLabel: 'Just now',
		parameters: [
			{ name: 'directory', type: 'string', required: true, description: 'Source directory' }
		]
	},
	{
		id: 'mcp-db-fixture',
		name: 'db.reset_disposable_fixture',
		description: 'Resets the local disposable SQLite database and outbox journal state.',
		category: 'verification',
		enabled: false,
		usageCount: 11,
		lastUsedLabel: '1h ago',
		parameters: [
			{ name: 'seedSample', type: 'boolean', required: false, description: 'Seed sample rows' }
		]
	}
];

const SAMPLE_ARTIFACT_SCHEMA_JSON = JSON.stringify(
	{
		$schema: 'https://json-schema.org/draft/2020-12/schema',
		title: 'WorkspaceReadArtifact',
		type: 'object',
		required: ['versionId', 'provenance', 'invariants'],
		properties: {
			versionId: { type: 'string', enum: ['v1', 'v2'] },
			provenance: { type: 'string', const: 'sample-isolated' },
			invariants: { type: 'array', items: { type: 'string' } }
		}
	},
	null,
	2
);

/** Sample metadata for `AgentArtifact`. */
export const SAMPLE_ARTIFACT_METADATA: ArtifactMetadata = {
	model: 'Claude Code 1.0',
	generationTime: '1.8s',
	tokens: 1420,
	size: '2.4 KB',
	schemaJson: SAMPLE_ARTIFACT_SCHEMA_JSON
};

/** Sample data for `BlockedWorkList`: four stuck items, one with a confirmed danger action, one with no actions. */
export const SAMPLE_BLOCKED_ITEMS: BlockedItem[] = [
	{
		id: 'w-3412',
		ref: '#3412',
		title: 'Add rate limiting to the export endpoint',
		reason: { kind: 'unstarted', label: 'Not started for 40 min', since: 'Ready since 09:10' },
		actions: [{ id: 'start', label: 'Start now' }]
	},
	{
		id: 'w-3398',
		ref: '#3398',
		title: 'Move invoice totals to the new currency helper',
		reason: { kind: 'blocker-closed', label: 'Its blockers have closed', detail: '#3391 and #3395 merged this morning.' },
		actions: [
			{ id: 'release', label: 'Release' },
			{ id: 'park', label: 'Park it' }
		]
	},
	{
		id: 'w-3377',
		ref: '#3377',
		title: 'Retire the legacy webhook signer',
		reason: { kind: 'hold', label: 'Held after a failed run', detail: 'The last run failed twice on the same test.' },
		actions: [
			{ id: 'retry', label: 'Retry' },
			{ id: 'discard', label: 'Discard run', tone: 'danger', confirm: 'Discard the failed run and its branch? Its notes are kept, but the work is lost.' }
		]
	},
	{
		id: 'w-3350',
		ref: '#3350',
		title: 'Approve the production migration for team billing',
		reason: { kind: 'needs-person', label: 'Only you can land this' },
		actions: [],
		note: 'Open the pull request on the host to land it.'
	}
];
