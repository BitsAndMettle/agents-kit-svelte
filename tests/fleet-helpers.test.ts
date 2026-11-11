import assert from 'node:assert/strict';
import test from 'node:test';
import { formatElapsed } from '../src/lib/core/time.ts';
import { clampSlots, fleetSummary, slotSegments, workPreview } from '../src/lib/agents-ui/fleet.ts';
import { SAMPLE_FLEET_NOW, SAMPLE_MACHINES } from '../src/lib/fixtures/workflows.ts';

test('fleetSummary counts slots and presence', () => {
	assert.deepEqual(fleetSummary(SAMPLE_MACHINES), { busy: 4, total: 10, machines: 3, online: 1, stale: 1, offline: 1 });
});

test('clampSlots keeps used within total', () => {
	assert.deepEqual(clampSlots({ used: 9, total: 4 }), { used: 4, total: 4 });
	assert.deepEqual(clampSlots({ used: -1, total: 2 }), { used: 0, total: 2 });
});

test('slotSegments draws one segment per slot and caps long bars', () => {
	assert.deepEqual(slotSegments({ used: 2, total: 3 }), ['busy', 'busy', 'free']);
	assert.deepEqual(slotSegments({ used: 0, total: 0 }), []);
	const long = slotSegments({ used: 50, total: 100 });
	assert.equal(long.length, 24);
	assert.equal(long.filter((x) => x === 'busy').length, 12);
	assert.equal(slotSegments({ used: 1, total: 100 }).filter((x) => x === 'busy').length, 1);
});

test('formatElapsed floors, has no "ago" and agrees with the banner', () => {
	const now = '2026-11-11T12:00:00Z';
	assert.equal(formatElapsed('2026-11-11T11:59:50Z', now), 'under a minute');
	assert.equal(formatElapsed('2026-11-11T11:57:40Z', now), '2 min');
	assert.equal(formatElapsed('2026-11-11T09:00:00Z', now), '3 h');
	assert.equal(formatElapsed('2026-11-08T12:00:00Z', now), '3 days');
	assert.equal(formatElapsed('nope', now), '');
	assert.equal(formatElapsed(SAMPLE_MACHINES[1].lastSeen!, SAMPLE_FLEET_NOW), '3 h');
});

test('workPreview collapses past three', () => {
	const w = [1, 2, 3, 4, 5].map((n) => ({ id: String(n), label: `#${n}` }));
	assert.deepEqual(workPreview(w), { shown: w.slice(0, 3), more: 2 });
	assert.equal(workPreview(w.slice(0, 3)).more, 0);
});
