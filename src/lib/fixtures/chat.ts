/**
 * Sample data for the chat and coding components, used by the showcase, docs and tests.
 * Import from `agents-kit-svelte/fixtures`. Components never fall back to it.
 */

import type { ActionReceiptData, CitedSource, DeviceApprovalDevice, WorkStep } from '../types';
import type { AutonomyLevel } from '../agents/level-dial';
import type { SidebarResource } from '../agents/AISidebar.svelte';
import type { SchemaParameterItem, SchemaPropertyItem } from '../ai-elements/SchemaDisplay.svelte';
import type { PlanMilestone } from '../ai-elements/PlanCard.svelte';
import type { PackageDependencyItem, PackageScriptItem } from '../ai-elements/PackageInfo.svelte';
import type { PromptSuggestionItem } from '../ai-elements/PromptSuggestions.svelte';
import type { VoiceDeviceOption, VoicePersonaOption } from '../ai-elements/VoiceWaveVisualizer.svelte';
import type { ChainOfThoughtStepItem } from '../ai-elements/ChainOfThought.svelte';
import type { EnvVariableEntry } from '../ai-elements/EnvironmentVariables.svelte';
import type { PreviewConsoleLog } from '../ai-elements/WebPreview.svelte';

/** Sample text for `MessageBubble`. */
export const SAMPLE_MESSAGE_TEXT =
	'Completed verification on the isolated worktree branch. All 19 unit and contract suites pass with zero regressions. Expanded logs include full unified diff hunks, schema validation traces, and referee sign-off details.';

/** Sample data for `AISidebar`. */
export const SAMPLE_SIDEBAR_RESOURCES: SidebarResource[] = [
	{
		id: 'wt-184',
		label: 'feat/issue-184-worktree',
		kind: 'worktree',
		pinned: true,
		badge: 'T2',
		children: [
			{
				id: 'src-agents',
				label: 'src/lib/agents',
				kind: 'folder',
				children: [
					{ id: 'file-sidebar', label: 'AISidebar.svelte', kind: 'file', badge: '+142' },
					{ id: 'file-approval', label: 'ApprovalCard.svelte', kind: 'file', badge: 'clean' }
				]
			},
			{
				id: 'file-spec',
				label: 'docs/specs/run-dispatch.md',
				kind: 'bookmark',
				pinned: true
			}
		]
	},
	{
		id: 'proj-contracts',
		label: 'contracts/g0',
		kind: 'project',
		children: [
			{ id: 'file-schema', label: 'schema/envelope.json', kind: 'file' },
			{ id: 'file-validator', label: 'src/validate.ts', kind: 'file' }
		]
	}
];

/** Sample data for `SchemaDisplay`. */
export const SAMPLE_SCHEMA_PARAMETERS: SchemaParameterItem[] = [
	{
		name: 'workspaceId',
		type: 'string',
		location: 'path',
		required: true,
		description: 'Unique identifier of the connected workspace.'
	},
	{
		name: 'includeJournal',
		type: 'boolean',
		location: 'query',
		required: false,
		description: 'Include atomic outbox and journal replay entries.'
	}
];

/** Sample data for `SchemaDisplay`. */
export const SAMPLE_SCHEMA_REQUEST_BODY: SchemaPropertyItem[] = [
	{
		name: 'cardId',
		type: 'string',
		required: true,
		description: 'Target board card identifier for the dispatched workflow.'
	},
	{
		name: 'worktreeConfig',
		type: 'object',
		required: true,
		description: 'Isolated git worktree settings for the run.',
		properties: [
			{
				name: 'baseBranch',
				type: 'string',
				required: true,
				description: 'Base branch to fork the worktree from (e.g., main).'
			},
			{
				name: 'agentId',
				type: 'enum(claude-code | codex)',
				required: true,
				description: 'Qualified local agent binary to execute.'
			}
		]
	}
];

