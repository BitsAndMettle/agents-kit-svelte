/**
 * Sample data for the GitHub components, used by the showcase, docs and tests.
 * Import from `agents-kit-svelte/fixtures`. Components never fall back to it.
 */

import type {
	CheckRun,
	DiffStat,
	PrGraphCommit,
	PrGraphLane,
	GitHubBentoStat,
	GitHubBranchData,
	GitHubCheckItem,
	GitHubCommitData,
	GitHubDeploymentEnvironment,
	GitHubIncidentData,
	GitHubIssueData,
	GitHubLifecycleStage,
	GitHubMergeQueueEntry,
	GitHubPullRequestData,
	GitHubReleaseData,
	GitHubReviewFile,
	GitHubReviewThreadData,
	GitHubTriageIssue
} from '../types';

/** Sample data for `GitHubBranchCard`. */
export const SAMPLE_BRANCH: GitHubBranchData = {
	name: 'argon/2204-csv-quoting',
	base: 'main',
	baseSha: '4e1c9a2',
	linkedIssueNumber: 2204,
	behind: 0,
	commits: [
		{ sha: 'a71f0c4', message: 'test(export): reproduce dropped rows with commas in notes', author: 'argon-agent' },
		{ sha: 'c3e9b18', message: 'fix(export): quote fields per RFC 4180', author: 'argon-agent' },
		{ sha: 'f02d6a7', message: 'test(export): round-trip 10k random rows through the parser', author: 'argon-agent' }
	],
	protections: [
		{ id: 'p-1', label: 'Linked to an issue', satisfied: true },
		{ id: 'p-2', label: 'Signed commits', satisfied: true },
		{ id: 'p-3', label: 'Up to date with main', satisfied: true },
		{ id: 'p-4', label: 'Required checks passing', satisfied: false }
	]
};

/** Sample data for `GitHubChecksPanel`. */
export const SAMPLE_CHECKS: GitHubCheckItem[] = [
	{
		id: 'ci-1',
		name: 'corepack pnpm check (svelte-check & tsc)',
		workflow: 'check-and-test',
		status: 'passed',
		duration: '18.4s',
		summary: '0 errors, 0 warnings across 6 packages'
	},
	{
		id: 'ci-2',
		name: 'node scripts/check-boundaries.ts',
		workflow: 'check-and-test',
		status: 'passed',
		duration: '2.1s',
		summary: 'All service, domain, and UI boundary rules satisfied'
	},
	{
		id: 'ci-3',
		name: 'Playwright mobile viewport tap-target gate (390x844)',
		workflow: 'browser-parity',
		status: 'failed',
		duration: '14.2s',
		summary: 'Expected action pill height >= 36px, measured 30px on /w/settings'
	},
	{
		id: 'ci-4',
		name: 'CSS growth ratchet & a11y baseline',
		workflow: 'static-review',
		status: 'passed',
		duration: '3.6s',
		summary: '32 static checks passed'
	}
];

/** Sample data for `GitHubCommitCard`. */
export const SAMPLE_COMMIT: GitHubCommitData = {
	sha: 'cdb5ea5',
	message: 'fix(home): raise contrast of unpicked agents, skipped gates and secondary captions',
	author: 'argon-agent',
	timestamp: '12m ago',
	branch: 'argon/2151-home-faint-captions-contrast',
	verified: true,
	additions: 68,
	deletions: 14,
	files: [
		{
			path: 'apps/web/src/lib/home/trail.css',
			status: 'modified',
			additions: 12,
			deletions: 11
		},
		{
			path: 'apps/web/src/lib/home/route-map.css',
			status: 'modified',
			additions: 2,
			deletions: 3
		},
		{
			path: 'tests/browser/home.spec.ts',
			status: 'modified',
			additions: 54,
			deletions: 0
		}
	]
};

/** Sample data for `GitHubDeploymentPipeline`. */
export const SAMPLE_ENVIRONMENTS: GitHubDeploymentEnvironment[] = [
	{ id: 'preview', name: 'Preview', url: 'pr-2210.preview.example.dev' },
	{ id: 'staging', name: 'Staging', url: 'staging.example.dev' },
	{ id: 'production', name: 'Production', url: 'app.example.com', requiresApproval: true, reviewers: ['mira-chen', 'ops-oncall'] }
];

