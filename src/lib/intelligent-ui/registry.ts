import type { Component } from 'svelte';
import AgentActivity from '../agents/AgentActivity.svelte';
import ApprovalCard from '../agents/ApprovalCard.svelte';
import CodeBlock from '../agents/CodeBlock.svelte';
import FileDiff from '../agents/FileDiff.svelte';
import TodoList from '../agents/TodoList.svelte';
import ToolApproval from '../agents/ToolApproval.svelte';
import ToolResult from '../agents/ToolResult.svelte';
import AgentEvaluator from '../agents-ui/AgentEvaluator.svelte';
import AgentOrchestrator from '../agents-ui/AgentOrchestrator.svelte';
import SchemaDisplay from '../ai-elements/SchemaDisplay.svelte';
import StackTrace from '../ai-elements/StackTrace.svelte';
import DiffTable from '../beautiful/DiffTable.svelte';
import Flowchart from '../beautiful/Flowchart.svelte';
import InsightCards from '../beautiful/InsightCards.svelte';
import RecommendationCard from '../beautiful/RecommendationCard.svelte';
import GitHubChecksPanel from '../github/GitHubChecksPanel.svelte';
import GitHubCommitCard from '../github/GitHubCommitCard.svelte';
import GitHubIssueCard from '../github/GitHubIssueCard.svelte';
import GitHubPullRequestCard from '../github/GitHubPullRequestCard.svelte';
import AgentGenerativeSurface from './AgentGenerativeSurface.svelte';
import AgentHandoffGantt from '../charts/AgentHandoffGantt.svelte';
import AgentWorkTrace from '../agents/AgentWorkTrace.svelte';
import GitHubChecksWaterfall from '../github/GitHubChecksWaterfall.svelte';
import GitHubPrActionBar from '../github/GitHubPrActionBar.svelte';
import GitHubPullRequestGraph from '../github/GitHubPullRequestGraph.svelte';
import GenerativeChart from '../charts/GenerativeChart.svelte';
import ModelPhaseStream from '../charts/ModelPhaseStream.svelte';
import FleetStatus from '../agents-ui/FleetStatus.svelte';
import ActionReceipt from '../agents/ActionReceipt.svelte';
import FeatureCard from '../charts/FeatureCard.svelte';
import FeatureLineage from '../charts/FeatureLineage.svelte';
import FeatureTimeline from '../charts/FeatureTimeline.svelte';
import RunReplayScrubber from '../charts/RunReplayScrubber.svelte';
import TokenBurnChart from '../charts/TokenBurnChart.svelte';

/** Sends an intent from a rendered node back to the renderer's `onIntent`. */
export type UIIntentEmitter = (action: string, detail?: string) => void;

/**
 * How `IntelligentUIRenderer` renders one node type.
 *
 * By default the node's `props` are passed straight to `component`. Give `props` to rename
 * fields, add defaults or wire callbacks to `emit`, which reaches the renderer's `onIntent`.
 */
export interface UIRegistryEntry {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: Component<any>;
	/** Props the node must carry; without them the renderer shows a short note instead. */
	required?: string[];
	props?: (props: Record<string, unknown>, emit: UIIntentEmitter) => Record<string, unknown>;
}

/** Node type → how to render it. */
export type UIRegistry = Record<string, UIRegistryEntry>;

/**
 * Types a registry so mistakes surface where you write it. Pass the result to
 * `<IntelligentUIRenderer registry={...} />`; it is merged over the built-in entries, so you
 * can add node types or replace ours.
 *
 * ```ts
 * const registry = defineUIRegistry({
 *   'weather-card': { component: WeatherCard, required: ['city'] },
 *   'todo-list': { component: MyTodoList }
 * });
 * ```
 */
export function defineUIRegistry<R extends UIRegistry>(registry: R): R {
	return registry;
}

