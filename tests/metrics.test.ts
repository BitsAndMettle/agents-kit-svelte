import assert from 'node:assert/strict';
import test from 'node:test';
import { capacityPercent, deltaVerdict, describeMetric, formatDeltaAmount, formatMetricDuration, formatMetricValue, formatNumber, metricDelta, sparkline } from '../src/lib/charts/metrics.ts';
import { SAMPLE_FLEET_METRICS } from '../src/lib/fixtures/charts.ts';
import { clockTime, relativeTime } from '../src/lib/agents/presence.ts';

test('metricDelta gives direction, size and percent, and no percent from a zero previous', () => {
	assert.deepEqual(metricDelta(3, 2), { diff: 1, direction: 'up', percent: 50 });
	assert.equal(metricDelta(1, 4).direction, 'down');
	assert.equal(metricDelta(5, 5).direction, 'flat');
	assert.equal(metricDelta(0.1 + 0.2, 0.3).direction, 'flat', 'float noise is not a change');
	const fromZero = metricDelta(4, 0);
	assert.equal(fromZero.direction, 'up');
	assert.equal(fromZero.percent, null);
	assert.equal(metricDelta(0, 0).percent, null);
});

test('deltaVerdict colours by the preferred direction and stays neutral without one', () => {
	assert.equal(deltaVerdict('up', 'up'), 'better');
	assert.equal(deltaVerdict('down', 'up'), 'worse');
	assert.equal(deltaVerdict('down', 'down'), 'better');
	assert.equal(deltaVerdict('up'), 'neutral');
	assert.equal(deltaVerdict('flat', 'up'), 'neutral');
});

test('formatNumber and formatMetricDuration read cleanly', () => {
	assert.equal(formatNumber(3.2), '3.2');
	assert.equal(formatNumber(4), '4');
	assert.equal(formatNumber(1234.56), '1,235');
	assert.equal(formatNumber(2.04), '2');
	assert.equal(formatNumber(-0.01), '0');
	assert.equal(formatNumber(Number.NaN), '–');
	assert.equal(formatMetricDuration(45), '45s');
	assert.equal(formatMetricDuration(2280), '38m');
	assert.equal(formatMetricDuration(3900), '1h 05m');
	assert.equal(formatMetricDuration(7200), '2h');
	assert.equal(formatMetricDuration(97200), '1d 3h');
	assert.deepEqual(formatMetricValue(93, 'percent'), { text: '93', unit: '%' });
	assert.deepEqual(formatMetricValue(3.2, 'number', '/h'), { text: '3.2', unit: '/h' });
	assert.equal(formatDeltaAmount(-780, 'duration'), '13m');
	assert.equal(formatDeltaAmount(1.1000000000000001, 'number', '/h'), '1.1/h');
});

test('sparkline handles empty, single, flat and rising series', () => {
	assert.deepEqual(sparkline([], 72, 24), { points: [], line: '' });
	const one = sparkline([5], 72, 24);
	assert.deepEqual(one.points, [[36, 12]]);
	assert.equal(one.line, '');
	const flat = sparkline([2, 2, 2], 72, 24);
	assert.ok(flat.points.every(([, y]) => y === 12), 'all-equal values sit on the middle line');
	assert.match(flat.line, /^M3\.0 12\.0 L/);
	const rising = sparkline([1, 2, 3], 72, 24, 3);
	assert.deepEqual(rising.points[0], [3, 21]);
	assert.deepEqual(rising.points[2], [69, 3]);
	assert.deepEqual(sparkline([1, Number.NaN, 3], 72, 24).points.length, 2, 'ignores non-finite values');
});

test('capacityPercent clamps and survives a zero max', () => {
	assert.equal(capacityPercent(4, 6).toFixed(1), '66.7');
	assert.equal(capacityPercent(9, 6), 100);
	assert.equal(capacityPercent(-1, 6), 0);
	assert.equal(capacityPercent(3, 0), 0);
});

test('describeMetric says what a screen reader should hear', () => {
	assert.equal(describeMetric({ id: 'm', label: 'Merges per hour', value: 3.2, previous: 2.1, better: 'up' }), 'Merges per hour, 3.2, up 1.1 from 2.1, better');
	assert.equal(describeMetric({ id: 'm', label: 'Merges', value: 3.2, unit: '/h', previous: 2.1 }), 'Merges, 3.2 per hour, up 1.1 from 2.1');
	assert.equal(describeMetric({ id: 't', label: 'Ready to merged', value: 2280, format: 'duration', previous: 3060, better: 'down' }), 'Ready to merged, 38m, down 13m from 51m, better');
	assert.equal(describeMetric({ id: 's', label: 'Busy slots', value: 4, max: 6, hint: '2 free' }), 'Busy slots, 4 of 6, 2 free');
	assert.equal(describeMetric({ id: 'p', label: 'Pass rate', value: 93, format: 'percent', previous: 93 }), 'Pass rate, 93 percent, unchanged from 93');
	assert.equal(describeMetric({ id: 'z', label: 'Failures', value: 2, previous: 0, better: 'down' }), 'Failures, 2, up 2 from 0, worse');
});

test('the fleet fixture tells one story', () => {
	const byId = Object.fromEntries(SAMPLE_FLEET_METRICS.map((m) => [m.id, m]));
	assert.equal(byId.slots.value, 4);
	assert.equal(byId.slots.max, 6);
	assert.equal(metricDelta(byId.merges.value, byId.merges.previous!).direction, 'up');
	const ttm = byId.ttm;
	assert.equal(deltaVerdict(metricDelta(ttm.value, ttm.previous!).direction, ttm.better), 'better');
});

test('relativeTime reads as short text and tolerates bad input', () => {
	const now = '2026-11-11T02:22:00Z';
	assert.equal(relativeTime('2026-11-11T02:10:00Z', now), '12 min');
	assert.equal(relativeTime('2026-11-11T02:21:30Z', now), 'under a minute');
	assert.equal(relativeTime('2026-11-11T02:22:00Z', now), 'under a minute');
	assert.equal(relativeTime('2026-11-11T02:30:00Z', now), 'under a minute', 'the future counts as now');
	assert.equal(relativeTime('2026-11-10T23:12:00Z', now), '3 h 10 min');
	assert.equal(relativeTime('2026-11-11T00:22:00Z', now), '2 h');
	assert.equal(relativeTime('2026-11-10T02:22:00Z', now), '1 day');
	assert.equal(relativeTime('2026-11-08T02:22:00Z', now), '3 days');
	assert.equal(relativeTime('not a time', now), '');
	assert.equal(relativeTime(Date.parse('2026-11-11T02:10:00Z'), new Date(now)), '12 min', 'accepts numbers and dates');
});

test('clockTime formats in a given zone, UTC by default', () => {
	assert.equal(clockTime('2026-11-11T02:10:00Z'), '02:10');
	assert.equal(clockTime('2026-11-11T02:10:00Z', 'Europe/Berlin'), '03:10');
	assert.equal(clockTime('2026-11-11T02:10:00Z', 'Not/AZone'), '');
	assert.equal(clockTime('nope'), '');
});
