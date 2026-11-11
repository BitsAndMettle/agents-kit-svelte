/**
 * Sample data for the Charts & Timelines collection: one agent run on a feature card, from plan to
 * verified, with a failed first attempt, a rate-limit fallback and an escalated review.
 * Import from `agents-kit-svelte/fixtures`; components never fall back to it.
 */
import type { GitHubIncidentData, GitHubIssueData, GitHubPullRequestData, GitHubReleaseData } from '../types';
import type {
	ChartSpec,
	FeatureSummary,
	Metric,
	LineageEdge,
	LineageNode,
	HandoffLane,
	HandoffLink,
	HandoffSpan,
	ModelEvent,
	ModelSeries,
	PhaseBand,
	BurnPoint,
	RunMark,
	TimelineItem,
	TimelineMilestone
} from '../charts/types';

/** Total length of the sample run, in seconds. */
export const SAMPLE_RUN_DURATION = 284;

export const SAMPLE_HANDOFF_LANES: HandoffLane[] = [
	{ id: 'planner', label: 'Planner', model: 'claude-opus' },
	{ id: 'implementer', label: 'Implementer', model: 'claude-sonnet' },
	{ id: 'reviewer', label: 'Reviewer', model: 'gpt-codex' },
	{ id: 'verifier', label: 'Verifier', model: 'claude-haiku' }
];

export const SAMPLE_HANDOFF_SPANS: HandoffSpan[] = [
	{ id: 'plan-1', lane: 'planner', phase: 'plan', start: 0, end: 38, status: 'done', label: 'Plan', attempt: 1, tokens: 18_400 },
	{ id: 'impl-1', lane: 'implementer', phase: 'implement', start: 42, end: 118, status: 'superseded', label: 'Implement', attempt: 1, tokens: 51_200 },
	{ id: 'verify-1', lane: 'verifier', phase: 'verify', start: 120, end: 146, status: 'failed', label: 'Tests', attempt: 1, tokens: 9_800 },
	{ id: 'impl-2', lane: 'implementer', phase: 'implement', start: 150, end: 206, status: 'done', label: 'Retry', attempt: 2, tokens: 38_900 },
	{ id: 'review-1', lane: 'reviewer', phase: 'review', start: 210, end: 250, status: 'done', label: 'Review', attempt: 1, tokens: 22_600 },
	{ id: 'verify-2', lane: 'verifier', phase: 'verify', start: 254, end: 282, status: 'done', label: 'Verify', attempt: 2, tokens: 10_300 }
];

/** A file changed in a handoff's diff, in the shape `FileDiff` takes. */
export interface SampleDiffFile {
	filename: string;
	patch: string;
	additions: number;
	deletions: number;
}

const DIFF_ATTEMPT_1: SampleDiffFile[] = [
	{
		filename: 'src/lib/auth/sso.ts',
		additions: 96,
		deletions: 21,
		patch: [
			'@@ -1,9 +1,24 @@',
			" import { createRemoteJWKSet, jwtVerify } from 'jose';",
			"+import { sessionCache } from './session-cache';",
			' ',
			' export async function verifySsoToken(token: string) {',
			'-	const { payload } = await jwtVerify(token, jwks);',
			'-	return payload;',
			'+	const cached = sessionCache.get(token);',
			'+	if (cached) return cached;',
			'+	const { payload } = await jwtVerify(token, jwks, { issuer: ISSUER });',
			'+	sessionCache.set(token, payload, payload.exp);',
			'+	return payload;',
			' }'
		].join('\n')
	},
	{
		filename: 'src/lib/auth/session-cache.ts',
		additions: 46,
		deletions: 17,
		patch: [
			'@@ -0,0 +1,14 @@',
			'+const entries = new Map<string, { value: unknown; expires: number }>();',
			'+',
			'+export const sessionCache = {',
			'+	get(key: string) {',
			'+		const hit = entries.get(key);',
			'+		return hit && hit.expires > Date.now() / 1000 ? hit.value : undefined;',
			'+	},',
			'+	set(key: string, value: unknown, expires = 0) {',
			'+		entries.set(key, { value, expires });',
			'+	}',
			'+};'
		].join('\n')
	}
];

