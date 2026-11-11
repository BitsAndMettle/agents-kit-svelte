import assert from 'node:assert/strict';
import test from 'node:test';
import { levelChanges, levelDirection, stepIndex } from '../src/lib/agents/level-dial.ts';
import { SAMPLE_AUTONOMY_LEVELS } from '../src/lib/fixtures/chat.ts';

const [careful, balanced, trusted] = SAMPLE_AUTONOMY_LEVELS;

test('levelChanges lists what a higher level newly allows and stops asking', () => {
	const changes = levelChanges(careful, balanced);
	assert.ok(changes.allowsAdded.length > 0);
	assert.deepEqual(changes.allowsRemoved, []);
	for (const item of changes.allowsAdded) assert.ok(!careful.allows?.includes(item));
	for (const item of changes.asksRemoved) assert.ok(careful.asks?.includes(item));
});

test('levelChanges handles missing lists and identical levels', () => {
	const bare = { id: 'a', label: 'A', summary: '' };
	assert.deepEqual(levelChanges(bare, bare), {
		allowsAdded: [],
		allowsRemoved: [],
		asksAdded: [],
		asksRemoved: []
	});
	assert.deepEqual(levelChanges(bare, { ...bare, allows: ['x'] }).allowsAdded, ['x']);
});

test('levelChanges going down reverses going up', () => {
	const up = levelChanges(balanced, trusted);
	const down = levelChanges(trusted, balanced);
	assert.deepEqual(up.allowsAdded, down.allowsRemoved);
	assert.deepEqual(up.asksRemoved, down.asksAdded);
});

test('levelDirection compares positions', () => {
	assert.equal(levelDirection(SAMPLE_AUTONOMY_LEVELS, 'careful', 'trusted'), 'up');
	assert.equal(levelDirection(SAMPLE_AUTONOMY_LEVELS, 'trusted', 'careful'), 'down');
	assert.equal(levelDirection(SAMPLE_AUTONOMY_LEVELS, 'careful', 'careful'), null);
	assert.equal(levelDirection(SAMPLE_AUTONOMY_LEVELS, 'careful', 'nope'), null);
});

test('stepIndex clamps at both ends', () => {
	assert.equal(stepIndex(0, -1, 4), 0);
	assert.equal(stepIndex(3, 1, 4), 3);
	assert.equal(stepIndex(1, 1, 4), 2);
	assert.equal(stepIndex(0, 1, 0), 0);
});