/** Sample data for `GitHubIncidentCard`. */
export const SAMPLE_INCIDENT: GitHubIncidentData = {
	id: 'INC-418',
	title: 'Export API returning 500s',
	severity: 'SEV2',
	service: 'export-api',
	metricLabel: 'Error rate (%)',
	series: [0.4, 0.5, 0.4, 0.6, 0.5, 0.4, 4.2, 6.8, 7.4, 7.1, 1.2, 0.6, 0.5, 0.4],
	threshold: 2,
	suspect: {
		sha: '9b07d3e',
		message: 'fix(export): quote CSV fields per RFC 4180',
		pr: 2210,
		deployedAt: '09:44'
	},
	steps: [
		{ status: 'investigating', label: 'Alert fired', detail: 'Error rate crossed 2% for 2 minutes · paged ops-oncall' },
		{ status: 'identified', label: 'Suspect found', detail: 'Errors started 40s after deploy 9b07d3e · stack points at quoteField()' },
		{ status: 'mitigated', label: 'Reverted', detail: 'Revert PR 2219 merged and deployed · error rate falling' },
		{ status: 'resolved', label: 'Resolved', detail: 'Healthy for 10 minutes · follow-up issue 2220 opened with a failing test' }
	]
};

/** Sample data for `GitHubIssueCard`. */
export const SAMPLE_ISSUE: GitHubIssueData = {
	number: 2151,
	title: 'Home: the unpicked agents, skipped gates and other small captions are too faint to read',
	repo: 'RSynapse/trailside',
	state: 'in-progress',
	author: 'grok-bot',
	createdAt: '28m ago',
	labels: [
		{ name: 'area:landing', tone: 'accent' },
		{ name: 'type:polish', tone: 'neutral' },
		{ name: 'size:s', tone: 'neutral' },
		{ name: 'tier:T1', tone: 'warning' },
		{ name: 'in-progress', tone: 'success' }
	],
	riskTier: 'T1',
	size: 'S',
	assignedAgent: 'AK-S Agent · Attempt 1',
	attemptNumber: 1,
	worktreeBranch: 'argon/2151-home-faint-captions-contrast',
	linkedPrNumber: 2153,
	criteriaCompleted: 5,
	criteriaTotal: 5,
	summary:
		'Small secondary captions and unpicked agent rows on the home page fall below 4.5:1 WCAG AA contrast across 320px–1440px viewports.'
};

/** Sample data for `GitHubIssueTriage`. */
export const SAMPLE_TRIAGE_ISSUE: GitHubTriageIssue = {
	number: 2204,
	title: 'Export to CSV drops rows when notes contain commas',
	author: 'mira-chen',
	openedAt: 'just now',
	body: 'Exporting the March report gives 212 rows instead of 230. Every missing row has a comma in the Notes column. Happens in Chrome and Safari.',
	suggestions: [
		{ id: 's-type', kind: 'type', label: 'Type', value: 'bug', confidence: 0.97, tone: 'danger' },
		{ id: 's-pri', kind: 'priority', label: 'Priority', value: 'P1 · data loss', confidence: 0.88, tone: 'warning' },
		{ id: 's-area', kind: 'area', label: 'Area', value: 'area/export', confidence: 0.93, tone: 'accent' },
		{ id: 's-who', kind: 'assignee', label: 'Assignee', value: 'argon-agent', confidence: 0.81, tone: 'neutral' },
		{ id: 's-ms', kind: 'milestone', label: 'Milestone', value: 'v2.8.1', confidence: 0.74, tone: 'success' }
	],
	duplicate: { number: 1987, title: 'CSV export breaks on quotes in titles', similarity: 0.62 }
};