const DIFF_ATTEMPT_2: SampleDiffFile[] = [
	{
		filename: 'src/lib/auth/session-cache.ts',
		additions: 18,
		deletions: 4,
		patch: [
			'@@ -8,7 +8,15 @@ export const sessionCache = {',
			' 	set(key: string, value: unknown, expires = 0) {',
			' 		entries.set(key, { value, expires });',
			' 	},',
			'+	/** Drops a session so the next request refreshes its token. */',
			'+	invalidate(key: string) {',
			'+		entries.delete(key);',
			'+	}',
			' };'
		].join('\n')
	},
	{
		filename: 'src/routes/auth/callback/+server.ts',
		additions: 11,
		deletions: 2,
		patch: [
			'@@ -14,6 +14,9 @@ export async function GET({ url, cookies }) {',
			' 	const token = await exchangeCode(url.searchParams.get(\'code\'));',
			'-	cookies.set(\'session\', token, COOKIE_OPTIONS);',
			'+	const previous = cookies.get(\'session\');',
			'+	if (previous) sessionCache.invalidate(previous);',
			'+	cookies.set(\'session\', token, COOKIE_OPTIONS);',
			' 	throw redirect(303, \'/billing\');'
		].join('\n')
	}
];

export const SAMPLE_HANDOFFS: HandoffLink[] = [
	{
		id: 'h1',
		from: 'plan-1',
		to: 'impl-1',
		artifact: 'plan.md',
		kind: 'file',
		reason: 'Plan approved: 4 steps across 6 files.',
		data: [
			'# Add SSO to the billing portal',
			'',
			'1. Verify SSO tokens against the IdP JWKS (`src/lib/auth/sso.ts`).',
			'2. Cache verified sessions until `exp` to cut IdP calls on checkout.',
			'3. Swap the password form for the SSO button on `/billing/login`.',
			'4. Cover login, refresh and logout in `session.test.ts`.',
			'',
			'Risk: T3 (auth). Needs review before merge.'
		].join('\n')
	},
	{ id: 'h2', from: 'impl-1', to: 'verify-1', artifact: 'diff +142 −38', kind: 'diff', reason: 'Implementation done; asking for the test run.', data: DIFF_ATTEMPT_1 },
	{
		id: 'h3',
		from: 'verify-1',
		to: 'impl-2',
		artifact: '2 failing tests',
		kind: 'tests',
		reason: 'session.test.ts expects a refreshed token after SSO login.',
		data: [
			{
				id: 'session',
				name: 'session.test.ts',
				status: 'failed',
				tests: [
					{ id: 't1', name: 'verifies a valid SSO token', status: 'passed', durationMs: 42 },
					{ id: 't2', name: 'rejects a token from another issuer', status: 'passed', durationMs: 18 },
					{ id: 't3', name: 'refreshes the session after re-login', status: 'failed', durationMs: 61, errorMessage: 'Expected a new token, received the cached one' },
					{ id: 't4', name: 'logout clears the cached session', status: 'failed', durationMs: 23, errorMessage: 'sessionCache.invalidate is not a function' }
				]
			},
			{
				id: 'billing',
				name: 'billing-login.test.ts',
				status: 'passed',
				tests: [{ id: 't5', name: 'shows the SSO button', status: 'passed', durationMs: 104 }]
			}
		]
	},
	{ id: 'h4', from: 'impl-2', to: 'review-1', artifact: 'diff +171 −44', kind: 'diff', reason: 'Tests green; requesting review.', data: [...DIFF_ATTEMPT_1, ...DIFF_ATTEMPT_2] },
	{
		id: 'h5',
		from: 'review-1',
		to: 'verify-2',
		artifact: 'review: approve',
		kind: 'review',
		reason: 'One nit fixed inline, then approved.',
		data: [
			'**Approved** with one nit, fixed inline.',
			'',
			'- `session-cache.ts:4`: compare `exp` in seconds, not milliseconds. Fixed.',
			'- The callback now invalidates the old session before setting the new cookie. Good.',
			'- Escalated to claude-opus for a second look because the diff touches auth middleware.'
		].join('\n')
	}
];

export const SAMPLE_PHASE_BANDS: PhaseBand[] = [
	{ id: 'plan', label: 'Plan', start: 0, end: 40 },
	{ id: 'implement', label: 'Implement', start: 40, end: 148 },
	{ id: 'retry', label: 'Retry', start: 148, end: 208 },
	{ id: 'review', label: 'Review', start: 208, end: 252 },
	{ id: 'verify', label: 'Verify', start: 252, end: SAMPLE_RUN_DURATION }
];

