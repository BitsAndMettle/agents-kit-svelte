import assert from 'node:assert/strict';
import test from 'node:test';
import { foldedTime, formatClock, idleBreaks, linePath, niceMax, scaleBroken, scaleLinear, stack, ticks, timeTicks } from '../src/lib/charts/scale.ts';
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

test('scaleBroken gives each break its width, shares the rest out evenly and inverts', () => {
	const x = scaleBroken([0, 1100], [0, 236], [{ start: 100, end: 1000 }], 36);
	assert.equal(x(100), 100);
	assert.equal(x(1000), 136);
	assert.equal(x(550), 118);
	assert.equal(x(1100), 236);
	for (const t of [0, 50, 550, 1050]) assert.equal(x.invert(x(t)), t);
	// No break in the domain: plain linear.
	assert.equal(scaleBroken([0, 100], [0, 500], [{ start: 200, end: 300 }], 36)(50), scaleLinear([0, 100], [0, 500])(50));
	// Overlapping breaks fold as one, clipped to the domain.
	const merged = scaleBroken([0, 300], [0, 136], [{ start: 100, end: 250 }, { start: 200, end: 400 }], 36);
	assert.equal(merged(100), 100);
	assert.equal(merged(300), 136);
});

test('scaleBroken at width 0 drops the folded time, so a scrubber runs on work time', () => {
	const x = scaleBroken([0, 1100], [0, 200], [{ start: 100, end: 1000 }], 0);
	assert.equal(x(100), 100);
	assert.equal(x(1000), 100);
	assert.equal(x.invert(100), 100);
	assert.equal(x.invert(150), 1050);
});

test('idleBreaks finds a gap across lanes, none under a running span', () => {
	const spans = [{ start: 0, end: 50 }, { start: 40, end: 100 }, { start: 5000, end: 5100 }, { start: 5050, end: 5200 }];
	assert.deepEqual(idleBreaks(spans, 3600), [{ start: 100, end: 5000 }]);
	assert.deepEqual(idleBreaks(spans, 6000), []);
	// A span still running covers everything after its start.
	assert.deepEqual(idleBreaks([{ start: 0, end: 50 }, { start: 60 }, { start: 9000, end: 9100 }], 3600), []);
	assert.deepEqual(idleBreaks([{ start: 0 }], 3600, 9000), []);
	// With `now`, the quiet stretch since the last span folds too.
	assert.deepEqual(idleBreaks([{ start: 0, end: 50 }], 3600, 9000), [{ start: 50, end: 9000 }]);
	assert.equal(foldedTime([{ start: 100, end: 5000 }], 0, 1000), 900);
});

test('timeTicks fall on time steps over the unfolded time, none in a break', () => {
	assert.deepEqual(timeTicks([0, 284], 5), [0, 60, 120, 180, 240]);
	const hours = timeTicks([9 * 3600, 33 * 3600], 4, [{ start: 18 * 3600, end: 32 * 3600 }]);
	assert.deepEqual(hours, [9, 12, 15, 18, 33].map((h) => h * 3600));
	assert.deepEqual(timeTicks([0, 3 * 86_400], 3), [0, 86_400, 172_800, 259_200]);
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

import { formatDay, projectBurn } from '../src/lib/charts/scale.ts';

test('formatDay shows a date when a start is known, else a day number', () => {
	assert.equal(formatDay(0, '2026-10-20'), 'Oct 20');
	assert.equal(formatDay(11.6, '2026-10-20'), 'Oct 31');
	assert.equal(formatDay(13, '2026-10-20'), 'Nov 2');
	assert.equal(formatDay(3), 'Day 3');
});

test('projectBurn measures the trailing rate and finds where the budget runs out', () => {
	const points = [
		{ t: 0, spent: 0 },
		{ t: 60, spent: 600 },
		{ t: 120, spent: 1200 }
	];
	const burn = projectBurn(points, 240, 2000, 60);
	assert.equal(burn.rate, 10);
	assert.equal(burn.projected, 2400);
	assert.equal(burn.crossesAt, 200);
	assert.equal(projectBurn(points, 240, 5000).crossesAt, null);
	assert.equal(projectBurn([...points, { t: 180, spent: 2100 }], 240, 2000).crossesAt, 180);
});