/** Sample data for `GitHubKanbanBoard`. */
export const SAMPLE_BOARD_ISSUES: GitHubIssueData[] = [
	{
		number: 2177,
		title: 'Skills: filter pill bar overflows horizontally at 320px without scroll cue',
		repo: 'RSynapse/trailside',
		state: 'open',
		author: 'grok-bot',
		createdAt: '14m ago',
		labels: [
			{ name: 'triage', tone: 'warning' },
			{ name: 'area:app', tone: 'accent' },
			{ name: 'size:s', tone: 'neutral' }
		],
		riskTier: 'T1',
		size: 'S',
		criteriaCompleted: 0,
		criteriaTotal: 3
	},
	{
		number: 2152,
		title: 'Landing: pricing comparison cards misalign CTA baseline at 768px tablet breakpoint',
		repo: 'RSynapse/trailside',
		state: 'open',
		author: 'grok-bot',
		createdAt: '41m ago',
		labels: [
			{ name: 'ready', tone: 'success' },
			{ name: 'area:landing', tone: 'accent' },
			{ name: 'tier:T1', tone: 'warning' }
		],
		riskTier: 'T1',
		size: 'S',
		criteriaCompleted: 1,
		criteriaTotal: 4
	},
	{
		number: 2151,
		title: 'Home: the unpicked agents, skipped gates and other small captions are too faint to read',
		repo: 'RSynapse/trailside',
		state: 'in-progress',
		author: 'grok-bot',
		createdAt: '1h ago',
		labels: [
			{ name: 'in-progress', tone: 'success' },
			{ name: 'area:landing', tone: 'accent' }
		],
		riskTier: 'T1',
		size: 'S',
		assignedAgent: 'AK-S Agent · Attempt 1',
		worktreeBranch: 'argon/2151-home-faint-captions-contrast',
		linkedPrNumber: 2153,
		criteriaCompleted: 5,
		criteriaTotal: 5
	},
	{
		number: 2148,
		title: 'Repositories dialog: Connected and Eligible status pills fall below 4.5:1 contrast',
		repo: 'RSynapse/trailside',
		state: 'ready-for-human',
		author: 'grok-bot',
		createdAt: '2h ago',
		labels: [
			{ name: 'ready-for-human', tone: 'warning' },
			{ name: 'area:app', tone: 'accent' }
		],
		riskTier: 'T1',
		size: 'S',
		assignedAgent: 'AK-S Agent · Attempt 1',
		worktreeBranch: 'argon/2148-repo-dialog-status-contrast',
		linkedPrNumber: 2150,
		criteriaCompleted: 4,
		criteriaTotal: 4
	},
	{
		number: 2128,
		title: 'Board: Ready for you disclosure chevron lacks aria-expanded state',
		repo: 'RSynapse/trailside',
		state: 'ready-for-human',
		author: 'grok-bot',
		createdAt: '2h ago',
		labels: [
			{ name: 'ready-for-human', tone: 'warning' },
			{ name: 'area:app', tone: 'accent' }
		],
		riskTier: 'T1',
		size: 'S',
		linkedPrNumber: 2136,
		criteriaCompleted: 3,
		criteriaTotal: 3
	},
	{
		number: 2066,
		title: 'Project Planning: clarify read-only notice when no computer is connected',
		repo: 'RSynapse/trailside',
		state: 'closed',
		author: 'grok-bot',
		createdAt: '3h ago',
		labels: [
			{ name: 'area:app', tone: 'accent' },
			{ name: 'tier:T1', tone: 'neutral' }
		],
		riskTier: 'T1',
		size: 'S',
		linkedPrNumber: 2075,
		criteriaCompleted: 3,
		criteriaTotal: 3
	}
];

/** Sample data for `GitHubLifecycleTimeline`. */
export const SAMPLE_LIFECYCLE_STAGES: GitHubLifecycleStage[] = [
	{ id: 'issue', label: 'Issue opened', actor: 'mira-chen', detail: 'Issue 2204 · Export to CSV drops rows with commas in the notes field', timestamp: '09:02' },
	{ id: 'triage', label: 'Triaged', actor: 'claude-triage', detail: 'Labelled bug, P1, area/export · assigned to argon-agent', timestamp: '09:03' },
	{ id: 'branch', label: 'Branch', actor: 'argon-agent', detail: 'argon/2204-csv-quoting from main @ 4e1c9a2', timestamp: '09:04' },
	{ id: 'commits', label: 'Commits', actor: 'argon-agent', detail: '3 commits · quote fields per RFC 4180, add round-trip test', timestamp: '09:11' },
	{ id: 'pull-request', label: 'Pull request', actor: 'argon-agent', detail: 'PR 2210 opened against main · +46 -9 across 3 files', timestamp: '09:12' },
	{ id: 'review', label: 'Review', actor: 'mira-chen', detail: 'Approved after one suggestion on the escaping helper', timestamp: '09:24' },
	{ id: 'checks', label: 'Checks', actor: 'GitHub Actions', detail: '6 of 6 required checks passing in 3m 12s', timestamp: '09:28' },
	{ id: 'merge', label: 'Merged', actor: 'merge queue', detail: 'Squashed into main as 9b07d3e', timestamp: '09:31' },
	{ id: 'deploy', label: 'Deployed', actor: 'deploy bot', detail: 'Rolled out to production · 100% healthy', timestamp: '09:44' },
	{ id: 'release', label: 'Released', actor: 'release bot', detail: 'v2.8.1 published with generated notes', timestamp: '10:00' }
];

/** Sample data for `GitHubMergeQueue`. */
export const SAMPLE_MERGE_QUEUE: GitHubMergeQueueEntry[] = [
	{ number: 2210, title: 'fix(export): quote CSV fields per RFC 4180', author: 'argon-agent', checksTotal: 6 },
	{ number: 2207, title: 'feat(settings): appearance row with system theme', author: 'mira-chen', checksTotal: 6 },
	{ number: 2213, title: 'chore(deps): bump vite to 8.3.1', author: 'renovate', checksTotal: 6 },
	{ number: 2215, title: 'docs: document the export column order', author: 'tomas-r', checksTotal: 4 }
];