/** Sample data for `SchemaDisplay`. */
export const SAMPLE_SCHEMA_RESPONSE_BODY: SchemaPropertyItem[] = [
	{
		name: 'runId',
		type: 'string',
		required: true,
		description: 'Idempotent run session identifier.'
	},
	{
		name: 'status',
		type: 'enum(queued | running | complete)',
		required: true,
		description: 'Initial execution status.'
	}
];

/** Sample data for `PlanCard`. */
export const SAMPLE_PLAN_MILESTONES: PlanMilestone[] = [
	{
		id: 'ms-1',
		title: 'Extract pure domain validators and diff line parser',
		detail: 'Ensure zero database IO inside pure validation helpers and add unit test coverage.',
		files: ['src/lib/state/chat-helpers.ts', 'tests/chat-helpers.test.ts'],
		status: 'completed'
	},
	{
		id: 'ms-2',
		title: 'Port AI Elements and Prompt Kit surfaces to Svelte 5 Runes',
		detail: 'Convert React context providers into typed $props() and $state() primitives.',
		files: ['src/lib/ai-elements/PlanCard.svelte', 'src/lib/ai-elements/ChainOfThought.svelte'],
		status: 'in-progress'
	},
	{
		id: 'ms-3',
		title: 'Verify semantic OKLCH design tokens across light and dark modes',
		detail: 'Run static audit test suite and confirm zero hardcoded hex color literals.',
		files: ['src/app.css', 'tests/svelte5-audit.test.ts'],
		status: 'pending'
	}
];

/** Sample data for `PackageInfo`. */
export const SAMPLE_PACKAGE_SCRIPTS: PackageScriptItem[] = [
	{ name: 'dev', command: 'vite dev' },
	{ name: 'check', command: 'svelte-kit sync && svelte-check --tsconfig ./tsconfig.json' },
	{ name: 'test', command: 'node --experimental-strip-types --test tests/*.test.ts' }
];

/** Sample data for `PackageInfo`. */
export const SAMPLE_PACKAGE_DEPENDENCIES: PackageDependencyItem[] = [
	{ name: 'svelte', version: '^5.55.1' },
	{ name: '@sveltejs/kit', version: '^2.57.0' },
	{ name: 'tailwindcss', version: '^4.2.2', dev: true },
	{ name: 'typescript', version: '^6.0.2', dev: true }
];

/** Sample data for `PromptSuggestions`. */
export const SAMPLE_PROMPT_SUGGESTIONS: PromptSuggestionItem[] = [
	{
		id: 'sug-1',
		category: 'inspect',
		label: 'Audit Svelte 5 Runes compliance',
		prompt: 'Scan all components in src/lib/ and verify zero legacy Svelte 4 prop declarations or reactive statements.'
	},
	{
		id: 'sug-2',
		category: 'implement',
		label: 'Generate isolated worktree plan',
		prompt: 'Draft a T2 execution plan with file targets and test verification gates.'
	},
	{
		id: 'sug-3',
		category: 'verify',
		label: 'Run referee contract check',
		prompt: 'Execute the unit test suite and validate OKLCH semantic token contrast.'
	},
	{
		id: 'sug-4',
		category: 'review',
		label: 'Summarize pull request diff',
		prompt: 'Inspect changed hunks and highlight potential SSR hydration risks.'
	}
];

/** Sample data for `VoiceWaveVisualizer`. */
export const SAMPLE_VOICE_DEVICES: VoiceDeviceOption[] = [
	{ id: 'mic-macbook-pro', label: 'MacBook Pro Studio Mic' },
	{ id: 'mic-shure-mv7', label: 'Shure MV7 USB Podcast Mic' },
	{ id: 'mic-airpods', label: 'AirPods Pro Hands-Free' }
];

/** Sample data for `VoiceWaveVisualizer`. */
export const SAMPLE_VOICE_PERSONAS: VoicePersonaOption[] = [
	{ id: 'sol', name: 'Sol', accent: 'American', tone: 'Calm & direct' },
	{ id: 'vale', name: 'Vale', accent: 'British', tone: 'Crisp & analytical' },
	{ id: 'ember', name: 'Ember', accent: 'Canadian', tone: 'Warm & collaborative' }
];