/** Which model streams when, and roughly how fast. */
const ACTIVITY: Record<string, [number, number, number][]> = {
	'claude-opus': [[0, 38, 62], [232, 250, 48]],
	'claude-sonnet': [[42, 64, 96], [76, 118, 104], [150, 206, 88]],
	'claude-haiku': [[64, 76, 128], [120, 146, 142], [254, 282, 136]],
	'gpt-codex': [[210, 232, 74], [232, 250, 22]]
};

function throughput(model: string, t: number): number {
	const seed = model.length * 1.7;
	for (const [start, end, rate] of ACTIVITY[model] ?? []) {
		if (t >= start && t < end) {
			const wobble = 0.82 + 0.18 * Math.sin(t / 7 + seed) + 0.08 * Math.sin(t / 2.3 + seed * 2);
			return Math.round(rate * wobble);
		}
	}
	return 0;
}

const SAMPLE_TIMES = Array.from({ length: SAMPLE_RUN_DURATION / 4 + 1 }, (_, i) => i * 4);

export const SAMPLE_MODEL_SERIES: ModelSeries[] = ['claude-opus', 'claude-sonnet', 'gpt-codex', 'claude-haiku'].map((model) => ({
	model,
	points: SAMPLE_TIMES.map((t) => ({ t, value: throughput(model, t) }))
}));

export const SAMPLE_MODEL_EVENTS: ModelEvent[] = [
	{ id: 'e1', t: 64, kind: 'fallback', from: 'claude-sonnet', to: 'claude-haiku', reason: 'Rate limited for 12 s, so the router fell back to keep the stream going.' },
	{ id: 'e2', t: 76, kind: 'swap', from: 'claude-haiku', to: 'claude-sonnet', reason: 'Rate limit cleared; back to the implementer’s model.' },
	{ id: 'e3', t: 232, kind: 'escalate', from: 'gpt-codex', to: 'claude-opus', reason: 'The diff touches auth middleware (risk T3), so review escalates.' }
];

/** Specs an agent might emit for `GenerativeChart`. */
export const SAMPLE_CHART_SPECS: Record<'latency' | 'tokens' | 'passRate', ChartSpec> = {
	latency: {
		kind: 'line',
		title: 'Checkout p95 latency',
		subtitle: 'Last 14 days, before and after the SSO session cache',
		x: 'day',
		y: 'ms',
		series: 'build',
		unit: 'ms',
		xLabel: 'Day',
		data: [
			...[412, 398, 421, 409, 436, 428, 447, 455, 441, 462, 470, 458, 476, 481].map((ms, i) => ({ day: i + 1, build: 'Before', ms })),
			...[405, 392, 410, 401, 418, 396, 352, 318, 301, 296, 288, 292, 284, 279].map((ms, i) => ({ day: i + 1, build: 'After', ms }))
		],
		annotations: [
			{ x: 7, series: 'After', label: 'Cache shipped', note: 'PR #214 merged; p95 drops 11% in a day.' },
			{ x: 14, series: 'Before', label: 'Still climbing', note: 'Without the cache, p95 keeps rising.' }
		]
	},
	tokens: {
		kind: 'bar',
		title: 'Tokens by phase',
		subtitle: 'This run, split by model',
		x: 'phase',
		y: 'tokens',
		series: 'model',
		seriesOrder: ['claude-opus', 'claude-sonnet', 'gpt-codex', 'claude-haiku'],
		unit: 'tokens',
		data: [
			{ phase: 'Plan', model: 'claude-opus', tokens: 18_400 },
			{ phase: 'Implement', model: 'claude-sonnet', tokens: 44_100 },
			{ phase: 'Implement', model: 'claude-haiku', tokens: 7_100 },
			{ phase: 'Retry', model: 'claude-sonnet', tokens: 38_900 },
			{ phase: 'Review', model: 'gpt-codex', tokens: 14_300 },
			{ phase: 'Review', model: 'claude-opus', tokens: 8_300 },
			{ phase: 'Verify', model: 'claude-haiku', tokens: 20_100 }
		],
		annotations: [{ x: 'Retry', series: 'claude-sonnet', label: 'Retry cost', note: '2 failing tests cost 39k extra tokens.' }]
	},
	passRate: {
		kind: 'area',
		title: 'Acceptance criteria met',
		subtitle: 'Per attempt across the feature’s cards',
		x: 'attempt',
		y: 'percent',
		unit: '%',
		xLabel: 'Attempt',
		data: [18, 34, 41, 39, 58, 66, 71, 83, 88, 100].map((percent, i) => ({ attempt: i + 1, percent })),
		annotations: [{ x: 4, label: 'Regression', note: 'Attempt 4 broke the token refresh.' }]
	}
};

