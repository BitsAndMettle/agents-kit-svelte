export type ActivityItemStatus = 'running' | 'complete' | 'error';

export type ActivityItem =
	| {
			id: string;
			type: 'text';
			label: string;
			status?: ActivityItemStatus;
	  }
	| {
			id: string;
			type: 'tool';
			label: string;
			target?: string;
			meta?: string;
			additions?: number;
			deletions?: number;
			status: ActivityItemStatus;
	  }
	| {
			id: string;
			type: 'search';
			label: string;
			target?: string;
			meta?: string;
			status: ActivityItemStatus;
	  }
	| {
			id: string;
			type: 'step';
			label: string;
			target?: string;
			meta?: string;
			status: ActivityItemStatus;
	  };

export type ActivityStatus = 'working' | 'complete';

export type TodoItemStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';

export interface TodoItem {
	id: string;
	label: string;
	detail?: string;
	status: TodoItemStatus;
}

export type ToolApprovalStatus =
	| 'pending'
	| 'approving'
	| 'approved'
	| 'running'
	| 'complete'
	| 'denied'
	| 'error';

export interface ToolApprovalParam {
	label: string;
	value: string;
	code?: boolean;
}

export type ToolResultStatus = 'running' | 'success' | 'error' | 'cancelled';

export type FileDiffStatus = 'streaming' | 'complete';

export type DiffLineKind = 'hunk' | 'add' | 'delete' | 'context';

export interface DiffLine {
	id: string;
	kind: DiffLineKind;
	oldNumber?: number;
	newNumber?: number;
	content: string;
}

export interface ParsedDiff {
	lines: DiffLine[];
	additions: number;
	deletions: number;
}

export interface CitationItem {
	id: string;
	title: string;
	domain?: string;
	url?: string;
}

export interface ApprovalQuestionOption {
	id: string;
	label: string;
	description?: string;
}

export interface ApprovalQuestion {
	id: string;
	question: string;
	options: ApprovalQuestionOption[];
	multiple?: boolean;
	allowCustom?: boolean;
	customPlaceholder?: string;
	required?: boolean;
}

export type ApprovalCardAnswers = Record<string, string[]>;

export interface ContextSourceItem {
	id: string;
	label: string;
	tokens: number;
	category: 'system' | 'worktree' | 'conversation' | 'tools';
}

export interface CheckpointEntry {
	id: string;
	title: string;
	description: string;
	commitSha: string;
	worktreeBranch: string;
	timestamp: string;
	filesChanged: number;
	restorable?: boolean;
}

/** An agent id. The built-in names are suggestions; any string works. */
export type SupportedAgentId = 'claude-code' | 'codex' | 'gemini' | (string & {});

export interface SupportedAgentOption {
	id: SupportedAgentId;
	label: string;
	version: string;
	signedIn: boolean;
}

export type RiskTier = 'T0' | 'T1' | 'T2' | 'T3' | 'T4';

export interface TrailsideRunContext {
	cardId: string;
	cardTitle: string;
	attemptNumber: number;
	computerName: string;
	computerStatus: 'Connected' | 'Offline' | 'Busy';
	worktreeBranch: string;
	agent: SupportedAgentOption;
	skillName: string;
	riskTier: RiskTier;
	usedTokens: number;
	maxTokens: number;
}

// --- GitHub Card & Layout Types ---

export type GitHubIssueState = 'open' | 'in-progress' | 'ready-for-human' | 'closed';

export interface GitHubLabel {
	name: string;
	tone: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
}

export interface GitHubIssueData {
	number: number;
	title: string;
	repo: string;
	state: GitHubIssueState;
	author: string;
	createdAt: string;
	labels: GitHubLabel[];
	riskTier?: RiskTier;
	size?: 'XS' | 'S' | 'M' | 'L';
	assignedAgent?: string;
	attemptNumber?: number;
	worktreeBranch?: string;
	linkedPrNumber?: number;
	criteriaCompleted?: number;
	criteriaTotal?: number;
	summary?: string;
}

export type GitHubPRState = 'open' | 'draft' | 'merged' | 'closed';

export interface GitHubCheckItem {
	id: string;
	name: string;
	workflow: string;
	status: 'passed' | 'failed' | 'running' | 'skipped';
	duration: string;
	summary?: string;
}

/** A stat tile in `GitHubBentoLayout`. */
export interface GitHubBentoStat {
	label: string;
	value: string;
	detail?: string;
	tone?: 'neutral' | 'success';
}

export interface GitHubPullRequestData {
	number: number;
	title: string;
	repo: string;
	state: GitHubPRState;
	author: string;
	headBranch: string;
	baseBranch: string;
	additions: number;
	deletions: number;
	changedFilesCount: number;
	/** Optional review-gate fields. The card shows them only when present. */
	riskTier?: RiskTier;
	refereeStatus?: 'pass' | 'send-back' | 'pending';
	refereeSummary?: string;
	checks: GitHubCheckItem[];
	updatedAt: string;
	linkedIssueNumber?: number;
}

