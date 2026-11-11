import assert from 'node:assert/strict';
import test from 'node:test';
import { clampSlots, fleetSummary, missingFlags, relativeTime, slotSegments, workPreview } from '../src/lib/agents-ui/fleet.ts';
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

test('relativeTime reads in coarse units', () => {
	const now = '2026-11-11T12:00:00Z';
	assert.equal(relativeTime('2026-11-11T11:59:50Z', now), 'just now');
	assert.equal(relativeTime('2026-11-11T11:55:00Z', now), '5 min ago');
	assert.equal(relativeTime('2026-11-11T09:00:00Z', now), '3 h ago');
	assert.equal(relativeTime('2026-11-08T12:00:00Z', now), '3 d ago');
	assert.equal(relativeTime(undefined, now), '');
	assert.equal(relativeTime('nope', now), '');
	assert.equal(relativeTime(SAMPLE_MACHINES[1].lastSeen, SAMPLE_FLEET_NOW), '3 h ago');
});

test('workPreview collapses past three', () => {
	const w = [1, 2, 3, 4, 5].map((n) => ({ id: String(n), label: `#${n}` }));
	assert.deepEqual(workPreview(w), { shown: w.slice(0, 3), more: 2 });
	assert.equal(workPreview(w.slice(0, 3)).more, 0);
});

test('missingFlags returns only warnings', () => {
	assert.deepEqual(missingFlags(SAMPLE_MACHINES[1]).map((f) => f.id), ['confined']);
	assert.deepEqual(missingFlags(SAMPLE_MACHINES[0]), []);
});
