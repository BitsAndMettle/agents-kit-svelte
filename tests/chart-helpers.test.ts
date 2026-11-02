import assert from 'node:assert/strict';
import test from 'node:test';
import { formatClock, linePath, niceMax, scaleLinear, stack, ticks } from '../src/lib/charts/scale.ts';
import { eventsAt, handoffsAt, seriesAt, spansAt } from '../src/lib/charts/replay.ts';
import {
	SAMPLE_HANDOFFS,
	SAMPLE_HANDOFF_SPANS,
	SAMPLE_MODEL_EVENTS,
	SAMPLE_MODEL_SERIES
} from '../src/lib/fixtures/charts.ts';

test('scales map and invert', () => {
	const x = scaleLinear([0, 100], [0, 500]);
	assert.equal(x(50), 250);
	assert.equal(x.invert(250), 50);
});

test('ticks land on round steps and niceMax rounds up', () => {
	assert.deepEqual(ticks(0, 284, 6), [0, 50, 100, 150, 200, 250]);
	assert.equal(niceMax(481, 5), 500);
	assert.equal(niceMax(0), 1);
});

test('linePath draws through every point without overshooting a flat run', () => {
	const d = linePath([[0, 10], [10, 10], [20, 0]]);
	assert.match(d, /^M0,10C/);
	assert.ok(d.endsWith('20,0'));
	// The flat first segment keeps both control points at y=10.
	assert.match(d, /^M0,10C3\.3,10,6\.7,10,10,10/);
});

test('stack piles series on top of each other', () => {
	const a = new Map([[0, 2], [1, 3]]);
	const b = new Map([[0, 1]]);
	assert.deepEqual(stack([a, b], [0, 1]), [
		[[0, 0, 2], [1, 0, 3]],
		[[0, 2, 3], [1, 3, 3]]
	]);
});

test('formatClock', () => {
	assert.equal(formatClock(0), '0:00');
	assert.equal(formatClock(284), '4:44');
	assert.equal(formatClock(3725), '1:02:05');
});

test('replay shows the run as it stood at a moment', () => {
	const at100 = spansAt(SAMPLE_HANDOFF_SPANS, 100);
	assert.deepEqual(at100.map((s) => [s.id, s.status]), [['plan-1', 'done'], ['impl-1', 'running']]);
	assert.equal(at100[1].end, undefined);

	// The first attempt reads done until its retry starts, then superseded.
	assert.equal(spansAt(SAMPLE_HANDOFF_SPANS, 140).find((s) => s.id === 'impl-1')?.status, 'done');
	assert.equal(spansAt(SAMPLE_HANDOFF_SPANS, 160).find((s) => s.id === 'impl-1')?.status, 'superseded');

	assert.deepEqual(handoffsAt(SAMPLE_HANDOFFS, SAMPLE_HANDOFF_SPANS, 125).map((h) => h.id), ['h1', 'h2']);
	assert.ok(seriesAt(SAMPLE_MODEL_SERIES, 20).every((s) => s.points.every((p) => p.t <= 20)));
	assert.deepEqual(eventsAt(SAMPLE_MODEL_EVENTS, 70).map((e) => e.id), ['e1']);
});