export interface GitHubCommitData {
	sha: string;
	message: string;
	author: string;
	timestamp: string;
	branch: string;
	verified?: boolean;
	additions: number;
	deletions: number;
	files: { path: string; status: 'added' | 'modified' | 'deleted'; additions: number; deletions: number }[];
}

export interface GitHubReviewComment {
	id: string;
	author: string;
	role: string;
	timestamp: string;
	body: string;
	suggestedPatch?: string;
}

export interface GitHubReviewThreadData {
	id: string;
	filePath: string;
	lineRange: string;
	diffHunk: string;
	resolved: boolean;
	comments: GitHubReviewComment[];
}

// --- GitHub Lifecycle Types (intake → release → incident) ---

export type GitHubLifecycleStageId =
	| 'issue'
	| 'triage'
	| 'branch'
	| 'commits'
	| 'pull-request'
	| 'review'
	| 'checks'
	| 'merge'
	| 'deploy'
	| 'release';

export interface GitHubLifecycleStage {
	id: GitHubLifecycleStageId;
	label: string;
	actor: string;
	detail: string;
	timestamp: string;
}

export interface GitHubTriageSuggestion {
	id: string;
	kind: 'type' | 'priority' | 'area' | 'assignee' | 'milestone';
	label: string;
	value: string;
	confidence: number;
	tone: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
}

export interface GitHubTriageIssue {
	number: number;
	title: string;
	author: string;
	openedAt: string;
	body: string;
	suggestions: GitHubTriageSuggestion[];
	duplicate?: { number: number; title: string; similarity: number };
}

export interface GitHubBranchCommit {
	sha: string;
	message: string;
	author: string;
}

export interface GitHubBranchData {
	name: string;
	base: string;
	baseSha: string;
	linkedIssueNumber?: number;
	behind: number;
	commits: GitHubBranchCommit[];
	protections: { id: string; label: string; satisfied: boolean }[];
}

export interface GitHubDiffLine {
	kind: 'context' | 'add' | 'del' | 'hunk';
	oldLine?: number;
	newLine?: number;
	text: string;
}

export interface GitHubReviewFile {
	path: string;
	additions: number;
	deletions: number;
	lines: GitHubDiffLine[];
	comment?: { afterLine: number; author: string; body: string };
}

export type GitHubReviewVerdict = 'approve' | 'comment' | 'request-changes';

export interface GitHubMergeQueueEntry {
	number: number;
	title: string;
	author: string;
	checksTotal: number;
}

export type GitHubDeploymentStatus = 'queued' | 'in-progress' | 'awaiting-approval' | 'active' | 'failed';

export interface GitHubDeploymentEnvironment {
	id: string;
	name: string;
	url: string;
	requiresApproval?: boolean;
	reviewers?: string[];
}

export interface GitHubReleaseNoteGroup {
	id: string;
	title: string;
	items: { text: string; pr: number; author: string }[];
}

export interface GitHubReleaseData {
	tag: string;
	previousTag: string;
	name: string;
	target: string;
	groups: GitHubReleaseNoteGroup[];
	assets: { name: string; size: string }[];
}

export type GitHubIncidentStatus = 'investigating' | 'identified' | 'mitigated' | 'resolved';

export interface GitHubIncidentData {
	id: string;
	title: string;
	severity: 'SEV1' | 'SEV2' | 'SEV3';
	service: string;
	metricLabel: string;
	series: number[];
	threshold: number;
	suspect: { sha: string; message: string; pr: number; deployedAt: string };
	steps: { status: GitHubIncidentStatus; label: string; detail: string }[];
}

// --- Intelligent UI / Generative Surface Types ---

export type ResultActionState = 'view' | 'expanded' | 'editing' | 'comparing';

export type GeneratedSurfaceContent =
	| {
			type: 'comparison';
			title: string;
			description?: string;
			selectedId?: string;
			options: {
				id: string;
				title: string;
				description: string;
				recommended?: boolean;
				attributes: { label: string; value: string }[];
			}[];
	  }
	| {
			type: 'recommendation';
			id: string;
			title: string;
			summary: string;
			reasoning?: string[];
			confidence: number;
			acceptLabel: string;
			alternatives?: { id: string; label: string }[];
	  }
	| {
			type: 'document';
			id: string;
			title: string;
			format: string;
			size: string;
			updated: string;
			excerpt: string;
	  }
	| {
			type: 'checklist';
			title: string;
			description?: string;
			items: { id: string; label: string; detail?: string; completed: boolean }[];
	  }
	| {
			type: 'source-brief';
			title: string;
			summary: string;
			sources: { id: string; title: string; origin?: string }[];
	  }
	| {
			type: 'audio';
			title: string;
			creator: string;
			playing: boolean;
			position: number;
			duration: number;
	  }
	| {
			type: 'focus';
			title: string;
			remaining: number;
			duration: number;
			running: boolean;
	  }
	| {
			type: 'flight';
			origin: string;
			originName: string;
			destination: string;
			destinationName: string;
			departure: string;
			arrival: string;
			progress: number;
			status: string;
	  }
	| {
			type: 'weather';
			location: string;
			temperature: number;
			unit: string;
			condition: string;
			forecast: { day: string; temperature: number }[];
	  }
	| {
			type: 'inbox';
			title: string;
			items: { id: string; sender: string; text: string; time: string; unread: boolean }[];
	  }
	| {
			type: 'event';
			title: string;
			time: string;
			timezone: string;
			date: string;
			location: string;
			attendees: string[];
	  }
	| {
			type: 'activity';
			title: string;
			value: string;
			unit: string;
			description: string;
			points: { label: string; value: number }[];
	  }
	| {
			type: 'github-issue';
			issue: GitHubIssueData;
	  }
	| {
			type: 'github-pr';
			pr: GitHubPullRequestData;
	  };

