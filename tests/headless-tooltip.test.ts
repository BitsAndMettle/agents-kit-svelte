import assert from 'node:assert/strict';
import test from 'node:test';
import { openDelay } from '../src/lib/headless/logic/delay-group.ts';

const timing = { delay: 600, skipDelay: 300 };

test('a cold group waits for the delay', () => {
	assert.deepEqual(openDelay({ showing: false, lastClosedAt: -Infinity }, { ...timing, now: 1000 }), { wait: 600, instant: false });
});

test('a visible tooltip is replaced at once', () => {
	assert.deepEqual(openDelay({ showing: true, lastClosedAt: -Infinity }, { ...timing, now: 1000 }), { wait: 0, instant: true });
});

test('within skipDelay of a close the next tooltip skips the delay', () => {
	assert.deepEqual(openDelay({ showing: false, lastClosedAt: 800 }, { ...timing, now: 1099 }), { wait: 0, instant: true });
});

test('once skipDelay has passed the group is cold again', () => {
	assert.deepEqual(openDelay({ showing: false, lastClosedAt: 800 }, { ...timing, now: 1100 }), { wait: 600, instant: false });
});

test('a zero or negative delay opens at once without counting as a skip', () => {
	assert.deepEqual(openDelay({ showing: false, lastClosedAt: -Infinity }, { now: 0, delay: 0, skipDelay: 300 }), { wait: 0, instant: false });
	assert.deepEqual(openDelay({ showing: false, lastClosedAt: -Infinity }, { now: 0, delay: -5, skipDelay: 300 }), { wait: 0, instant: false });
});

test('skipDelay 0 turns the skip off', () => {
	assert.deepEqual(openDelay({ showing: false, lastClosedAt: 1000 }, { now: 1000, delay: 600, skipDelay: 0 }), { wait: 600, instant: false });
});