/** The node types `IntelligentUIRenderer` understands out of the box. */
export const defaultUIRegistry: UIRegistry = {
	'agent-activity': { component: AgentActivity, required: ['items'] },
	'todo-list': { component: TodoList, required: ['items'] },
	'tool-approval': {
		component: ToolApproval,
		required: ['tool'],
		props: (props, emit) => ({
			...props,
			onApprove: () => emit('approve'),
			onDeny: () => emit('deny')
		})
	},
	'tool-result': { component: ToolResult, required: ['tool', 'output'] },
	'file-diff': { component: FileDiff, required: ['filename', 'patch'] },
	'code-block': {
		component: CodeBlock,
		// With no `code`, show the node's own props as JSON: handy while designing a schema.
		props: (props) => ({
			language: 'json',
			...props,
			code: typeof props.code === 'string' ? props.code : JSON.stringify(props, null, 2)
		})
	},
	'approval-card': {
		component: ApprovalCard,
		required: ['title', 'questions'],
		props: (props, emit) => ({
			...props,
			onSubmit: (answers: unknown) => emit('submit', JSON.stringify(answers))
		})
	},
	'github-issue-card': {
		component: GitHubIssueCard,
		required: ['issue'],
		props: (props, emit) => ({
			...props,
			onDispatchRun: (num: number) => emit('dispatch-issue', String(num))
		})
	},
	'github-pr-card': {
		component: GitHubPullRequestCard,
		required: ['pr'],
		props: (props, emit) => ({
			...props,
			onApproveMerge: (num: number) => emit('approve-pr', String(num))
		})
	},
	'github-commit-card': { component: GitHubCommitCard, required: ['commit'] },
	'github-checks-panel': {
		component: GitHubChecksPanel,
		props: (props, emit) => ({
			...props,
			onFixWithAgent: (id: string) => emit('fix-check', id)
		})
	},
	'recommendation-card': { component: RecommendationCard, required: ['title'] },
	'diff-table': { component: DiffTable },
	'insight-cards': { component: InsightCards },
	flowchart: { component: Flowchart },
	'agent-orchestrator': { component: AgentOrchestrator, required: ['orchestratorName'] },
	'agent-evaluator': { component: AgentEvaluator },
	'stack-trace': { component: StackTrace, required: ['trace'] },
	'schema-display': { component: SchemaDisplay, required: ['path'] },
	'generative-chart': {
		component: GenerativeChart,
		required: ['spec'],
		props: (props, emit) => ({
			...props,
			onSelectPoint: (point: { x: string | number; y: number; series: string }) =>
				emit('select-point', `${point.series} at ${point.x}: ${point.y}`)
		})
	},
	'agent-handoff-gantt': {
		component: AgentHandoffGantt,
		required: ['lanes', 'spans'],
		props: (props, emit) => ({
			...props,
			onSelectSpan: (span: { id: string }) => emit('select-span', span.id),
			onSelectHandoff: (handoff: { id: string }) => emit('select-handoff', handoff.id)
		})
	},
	'model-phase-stream': {
		component: ModelPhaseStream,
		required: ['phases', 'series'],
		props: (props, emit) => ({
			...props,
			onSelectEvent: (event: { id: string }) => emit('select-event', event.id),
			onSelectPhase: (phase: { id: string }) => emit('select-phase', phase.id)
		})
	},
	'github-pr-action-bar': {
		component: GitHubPrActionBar,
		required: ['diff'],
		props: (props, emit) => ({
			...props,
			onCreate: () => emit('create-pr'),
			onOpenPr: (prNumber: number) => emit('open-pr', String(prNumber)),
			onSelectFile: (path: string) => emit('open-file', path)
		})
	},
	'github-pr-graph': {
		component: GitHubPullRequestGraph,
		required: ['title', 'number', 'lanes', 'commits'],
		props: (props, emit) => ({
			...props,
			onSelectCommit: (commit: { sha: string }) => emit('open-commit', commit.sha)
		})
	},
	'github-checks-waterfall': {
		component: GitHubChecksWaterfall,
		required: ['prNumber', 'commit', 'checks'],
		props: (props, emit) => ({
			...props,
			onFix: (failed: { id: string }[]) => emit('fix-check', failed.map((c) => c.id).join(',')),
			onMerge: () => emit('merge-pr'),
			onSelectCheck: (check: { id: string }) => emit('open-check', check.id)
		})
	},
	'agent-work-trace': {
		component: AgentWorkTrace,
		required: ['steps'],
		props: (props, emit) => ({
			...props,
			onSelectFile: (path: string) => emit('open-file', path)
		})
	},
	'fleet-status': {
		component: FleetStatus,
		required: ['machines'],
		props: (props, emit) => ({
			...props,
			onSelectMachine: (machine: { id: string }) => emit('open-machine', machine.id),
			onSelectWork: (work: { id: string }, machine: { id: string }) => emit('open-work', `${machine.id}:${work.id}`)
		})
	},
	'action-receipt': {
		component: ActionReceipt,
		required: ['action', 'target', 'outcome'],
		props: (props, emit) => ({
			...props,
			onOpenTarget: (target: { id?: string; label: string }) => emit('open-target', target.id ?? target.label),
			onOpenRun: (run: { id: string }) => emit('open-run', run.id),
			onUndo: (target: { id?: string; label: string }) => emit('undo', target.id ?? target.label)
		})
	},
	'feature-card': {
		component: FeatureCard,
		required: ['feature'],
		props: (props, emit) => ({
			...props,
			onOpen: (feature: { id: string }) => emit('open-feature', feature.id),
			onSelectCards: (state: string) => emit('select-cards', state)
		})
	},
	'feature-lineage': {
		component: FeatureLineage,
		required: ['nodes', 'edges'],
		props: (props, emit) => ({
			...props,
			onSelectNode: (node: { id: string }) => emit('select-node', node.id)
		})
	},
	'feature-timeline': {
		component: FeatureTimeline,
		required: ['items', 'today'],
		props: (props, emit) => ({
			...props,
			onSelectItem: (item: { id: string }) => emit('select-item', item.id),
			onSelectMilestone: (milestone: { id: string }) => emit('select-milestone', milestone.id)
		})
	},
	'token-burn-chart': {
		component: TokenBurnChart,
		required: ['points'],
		props: (props, emit) => ({
			...props,
			onSelectMark: (mark: { id: string }) => emit('select-mark', mark.id)
		})
	},
	'run-replay-scrubber': {
		component: RunReplayScrubber,
		required: ['duration'],
		props: (props, emit) => ({
			...props,
			onSelectMark: (mark: { id: string }) => emit('select-mark', mark.id)
		})
	},
	'generative-surface': {
		component: AgentGenerativeSurface,
		required: ['content'],
		props: (props, emit) => ({
			...props,
			onAction: (action: string, id?: string) => emit(action, id)
		})
	}
};
