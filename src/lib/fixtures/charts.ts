/**
 * Sample data for the Charts & Timelines collection: one agent run on a feature card, from plan to
 * verified, with a failed first attempt, a rate-limit fallback and an escalated review.
 * Import from `agents-kit-svelte/fixtures`; components never fall back to it.
 */
import type {
	ChartSpec,
	HandoffLane,
	HandoffLink,
	HandoffSpan,
	ModelEvent,
	ModelSeries,
	PhaseBand
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