/** Sample data for `GitHubPullRequestCard`. */
export const SAMPLE_PULL_REQUEST: GitHubPullRequestData = {
	number: 2153,
	title: 'fix(home): raise contrast of unpicked agents, skipped gates and secondary captions',
	repo: 'RSynapse/trailside',
	state: 'open',
	author: 'argon-agent',
	headBranch: 'argon/2151-home-faint-captions-contrast',
	baseBranch: 'main',
	additions: 68,
	deletions: 14,
	changedFilesCount: 3,
	riskTier: 'T1',
	refereeStatus: 'pass',
	refereeSummary: 'Referee review (T1, one lens): PASS. Verified 4.5:1 contrast across all 5 viewports. Queued to merge.',
	updatedAt: '4m ago',
	linkedIssueNumber: 2151,
	checks: [
		{
			id: 'chk-1',
			name: 'check-and-test (Node 24.11.1)',
			workflow: 'CI',
			status: 'passed',
			duration: '1m 42s',
			summary: 'svelte-check 0 errors · 39 affected suites passed'
		},
		{
			id: 'chk-2',
			name: 'Playwright 5-viewport contrast verification',
			workflow: 'Browser Verification',
			status: 'passed',
			duration: '32.0s',
			summary: '320px, 390px, 768px, 1024px, 1440px all >= 4.5:1'
		},
		{
			id: 'chk-3',
			name: 'check-boundaries & protected-paths guard',
			workflow: 'Policy Gate',
			status: 'passed',
			duration: '4.1s',
			summary: 'T1 UI paths only · css-ratchet within baseline'
		}
	]
};

/** Sample data for `GitHubPullRequestReview`. */
export const SAMPLE_REVIEW_FILES: GitHubReviewFile[] = [
	{
		path: 'src/lib/export/csv.ts',
		additions: 14,
		deletions: 6,
		lines: [
			{ kind: 'hunk', text: '@@ -18,9 +18,17 @@ export function toCsvRow(values: string[])' },
			{ kind: 'context', oldLine: 18, newLine: 18, text: 'export function toCsvRow(values: string[]): string {' },
			{ kind: 'del', oldLine: 19, text: "  return values.join(',');" },
			{ kind: 'add', newLine: 19, text: '  return values.map(quoteField).join(\',\');' },
			{ kind: 'context', oldLine: 20, newLine: 20, text: '}' },
			{ kind: 'context', oldLine: 21, newLine: 21, text: '' },
			{ kind: 'add', newLine: 22, text: 'function quoteField(value: string): string {' },
			{ kind: 'add', newLine: 23, text: '  if (!/[",\\n]/.test(value)) return value;' },
			{ kind: 'add', newLine: 24, text: '  return `"${value.replaceAll(\'"\', \'""\')}"`;' },
			{ kind: 'add', newLine: 25, text: '}' }
		],
		comment: {
			afterLine: 23,
			author: 'mira-chen',
			body: 'Carriage returns too, please. Excel on Windows writes \\r\\n inside quoted notes.'
		}
	},
	{
		path: 'tests/export/csv.test.ts',
		additions: 32,
		deletions: 3,
		lines: [
			{ kind: 'hunk', text: '@@ -4,6 +4,12 @@' },
			{ kind: 'add', newLine: 4, text: "test('keeps rows whose notes contain commas', () => {" },
			{ kind: 'add', newLine: 5, text: "  expect(toCsvRow(['a', 'b, c'])).toBe('a,\"b, c\"');" },
			{ kind: 'add', newLine: 6, text: '});' }
		]
	}
];

/** Sample data for `GitHubReleaseCard`. */
export const SAMPLE_RELEASE: GitHubReleaseData = {
	tag: 'v2.8.1',
	previousTag: 'v2.8.0',
	name: 'v2.8.1 · Safer exports',
	target: 'main @ 9b07d3e',
	groups: [
		{
			id: 'fixes',
			title: 'Bug fixes',
			items: [
				{ text: 'CSV export keeps rows whose notes contain commas, quotes or line breaks', pr: 2210, author: 'argon-agent' },
				{ text: 'Date filters respect the workspace time zone', pr: 2198, author: 'tomas-r' }
			]
		},
		{
			id: 'features',
			title: 'Features',
			items: [{ text: 'Appearance setting with Light, Dark and System', pr: 2207, author: 'mira-chen' }]
		},
		{
			id: 'chores',
			title: 'Maintenance',
			items: [
				{ text: 'Bump vite to 8.3.1', pr: 2213, author: 'renovate' },
				{ text: 'Document the export column order', pr: 2215, author: 'tomas-r' }
			]
		}
	],
	assets: [
		{ name: 'app-2.8.1.tar.gz', size: '4.2 MB' },
		{ name: 'checksums.txt', size: '312 B' }
	]
};