/** Sample data for `StackTrace`. */
export const SAMPLE_STACK_TRACE = [
	'TypeError: Cannot read properties of undefined (reading "worktreeBranch")',
	'    at resolveRunContext (src/lib/runtime/worktree-dispatcher.ts:48:23)',
	'    at dispatchWorkflowRun (src/lib/runtime/runner.ts:112:15)',
	'    at async MessagePort.handleIncomingCommand (src/lib/server/gateway.ts:84:9)',
	'    at async Promise.all (index 0)',
	'    at async processTicksAndRejections (node:internal/process/task_queues:95:5)',
	'    at async ViteNodeRunner.executeFile (node_modules/vite-node/dist/client.mjs:362:11)'
].join('\n');

/** Sample data for `StackTrace`. */
export const SAMPLE_STACK_SNIPPET = {
	filePath: 'src/lib/runtime/worktree-dispatcher.ts',
	startLine: 45,
	highlightLine: 48,
	lines: [
		'export function resolveRunContext(session: WorkspaceSession) {',
		'  const activeComputer = session.connectedComputer;',
		'  const branch = activeComputer.worktreeBranch.trim();',
		'  return { branch, computerId: activeComputer.id };',
		'}'
	]
};

/** Sample data for `ChainOfThought`. */
export const SAMPLE_CHAIN_OF_THOUGHT: ChainOfThoughtStepItem[] = [
	{
		id: 'cot-1',
		label: 'Inspecting workspace contract and route boundaries',
		description: 'Verified read-only repository session rules and G0 stream schema.',
		durationMs: 420,
		confidence: 0.98,
		tools: ['read_file', 'grep_search'],
		sources: ['contracts/g0/schema', 'src/lib/types.ts'],
		status: 'complete'
	},
	{
		id: 'cot-2',
		label: 'Synthesizing Svelte 5 Runes state transition graph',
		description: 'Mapped controllable disclosure state and derived token counters.',
		durationMs: 890,
		confidence: 0.94,
		tools: ['ast_check', 'svelte_compile'],
		sources: ['src/lib/state/chat-helpers.ts'],
		status: 'complete'
	},
	{
		id: 'cot-3',
		label: 'Validating semantic CSS token contrast in dark and light themes',
		description: 'Checking OKLCH surface contrast ratios and reduced-motion fallbacks.',
		durationMs: 310,
		confidence: 0.91,
		tools: ['audit_tokens'],
		status: 'active'
	}
];

/** Sample data for `EnvironmentVariables`. */
export const SAMPLE_ENV_VARIABLES: EnvVariableEntry[] = [
	{
		name: 'TRAILSIDE_GATEWAY_URL',
		value: 'wss://gateway.trailside.dev/v1/stream',
		required: true,
		scope: 'runtime',
		description: 'WebSocket endpoint for Companion heartbeat and run events.'
	},
	{
		name: 'DATABASE_URL',
		value: 'postgres://neondb_owner:ep_fixture_token@ep-cool-meadow.us-east-2.aws.neon.tech/trailside',
		required: true,
		scope: 'secret',
		description: 'Disposable fixture Postgres connection string.'
	},
	{
		name: 'GITHUB_APP_ID',
		value: '948210',
		required: true,
		scope: 'runtime',
		description: 'Read-only GitHub App identifier for board synchronization.'
	},
	{
		name: 'TRAILSIDE_WORKTREE_ROOT',
		value: '/Users/shared/.trailside/worktrees',
		required: false,
		scope: 'build',
		description: 'Local directory where isolated run worktrees are checked out.'
	}
];

