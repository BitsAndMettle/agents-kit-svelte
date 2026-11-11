import assert from 'node:assert/strict';
import test from 'node:test';
import { includeValue, toggleValue } from '../src/lib/headless/logic/selection.ts';

const single = { multiple: false, collapsible: true };
const locked = { multiple: false, collapsible: false };
const multiple = { multiple: true, collapsible: true };

test('single mode: toggling selects only that value', () => {
	assert.deepEqual(toggleValue([], 'a', single), ['a']);
	assert.deepEqual(toggleValue(['a'], 'b', single), ['b']);
});

test('single collapsible: toggling the selected value clears it', () => {
	assert.deepEqual(toggleValue(['a'], 'a', single), []);
});

test('single non-collapsible: toggling the selected value keeps it (same array)', () => {
	const selected = ['a'];
	assert.equal(toggleValue(selected, 'a', locked), selected);
	assert.deepEqual(toggleValue(selected, 'b', locked), ['b']);
});

test('multiple mode adds and removes, keeping order', () => {
	assert.deepEqual(toggleValue(['a'], 'b', multiple), ['a', 'b']);
	assert.deepEqual(toggleValue(['a', 'b', 'c'], 'b', multiple), ['a', 'c']);
	assert.deepEqual(toggleValue(['a'], 'a', { multiple: true, collapsible: false }), []);
});

test('includeValue never deselects', () => {
	const selected = ['a'];
	assert.equal(includeValue(selected, 'a', false), selected);
	assert.deepEqual(includeValue(selected, 'b', false), ['b']);
	assert.deepEqual(includeValue(selected, 'b', true), ['a', 'b']);
});