// --- Features and lineage ---

const feature = (number: number, title: string, state: GitHubIssueData['state'], extra: Partial<GitHubIssueData> = {}): GitHubIssueData => ({
	number,
	title,
	repo: 'acme/billing',
	state,
	author: 'greg',
	createdAt: 'Oct 28',
	labels: [{ name: 'feature: sso', tone: 'accent' }],
	riskTier: 'T3',
	size: 'M',
	...extra
});

const pr = (number: number, title: string, state: GitHubPullRequestData['state'], additions: number, deletions: number, linkedIssueNumber: number, passing = true): GitHubPullRequestData => ({
	number,
	title,
	repo: 'acme/billing',
	state,
	author: 'claude-sonnet',
	headBranch: `trailside/${linkedIssueNumber}-auto-run`,
	baseBranch: 'main',
	additions,
	deletions,
	changedFilesCount: 4,
	riskTier: 'T3',
	refereeStatus: passing ? 'pass' : 'pending',
	refereeSummary: passing ? 'Referee review (T3, two lenses): PASS.' : 'Waiting on checks.',
	updatedAt: state === 'merged' ? 'Nov 1' : '12m ago',
	linkedIssueNumber,
	checks: [
		{ id: 'c1', name: 'check-and-test', workflow: 'CI', status: passing ? 'passed' : 'running', duration: '1m 58s' },
		{ id: 'c2', name: 'auth e2e (Playwright)', workflow: 'CI', status: passing ? 'passed' : 'running', duration: '3m 12s' }
	]
});

/** One Feature at a glance, for `FeatureCard`. */
export const SAMPLE_FEATURE: FeatureSummary = {
	id: 'F-12',
	title: 'SSO for the billing portal',
	summary: 'Sign in with the company IdP, cache sessions to cut checkout latency, and let admins manage SSO.',
	riskTier: 'T3',
	status: 'in-progress',
	owner: 'Greg',
	cards: { done: 3, running: 1, failed: 0, planned: 1 },
	criteriaMet: 9,
	criteriaTotal: 14,
	attempts: 6,
	pullRequests: 4,
	tokensSpent: 412_000,
	tokenBudget: 600_000,
	progress: [0, 14, 21, 21, 43, 50, 57, 64],
	agents: ['claude-opus', 'claude-sonnet', 'gpt-codex'],
	updatedLabel: 'Updated 4m ago'
};

/** More Features, for a board or a grid of `FeatureCard`s. */
export const SAMPLE_FEATURES: FeatureSummary[] = [
	SAMPLE_FEATURE,
	{
		id: 'F-9',
		title: 'Usage-based invoices',
		summary: 'Meter API calls per workspace and bill them monthly.',
		riskTier: 'T2',
		status: 'shipped',
		owner: 'Mira',
		cards: { done: 6, running: 0, failed: 0, planned: 0 },
		criteriaMet: 11,
		criteriaTotal: 11,
		attempts: 8,
		pullRequests: 6,
		tokensSpent: 388_000,
		tokenBudget: 450_000,
		progress: [9, 27, 36, 55, 73, 82, 100],
		agents: ['claude-sonnet', 'claude-haiku'],
		updatedLabel: 'Shipped Oct 30'
	},
	{
		id: 'F-14',
		title: 'Dunning emails for failed payments',
		summary: 'Retry cards on a schedule and email the account owner before suspending.',
		riskTier: 'T1',
		status: 'blocked',
		owner: 'Tomas',
		cards: { done: 1, running: 0, failed: 2, planned: 2 },
		criteriaMet: 2,
		criteriaTotal: 9,
		attempts: 5,
		pullRequests: 1,
		tokensSpent: 251_000,
		tokenBudget: 260_000,
		progress: [0, 11, 22, 22, 22],
		agents: ['gpt-codex'],
		updatedLabel: 'Blocked on email provider keys'
	}
];