/** Sample data for `GitHubReviewThreadCard`. */
export const SAMPLE_REVIEW_THREAD: GitHubReviewThreadData = {
	id: 'thread-2153-1',
	filePath: 'apps/web/src/lib/home/trail.css',
	lineRange: 'L187-L194',
	diffHunk: [
		'@@ -187,4 +187,4 @@',
		' .pick-dim {',
		'-  color: var(--faint);',
		'+  color: var(--muted);',
		' }'
	].join('\n'),
	resolved: false,
	comments: [
		{
			id: 'c-1',
			author: 'claude-referee',
			role: 'Referee · T1 Lens',
			timestamp: '6m ago',
			body: 'Verified that switching `.pick-dim` and `.gate` from `--faint` to `--muted` brings the contrast ratio from 2.91:1 to 5.42:1 on warm paper.',
			suggestedPatch: '.pick-dim, .gate {\n  color: var(--muted);\n}'
		}
	]
};

/** Sample stat tiles for `GitHubBentoLayout`. */
export const SAMPLE_BENTO_STATS: GitHubBentoStat[] = [
	{ label: 'Open Agent PRs', value: '3 / 3', detail: 'PR 2136, PR 2150, PR 2153 (All PASS)' },
	{ label: 'Check Gates', value: '98.4%', detail: '427 unit assertions · 5 viewports', tone: 'success' }
];

/** Sample diff for `GitHubPrActionBar`. */
export const SAMPLE_PR_DIFF: DiffStat = {
	additions: 482,
	deletions: 37,
	files: [
		{ path: 'src/middleware.ts', additions: 64, deletions: 12 },
		{ path: 'src/lib/session/refresh.ts', additions: 118, deletions: 0 },
		{ path: 'src/lib/session/token.ts', additions: 41, deletions: 19 },
		{ path: 'e2e/session-refresh.spec.ts', additions: 203, deletions: 0 },
		{ path: 'e2e/checkout.spec.ts', additions: 56, deletions: 6 }
	]
};

/** Sample branches for `GitHubPullRequestGraph`. */
export const SAMPLE_PR_GRAPH_LANES: PrGraphLane[] = [
	{ id: 'main', branch: 'main', base: true },
	{ id: 'session', branch: 'feat/session-refresh' },
	{ id: 'analytics', branch: 'feat/checkout-analytics' }
];

/** Sample commits for `GitHubPullRequestGraph`, newest first. */
export const SAMPLE_PR_GRAPH_COMMITS: PrGraphCommit[] = [
	{ sha: 'd29f50a', message: 'Add session refresh tests', lane: 'session', author: 'You', age: 'now' },
	{ sha: 'c70a92e', message: 'Refresh sessions near expiry', lane: 'session', author: 'You', age: '25m' },
	{ sha: 'e83c51b', message: 'Add analytics consent banner', lane: 'analytics', author: 'Sam', age: '32m' },
	{ sha: '1f8e3b0', message: 'Read session expiry from the token', lane: 'session', author: 'You', age: '40m' },
	{ sha: '62b0e4c', message: 'Track checkout funnel events', lane: 'analytics', author: 'Sam', age: '2h' },
	{ sha: '9c2d4a1', message: 'Bump next to 16.3', lane: 'main', author: 'Sam', age: '3h' }
];

/** Sample suite for `GitHubChecksWaterfall`: four passed, e2e failed. Seconds since the suite started. */
export const SAMPLE_CHECK_RUNS: CheckRun[] = [
	{ id: 'lint', name: 'lint', status: 'passed', start: 1, duration: 11 },
	{ id: 'typecheck', name: 'typecheck', status: 'passed', start: 1, duration: 21 },
	{ id: 'unit', name: 'unit', status: 'passed', start: 2, duration: 34 },
	{ id: 'preview', name: 'Vercel Preview', status: 'passed', start: 0, duration: 40 },
	{
		id: 'e2e',
		name: 'e2e',
		status: 'failed',
		start: 41,
		duration: 33,
		failure: {
			location: 'e2e/checkout.spec.ts:42',
			title: 'checkout › keeps the cart after a session refresh',
			expected: '/checkout',
			received: '/sign-in?next=%2Fcheckout'
		}
	}
];
