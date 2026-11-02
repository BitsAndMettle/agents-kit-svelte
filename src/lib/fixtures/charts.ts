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

export const SAMPLE_HANDOFFS: HandoffLink[] = [
	{ id: 'h1', from: 'plan-1', to: 'impl-1', artifact: 'plan.md', reason: 'Plan approved: 4 steps across 6 files.' },
	{ id: 'h2', from: 'impl-1', to: 'verify-1', artifact: 'diff +142 −38', reason: 'Implementation done; asking for the test run.' },
	{ id: 'h3', from: 'verify-1', to: 'impl-2', artifact: '2 failing tests', reason: 'session.test.ts expects a refreshed token after SSO login.' },
	{ id: 'h4', from: 'impl-2', to: 'review-1', artifact: 'diff +171 −44', reason: 'Tests green; requesting review.' },
	{ id: 'h5', from: 'review-1', to: 'verify-2', artifact: 'review: approve', reason: 'One nit fixed inline, then approved.' }
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