/** What each lineage node opens: the GitHub record behind it, or the run for an attempt. */
export type SampleLineageData =
	| { type: 'issue'; issue: GitHubIssueData }
	| { type: 'pr'; pr: GitHubPullRequestData }
	| { type: 'release'; release: GitHubReleaseData }
	| { type: 'incident'; incident: GitHubIncidentData }
	| { type: 'run'; card: number; attempt: number }
	| { type: 'feature' };

export const SAMPLE_LINEAGE_NODES: LineageNode[] = [
	{ id: 'f12', kind: 'feature', label: 'SSO for the billing portal', detail: 'F-12 · T3', status: 'running', data: { type: 'feature' } },

	{ id: 'c214', kind: 'card', label: 'SSO login', detail: '#214', status: 'done', data: { type: 'issue', issue: feature(214, 'SSO login for the billing portal', 'closed', { criteriaCompleted: 4, criteriaTotal: 4, linkedPrNumber: 301 }) } },
	{ id: 'c215', kind: 'card', label: 'Session cache', detail: '#215', status: 'done', data: { type: 'issue', issue: feature(215, 'Cache verified SSO sessions until expiry', 'closed', { criteriaCompleted: 3, criteriaTotal: 3, linkedPrNumber: 302 }) } },
	{ id: 'c216', kind: 'card', label: 'Logout and token refresh', detail: '#216', status: 'running', data: { type: 'issue', issue: feature(216, 'Logout clears the session; re-login refreshes the token', 'in-progress', { assignedAgent: 'claude-sonnet', attemptNumber: 2, criteriaCompleted: 1, criteriaTotal: 3, worktreeBranch: 'trailside/216-auto-run' }) } },
	{ id: 'c217', kind: 'card', label: 'Admin SSO settings', detail: '#217', status: 'planned', data: { type: 'issue', issue: feature(217, 'Admins can set the IdP and enforce SSO', 'open', { criteriaCompleted: 0, criteriaTotal: 2 }) } },
	{ id: 'c219', kind: 'card', label: 'Stale session after key rotation', detail: '#219 · hotfix', status: 'done', data: { type: 'issue', issue: feature(219, 'Sessions stay valid after the IdP rotates its signing key', 'closed', { labels: [{ name: 'incident', tone: 'danger' }], criteriaCompleted: 2, criteriaTotal: 2, linkedPrNumber: 307 }) } },

	{ id: 'a214-1', kind: 'attempt', label: 'Attempt 1', detail: 'sonnet · 1:16', status: 'superseded', data: { type: 'run', card: 214, attempt: 1 } },
	{ id: 'a214-2', kind: 'attempt', label: 'Attempt 2', detail: 'sonnet · 0:56', status: 'done', data: { type: 'run', card: 214, attempt: 2 } },
	{ id: 'a215-1', kind: 'attempt', label: 'Attempt 1', detail: 'sonnet · 1:32', status: 'done', data: { type: 'run', card: 215, attempt: 1 } },
	{ id: 'a216-1', kind: 'attempt', label: 'Attempt 1', detail: 'codex · 2:04', status: 'failed', data: { type: 'run', card: 216, attempt: 1 } },
	{ id: 'a216-2', kind: 'attempt', label: 'Attempt 2', detail: 'sonnet · running', status: 'running', data: { type: 'run', card: 216, attempt: 2 } },
	{ id: 'a219-1', kind: 'attempt', label: 'Attempt 1', detail: 'opus · 0:41', status: 'done', data: { type: 'run', card: 219, attempt: 1 } },

	{ id: 'p301', kind: 'pr', label: 'feat(auth): SSO login', detail: '#301 · +171 −44', status: 'merged', data: { type: 'pr', pr: pr(301, 'feat(auth): SSO login for the billing portal', 'merged', 171, 44, 214) } },
	{ id: 'p302', kind: 'pr', label: 'feat(auth): session cache', detail: '#302 · +64 −9', status: 'merged', data: { type: 'pr', pr: pr(302, 'feat(auth): cache verified sessions until exp', 'merged', 64, 9, 215) } },
	{ id: 'p305', kind: 'pr', label: 'feat(auth): logout + refresh', detail: '#305 · +88 −12', status: 'open', data: { type: 'pr', pr: pr(305, 'feat(auth): clear sessions on logout and refresh on re-login', 'open', 88, 12, 216, false) } },
	{ id: 'p307', kind: 'pr', label: 'fix(auth): refetch JWKS', detail: '#307 · +23 −4', status: 'merged', data: { type: 'pr', pr: pr(307, 'fix(auth): refetch the JWKS when a key id is unknown', 'merged', 23, 4, 219) } },

	{
		id: 'r280',
		kind: 'release',
		label: 'v2.8.0',
		detail: 'Oct 31',
		status: 'shipped',
		data: {
			type: 'release',
			release: {
				tag: 'v2.8.0',
				previousTag: 'v2.7.4',
				name: 'v2.8.0 · Sign in with SSO',
				target: 'main @ 4c1e9a2',
				groups: [{ id: 'features', title: 'Features', items: [{ text: 'Sign in to billing with your company IdP', pr: 301, author: 'claude-sonnet' }, { text: 'Faster checkout with cached sessions', pr: 302, author: 'claude-sonnet' }] }],
				assets: [{ name: 'billing-2.8.0.tar.gz', size: '6.1 MB' }]
			}
		}
	},
	{
		id: 'r281',
		kind: 'release',
		label: 'v2.8.1',
		detail: 'Nov 1',
		status: 'shipped',
		data: {
			type: 'release',
			release: {
				tag: 'v2.8.1',
				previousTag: 'v2.8.0',
				name: 'v2.8.1 · Key rotation fix',
				target: 'main @ 8d02f11',
				groups: [{ id: 'fixes', title: 'Bug fixes', items: [{ text: 'Sessions survive the IdP rotating its signing key', pr: 307, author: 'claude-opus' }] }],
				assets: [{ name: 'billing-2.8.1.tar.gz', size: '6.1 MB' }]
			}
		}
	},
	{
		id: 'i42',
		kind: 'incident',
		label: 'Logins failing after key rotation',
		detail: 'INC-42 · SEV2',
		status: 'resolved',
		data: {
			type: 'incident',
			incident: {
				id: 'INC-42',
				title: 'SSO logins failing after IdP key rotation',
				severity: 'SEV2',
				service: 'billing-auth',
				metricLabel: 'Login errors (%)',
				series: [0.2, 0.3, 0.2, 0.2, 9.4, 14.1, 13.8, 12.6, 3.1, 0.4, 0.3, 0.2],
				threshold: 2,
				suspect: { sha: '4c1e9a2', message: 'feat(auth): SSO login for the billing portal', pr: 301, deployedAt: 'Oct 31 16:02' },
				steps: [
					{ status: 'investigating', label: 'Alert fired', detail: 'Login errors crossed 2% · paged billing-oncall' },
					{ status: 'identified', label: 'Cause found', detail: 'The IdP rotated its key; the JWKS was cached forever' },
					{ status: 'mitigated', label: 'Hotfix card opened', detail: 'Card 219 dispatched to claude-opus (T3)' },
					{ status: 'resolved', label: 'Resolved', detail: 'v2.8.1 refetches the JWKS on an unknown key id' }
				]
			}
		}
	}
];