export type DynamicUINodeType =
	| 'agent-activity'
	| 'todo-list'
	| 'tool-approval'
	| 'tool-result'
	| 'file-diff'
	| 'code-block'
	| 'approval-card'
	| 'github-issue-card'
	| 'github-pr-card'
	| 'github-commit-card'
	| 'github-checks-panel'
	| 'generative-surface'
	| 'recommendation-card'
	| 'diff-table'
	| 'insight-cards'
	| 'flowchart'
	| 'agent-orchestrator'
	| 'agent-evaluator'
	| 'stack-trace'
	| 'schema-display'
	| 'github-pr-action-bar'
	| 'github-pr-graph'
	| 'github-checks-waterfall'
	| 'agent-work-trace';

export interface DynamicUINode {
	id: string;
	/** A built-in node type, or any key you add through the renderer's `registry`. */
	component: DynamicUINodeType | (string & {});
	title?: string;
	props: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Pull request flow: create, graph, checks waterfall, agent work trace */
/* ------------------------------------------------------------------ */

/** Lines changed in one file, listed under `GitHubPrActionBar`'s diff stat. */
export interface DiffStatFile {
	path: string;
	additions: number;
	deletions: number;
}

/** Lines added and removed across a change, with optional per-file detail. */
export interface DiffStat {
	additions: number;
	deletions: number;
	files?: DiffStatFile[];
}

/** Where `GitHubPrActionBar` is in opening a pull request. */
export type PrActionStatus = 'idle' | 'creating' | 'created';

/** One lane of `GitHubPullRequestGraph`: a branch drawn as a coloured line. */
export interface PrGraphLane {
	id: string;
	/** Branch name, shown as a chip on the lane's newest commit. */
	branch: string;
	/** Any CSS colour. Defaults to the chart palette, then grey for the base lane. */
	color?: string;
	/** The base branch (e.g. `main`); drawn grey and dashed above its newest commit. */
	base?: boolean;
}

/** A commit row in `GitHubPullRequestGraph`, newest first. */
export interface PrGraphCommit {
	sha: string;
	message: string;
	/** Id of the lane the commit sits on. */
	lane: string;
	author: string;
	/** Relative time, e.g. `now`, `25m`, `2h`. */
	age: string;
}

/** Whether the pull request can merge into its base. */
export type PrMergeState = 'checking' | 'clean' | 'conflict' | 'merged';

/** Lifecycle state of a pull request. */
export type PrState = 'draft' | 'open' | 'merged' | 'closed';

/** Status of one CI check run. */
export type CheckRunStatus = 'queued' | 'running' | 'passed' | 'failed' | 'skipped';

/** Why a check failed, shown under its bar in `GitHubChecksWaterfall`. */
export interface CheckRunFailure {
	/** Where it failed, e.g. `e2e/checkout.spec.ts:42`. */
	location?: string;
	/** The failing test or step, e.g. `checkout › keeps the cart after a session refresh`. */
	title: string;
	expected?: string;
	received?: string;
	/** Free text when there is no expected/received pair. */
	message?: string;
}

/** One CI check on a commit. Times are seconds since the suite started. */
export interface CheckRun {
	id: string;
	name: string;
	status: CheckRunStatus;
	/** When it started. Queued checks leave it out. */
	start?: number;
	/** How long it took. Running checks leave it out and grow to `now`. */
	duration?: number;
	failure?: CheckRunFailure;
	/** Link to the run's logs. */
	url?: string;
}

/** What the agent is doing with the pull request, shown in the checks header. */
export type ChecksPhase = 'checks' | 'fixing' | 'merging' | 'merged';

/** Kind of step in `AgentWorkTrace`; sets the marker. */
export type WorkStepKind = 'note' | 'edit' | 'run' | 'push' | 'result';

/** One step in `AgentWorkTrace`. */
export interface WorkStep {
	id: string;
	label: string;
	/** Muted text after the label, e.g. `Pushed 4a1c9e`. */
	detail?: string;
	kind?: WorkStepKind;
	status: 'pending' | 'running' | 'done' | 'failed';
	/** Files the step touched, shown as chips. */
	files?: string[];
	/** Draws the step on a short branch off the main line, e.g. a test run inside an edit. */
	nested?: boolean;
}