/** Sample data for `WebPreview`. */
export const SAMPLE_PREVIEW_LOGS: PreviewConsoleLog[] = [
	{
		id: 'log-1',
		level: 'log',
		message: '[HMR] Svelte 5 Runes boundary connected (localhost:5173/w/board)',
		timestamp: '14:22:08'
	},
	{
		id: 'log-2',
		level: 'warn',
		message: '[SSR] Restored workspace filter state before client hydration completed',
		timestamp: '14:22:09'
	},
	{
		id: 'log-3',
		level: 'log',
		message: '[Stream] Connected to G0 read contract event source (revision 18)',
		timestamp: '14:22:11'
	}
];

/** Sample steps for `AgentWorkTrace`: an agent fixing a failed e2e check. */
export const SAMPLE_WORK_STEPS: WorkStep[] = [
	{ id: 'w1', label: 'Checkout sent you to sign in after a refresh', status: 'done' },
	{ id: 'w2', label: 'The redirect drops the refreshed cookie', status: 'done', files: ['src/middleware.ts', 'e2e/checkout.spec.ts'] },
	{ id: 'w3', label: 'Edited middleware.ts', kind: 'edit', status: 'done' },
	{ id: 'w4', label: '12 e2e tests passed', kind: 'run', status: 'done', nested: true },
	{ id: 'w5', label: 'Pushed 4a1c9e to #128', kind: 'push', status: 'done' },
	{ id: 'w6', label: 'Fixed the checkout test', detail: 'Pushed 4a1c9e', kind: 'result', status: 'done' }
];

/** The moment the sample presence banners are drawn at. */
export const SAMPLE_PRESENCE_NOW = '2026-11-11T02:22:00Z';

/** When the sample operator went offline: 12 minutes before `SAMPLE_PRESENCE_NOW`. */
export const SAMPLE_PRESENCE_SINCE = '2026-11-11T02:10:00Z';
/** The time `SAMPLE_RECEIPTS` is read at. */
export const SAMPLE_RECEIPTS_NOW = '2026-11-11T12:00:00Z';

/** Sample receipts for `ActionReceipt`: three done (one with Undo) and a refused merge. */
export const SAMPLE_RECEIPTS: ActionReceiptData[] = [
	{
		id: 'r1',
		action: 'Re-offered',
		target: { label: '#3398 Pairing copy', id: '3398' },
		outcome: 'done',
		actor: 'Operator',
		at: '2026-11-11T11:56:00Z',
		reason: 'Its runner went offline, so the card went back to the queue.'
	},
	{
		id: 'r2',
		action: 'Released',
		target: { label: '#3431 Retry the export job', id: '3431' },
		outcome: 'done',
		actor: 'Operator',
		at: '2026-11-11T11:40:00Z'
	},
	{
		id: 'r3',
		action: 'Parked',
		target: { label: '#3412 Fix sign-in redirect', id: '3412' },
		outcome: 'done',
		actor: 'You',
		at: '2026-11-11T11:59:00Z',
		undoable: true,
		run: { id: 'run-88', label: 'Run 88' }
	},
	{
		id: 'r4',
		action: 'Merge',
		target: { label: 'PR #212 Add retry to export', id: '212' },
		outcome: 'refused',
		reason: "merging is not on the operator's list",
		actor: 'Operator',
		at: '2026-11-11T11:30:00Z',
		run: { id: 'run-85', label: 'Run 85' }
	}
];
/** Sample data for `LevelDial`: an agent that opens and merges pull requests. */
export const SAMPLE_AUTONOMY_LEVELS: AutonomyLevel[] = [
	{
		id: 'careful',
		label: 'Careful',
		summary: 'Works on a branch and asks before anything leaves it.',
		allows: ['Read the repository', 'Commit to its own branch'],
		asks: ['Open a pull request', 'Merge a pull request', 'Change protected files']
	},
	{
		id: 'balanced',
		label: 'Balanced',
		summary: 'Opens pull requests itself; you still approve every merge.',
		allows: ['Read the repository', 'Commit to its own branch', 'Open a pull request'],
		asks: ['Merge a pull request', 'Change protected files']
	},
	{
		id: 'trusted',
		label: 'Trusted',
		summary: 'Merges its own pull requests once checks are green.',
		allows: [
			'Read the repository',
			'Commit to its own branch',
			'Open a pull request',
			'Merge a pull request with green checks'
		],
		asks: ['Merge with failing checks', 'Change protected files']
	},
	{
		id: 'autopilot',
		label: 'Autopilot',
		summary: 'Merges and ships without waiting for you.',
		allows: [
			'Read the repository',
			'Commit to its own branch',
			'Open a pull request',
			'Merge a pull request with green checks',
			'Merge with failing checks'
		],
		asks: ['Change protected files']
	}
];