export const SAMPLE_LINEAGE_EDGES: LineageEdge[] = [
	{ from: 'f12', to: 'c214', rel: 'spawned' },
	{ from: 'f12', to: 'c215', rel: 'spawned' },
	{ from: 'f12', to: 'c216', rel: 'spawned' },
	{ from: 'f12', to: 'c217', rel: 'spawned' },
	{ from: 'f12', to: 'c219', rel: 'spawned' },
	{ from: 'c214', to: 'a214-1', rel: 'attempted' },
	{ from: 'c214', to: 'a214-2', rel: 'retried' },
	{ from: 'c215', to: 'a215-1', rel: 'attempted' },
	{ from: 'c216', to: 'a216-1', rel: 'attempted' },
	{ from: 'c216', to: 'a216-2', rel: 'retried' },
	{ from: 'c219', to: 'a219-1', rel: 'attempted' },
	{ from: 'a214-2', to: 'p301', rel: 'opened' },
	{ from: 'a215-1', to: 'p302', rel: 'opened' },
	{ from: 'a216-2', to: 'p305', rel: 'opened' },
	{ from: 'a219-1', to: 'p307', rel: 'opened' },
	{ from: 'p301', to: 'r280', rel: 'shipped-in' },
	{ from: 'p302', to: 'r280', rel: 'shipped-in' },
	{ from: 'p307', to: 'r281', rel: 'shipped-in' },
	{ from: 'r280', to: 'i42', rel: 'caused' },
	{ from: 'i42', to: 'c219', rel: 'fixed-by', backlink: true }
];

