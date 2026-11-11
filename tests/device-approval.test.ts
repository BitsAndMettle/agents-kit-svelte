import assert from 'node:assert/strict';
import test from 'node:test';
import {
	formatDuration,
	formatRequestedAgo,
	groupCode,
	speakCode,
	timeLeft
} from '../src/lib/agents/device-approval.ts';

test('groupCode groups digits and keeps existing grouping', () => {
	assert.deepEqual(groupCode('482913'), ['482', '913']);
	assert.deepEqual(groupCode('482 913'), ['482', '913']);
	assert.deepEqual(groupCode('maple-river-nine'), ['maple', 'river', 'nine']);
	assert.deepEqual(groupCode('  '), []);
});

test('speakCode reads digits one by one and words as written', () => {
	assert.equal(speakCode('482 913'), 'four eight two, nine one three');
	assert.equal(speakCode('maple river'), 'maple, river');
});

test('formatDuration', () => {
	assert.equal(formatDuration(45_000), '45 sec');
	assert.equal(formatDuration(240_000), '4 min');
	assert.equal(formatDuration(3_900_000), '1 h 5 min');
	assert.equal(formatDuration(-5), '0 sec');
});

test('timeLeft counts down and expires', () => {
	const now = '2026-11-11T10:00:00Z';
	assert.equal(timeLeft('2026-11-11T10:04:00Z', now)?.label, '4 min left');
	assert.equal(timeLeft('2026-11-11T09:59:59Z', now)?.expired, true);
	assert.equal(timeLeft('2026-11-11T10:00:00Z', now)?.label, 'Expired');
	assert.equal(timeLeft(undefined, now), null);
	assert.equal(timeLeft('nope', now), null);
});

test('formatRequestedAgo', () => {
	const now = '2026-11-11T10:00:00Z';
	assert.equal(formatRequestedAgo('2026-11-11T09:59:55Z', now), 'just now');
	assert.equal(formatRequestedAgo('2026-11-11T09:58:00Z', now), '2 min ago');
	assert.equal(formatRequestedAgo('bad', now), '');
});