/** Sample data for `RiskToggle`. */
export const SAMPLE_RISK_TOGGLE = {
	label: 'Merge protected changes without asking',
	description: 'Agents on this devbox can merge changes to protected files on their own.',
	scope: 'devbox',
	risk: {
		title: 'Protected files guard releases and secrets',
		points: [
			'A bad merge to a protected file can break every build.',
			'Changes go live without a person reading them first.',
			'Undoing a merge means a new pull request, not a button.'
		],
		acknowledge: 'I understand agents can merge protected changes without asking me.'
	}
};
/** Reference time for the `DeviceApprovalCard` sample. */
export const SAMPLE_DEVICE_NOW = '2026-11-11T09:00:00Z';

/** Sample device for `DeviceApprovalCard`: a phone asking to act with the same rights. */
export const SAMPLE_APPROVAL_DEVICE: DeviceApprovalDevice = {
	name: 'Pixel 9',
	kind: 'phone',
	platform: 'Android 16',
	location: 'Berlin, Germany'
};

/** Match code shown on both screens in the `DeviceApprovalCard` sample. */
export const SAMPLE_APPROVAL_CODE = '482 913';

/** Request time, expiry and abilities for the `DeviceApprovalCard` sample (expires 4 minutes after `SAMPLE_DEVICE_NOW`). */
export const SAMPLE_APPROVAL_REQUESTED_AT = '2026-11-11T08:59:30Z';
export const SAMPLE_APPROVAL_EXPIRES_AT = '2026-11-11T09:04:00Z';
export const SAMPLE_APPROVAL_GRANTS: string[] = [
	'See your agents and their runs',
	'Approve or stop work on your behalf',
	'Start new runs on your repositories'
];

/** Sample question for `CitedAnswer`. */
export const SAMPLE_CITED_QUESTION = 'Should the retry button show on cancelled runs?';

export const SAMPLE_CITED_ANSWER =
	'No. The plan limits Retry to failed runs, and says a cancelled run is restarted from the board instead, so showing Retry there would create a second way to do the same thing.';

/** Two quotes from a plan document, both found in the source. */
export const SAMPLE_CITED_SOURCES: CitedSource[] = [
	{
		id: 'plan-retry',
		title: 'Run controls plan',
		location: 'docs/plans/run-controls.md, section 3.2',
		href: 'https://example.com/plans/run-controls#retry',
		quote: 'Retry is offered on failed runs only. A run that ended any other way does not show it.',
		check: 'verified'
	},
	{
		id: 'plan-cancel',
		title: 'Run controls plan',
		location: 'docs/plans/run-controls.md, section 4.1',
		quote: 'A cancelled run is restarted from its card on the board, which keeps one history per card.',
		check: 'verified'
	}
];

/** Same answer, but the second quote could not be found in its source. */
export const SAMPLE_CITED_SOURCES_MISMATCH: CitedSource[] = [
	SAMPLE_CITED_SOURCES[0],
	{
		...SAMPLE_CITED_SOURCES[1],
		quote: 'Cancelled runs show Retry so that people can restart them in one tap.',
		check: 'mismatch'
	}
];

/** Who asked the `CitedAnswer` sample question. */
export const SAMPLE_CITED_ASKED_BY = 'Builder on card #3412';