/** Day 0 of the F-12 timeline. */
export const SAMPLE_FEATURE_START = '2026-10-20';
/** Today on the F-12 timeline, in days from the start. */
export const SAMPLE_TIMELINE_TODAY = 13;

/** F-12's cards: planned windows against what happened, in days from `SAMPLE_FEATURE_START`. */
export const SAMPLE_TIMELINE_ITEMS: TimelineItem[] = [
	{ id: 'c214', label: 'SSO login', detail: '#214 · 2 attempts', status: 'done', planned: [0, 5], actual: [0, 6] },
	{ id: 'c215', label: 'Session cache', detail: '#215', status: 'done', planned: [3, 8], actual: [4, 8] },
	{ id: 'c216', label: 'Logout and token refresh', detail: '#216 · attempt 2', status: 'running', planned: [6, 11], actual: [8], forecast: 15 },
	{ id: 'c217', label: 'Admin SSO settings', detail: '#217 · waiting on 216', status: 'planned', planned: [10, 15] },
	{ id: 'c219', label: 'Stale session after key rotation', detail: '#219 · hotfix', status: 'done', planned: [11.7, 12.2], actual: [11.7, 12] }
];

export const SAMPLE_TIMELINE_MILESTONES: TimelineMilestone[] = [
	{ id: 'r280', t: 11, label: 'v2.8.0 shipped', kind: 'release' },
	{ id: 'i42', t: 11.6, label: 'INC-42: logins failing', kind: 'incident' },
	{ id: 'r281', t: 12, label: 'v2.8.1 shipped', kind: 'release' },
	{ id: 'due', t: 16, label: 'Billing portal launch', kind: 'deadline' }
];

/** Token budget for the sample run. */
export const SAMPLE_TOKEN_BUDGET = 20_000;

/** Cumulative tokens spent across every model in the sample run, sampled every 4 s. */
export const SAMPLE_BURN_POINTS: BurnPoint[] = (() => {
	let spent = 0;
	return SAMPLE_TIMES.map((t, i) => {
		if (i > 0) for (const s of SAMPLE_MODEL_SERIES) spent += (s.points[i - 1]?.value ?? 0) * 4;
		return { t, spent };
	});
})();

/** The moments of the sample run, for the scrubber and the burn chart. */
export const SAMPLE_RUN_MARKS: RunMark[] = [
	{ id: 'h1', t: 38, label: 'Planner hands plan.md to the implementer', kind: 'handoff' },
	{ id: 'e1', t: 64, label: 'Rate limited: fell back to claude-haiku', kind: 'decision' },
	{ id: 'e2', t: 76, label: 'Back on claude-sonnet', kind: 'decision' },
	{ id: 'h2', t: 118, label: 'Diff +142 −38 sent for a test run', kind: 'handoff' },
	{ id: 'h3', t: 146, label: '2 tests failed: retrying the implementation', kind: 'error' },
	{ id: 'h4', t: 206, label: 'Tests green: diff +171 −44 sent for review', kind: 'handoff' },
	{ id: 'e3', t: 232, label: 'Review escalated to claude-opus (risk T3)', kind: 'decision' },
	{ id: 'h5', t: 250, label: 'Review approved', kind: 'handoff' },
	{ id: 'done', t: 282, label: 'Verified: all 4 criteria met', kind: 'done' }
];

/** The fleet over the last 24 hours, for `MetricTiles`: 4 of 6 slots busy, merges up, time to merge down. */
export const SAMPLE_FLEET_METRICS: Metric[] = [
	{ id: 'runs', label: 'Runs per hour', value: 7.4, unit: '/h', previous: 6.9, better: 'up', series: [5, 6, 6.5, 6, 7, 7.2, 7.4] },
	{ id: 'merges', label: 'Merges per hour', value: 3.2, unit: '/h', previous: 2.1, better: 'up', series: [1.8, 2.2, 2, 2.6, 2.9, 3, 3.2] },
	{ id: 'ttm', label: 'Ready to merged', value: 2280, format: 'duration', previous: 3060, better: 'down', series: [3400, 3100, 3000, 2700, 2500, 2400, 2280], hint: 'Median' },
	{ id: 'slots', label: 'Busy slots', value: 4, max: 6, hint: '2 free' }
];
