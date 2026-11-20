import assert from 'node:assert/strict';
import { test } from 'node:test';
import { phaseColor } from '../src/lib/charts/scale.ts';
import type { HandoffLane, HandoffSpan } from '../src/lib/charts/types.ts';
import { SAMPLE_HANDOFF_LANES, SAMPLE_HANDOFF_SPANS, SAMPLE_HANDOFFS } from '../src/lib/fixtures/charts.ts';
import { ssr } from './ssr.ts';

const { load, html } = ssr();
const GANTT = '/src/lib/charts/AgentHandoffGantt.svelte';

const LANES: HandoffLane[] = [
	{ id: 'a', label: '#71 Keep the edits', worker: 'Claude Code', note: '≈ 08:10' },
	{ id: 'b', label: '#72 Controls', note: 'Waits for #71' }
];
const SPANS: HandoffSpan[] = [
	{ id: 'a1', lane: 'a', phase: 'implement', start: 0, end: 60, status: 'done', tokens: 100 },
	{ id: 'a2', lane: 'a', phase: 'implement', start: 60, end: 600, status: 'planned', tokens: 5000, label: 'Estimate' }
];

test('AgentHandoffGantt: without the new props, nothing of them is drawn or said', async () => {
	const out = html(await load(GANTT), { lanes: SAMPLE_HANDOFF_LANES, spans: SAMPLE_HANDOFF_SPANS, handoffs: SAMPLE_HANDOFFS, onSelectLane: () => {} });
	assert.doesNotMatch(out, /worked by|clip-path|<tspan|ak-breathe|Planned/);
	assert.match(out, /<svg[^>]*height="218"/, 'four 46px lanes under a 26px axis');
});

test('AgentHandoffGantt: a planned span is outlined, no button, and outside Live, Elapsed and the tokens', async () => {
	const out = html(await load(GANTT), { lanes: LANES, spans: SPANS, onSelectSpan: () => {} });
	assert.match(out, /<g role="img" aria-label="Estimate, Planned, 1:00 to 10:00"/);
	assert.equal(out.match(/role="button" tabindex="0"/g)?.length, 1, 'only the real span is pressable');
	assert.doesNotMatch(out, />Live</);
	assert.match(out, /<dd>1:00<\/dd>/, 'Elapsed stops at the last real span');
	assert.match(out, /<dd>100 tokens<\/dd>/);
	assert.match(out, /stroke-dasharray="3 3"/);
	assert.match(out, /Planned<\/li>/);
});

test('AgentHandoffGantt: a note a lane, at its end, and lanes as tall as asked', async () => {
	const out = html(await load(GANTT), { lanes: LANES, spans: SPANS, laneHeight: 30, labelWidth: 60 });
	assert.match(out, /<text[^>]*>≈ 08:10<\/text>/);
	assert.match(out, /<text[^>]*>Waits for #71<\/text>/);
	assert.match(out, /<svg[^>]*height="94"/, 'two 30px lanes under a 26px axis');
});

test('AgentHandoffGantt: the worker is one breathing avatar at the end of the label, and said in the lane’s name', async () => {
	const Gantt = await load(GANTT);
	const pressable = html(Gantt, { lanes: LANES, spans: SPANS, labelWidth: 60, onSelectLane: () => {} });
	assert.equal(pressable.match(/ak-breathe/g)?.length, 1);
	assert.match(pressable, /<span style="left: 38px; top: 41px" class="[^"]*size-4[^"]*ak-breathe pointer-events-none absolute"><span[^>]*><span aria-hidden="true">CC<\/span> <\/span>\s*<\/span>/);
	assert.match(pressable, /aria-label="#71 Keep the edits, worked by Claude Code"/);
	assert.match(pressable, /aria-label="#72 Controls"/);
	// The label ends 22px sooner on that lane only, before the avatar.
	assert.match(pressable, /<clipPath id="([^"]+)-label"><rect width="32"/);
	assert.equal(pressable.match(/clip-path="url\(#[^"]+-label\)"/g)?.length, 1);

	const still = html(Gantt, { lanes: LANES, spans: SPANS });
	assert.match(still, />#71 Keep the edits<tspan class="fill-transparent">, worked by Claude Code<\/tspan><\/text>/);
});

test('AgentHandoffGantt: with folds, each stretch of open time is labelled at its own start', async () => {
	const spans: HandoffSpan[] = [
		{ id: 'x', lane: 'a', phase: 'implement', start: 9 * 3600, end: 10 * 3600, status: 'done' },
		{ id: 'y', lane: 'a', phase: 'review', start: 31 * 3600 + 59 * 60, end: 33 * 3600, status: 'done' }
	];
	const hhmm = (s: number) => `${String(Math.floor(s / 3600) % 24).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
	const out = html(await load(GANTT), { lanes: LANES, spans, breaks: [{ start: 10 * 3600, end: 31 * 3600 + 59 * 60 }], formatTime: hhmm });
	assert.match(out, /<text y="16" text-anchor="start"[^>]*>09:00<\/text>/);
	assert.match(out, /<text x="4" y="16" text-anchor="start"[^>]*>07:59<\/text>/);
	assert.doesNotMatch(out, /stroke-dasharray="2 4"/, 'grid lines are solid');
});

test('phaseColor: gate and queue take the neutral ink', () => {
	assert.equal(phaseColor('gate'), 'var(--ak-color-fg-muted)');
	assert.equal(phaseColor('queue', 3), 'var(--ak-color-fg-muted)');
	assert.equal(phaseColor('review'), 'var(--ak-chart-3)');
});

test('Avatar: 2xs is 16px, as AvatarGroup’s count', async () => {
	assert.match(html(await load('/src/lib/primitives/display/Avatar.svelte'), { name: 'Red team', size: '2xs' }), /class="relative inline-flex shrink-0 align-middle rounded-full size-4 text-\[8px\]/);
	const group = html(await load('/src/lib/primitives/display/AvatarGroup.svelte'), { items: [{ name: 'A' }, { name: 'B' }], max: 1, size: '2xs' });
	assert.match(group, /size-4 text-\[8px\][^"]*"><span aria-hidden="true">\+1</);
});
