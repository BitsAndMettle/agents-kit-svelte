import assert from 'node:assert/strict';
import test from 'node:test';
import { addValues, rangeValues, sameValues, toggleAll, toggleValue } from '../src/lib/headless/logic/selection.ts';

const order = ['a', 'b', 'c', 'd', 'e'];

test('single selection replaces, even when the value is already selected', () => {
	assert.deepEqual(toggleValue([], 'b', false), ['b']);
	assert.deepEqual(toggleValue(['a'], 'b', false), ['b']);
	assert.deepEqual(toggleValue(['b'], 'b', false), ['b']);
});

test('multiple selection toggles and keeps selection order', () => {
	assert.deepEqual(toggleValue(['c'], 'a', true), ['c', 'a']);
	assert.deepEqual(toggleValue(['c', 'a'], 'c', true), ['a']);
});

test('a range runs in DOM order whichever end comes first', () => {
	assert.deepEqual(rangeValues(order, 'b', 'd'), ['b', 'c', 'd']);
	assert.deepEqual(rangeValues(order, 'd', 'b'), ['b', 'c', 'd']);
	assert.deepEqual(rangeValues(order, 'c', 'c'), ['c']);
});

test('a range with a missing anchor is just the target; a missing target is empty', () => {
	assert.deepEqual(rangeValues(order, null, 'c'), ['c']);
	assert.deepEqual(rangeValues(order, 'filtered-away', 'c'), ['c']);
	assert.deepEqual(rangeValues(order, 'a', 'gone'), []);
});

test('addValues is a union that keeps existing order first', () => {
	assert.deepEqual(addValues(['d', 'a'], ['a', 'b', 'c']), ['d', 'a', 'b', 'c']);
});

test('toggleAll selects everything, then clears what it selected', () => {
	assert.deepEqual(toggleAll(['b'], order), ['b', 'a', 'c', 'd', 'e']);
	assert.deepEqual(toggleAll(order, order), []);
	// Values outside `all` (filtered away) survive both directions.
	assert.deepEqual(toggleAll(['z', ...order], order), ['z']);
	assert.deepEqual(toggleAll(['z'], []), ['z']);
});

test('sameValues compares order too', () => {
	assert.equal(sameValues(['a', 'b'], ['a', 'b']), true);
	assert.equal(sameValues(['a', 'b'], ['b', 'a']), false);
	assert.equal(sameValues([], []), true);
});
