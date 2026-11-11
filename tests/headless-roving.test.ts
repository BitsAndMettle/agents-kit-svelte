import assert from 'node:assert/strict';
import test from 'node:test';
import { firstEnabled, intentForKey, nextIndex, type NavInput } from '../src/lib/headless/logic/roving.ts';

const list = (count: number, current: number, opts: Partial<NavInput> = {}): NavInput => ({
	count,
	current,
	disabled: Array.from({ length: count }, () => false),
	loop: true,
	...opts
});

test('intentForKey maps vertical and horizontal keys and ignores foreign ones', () => {
	assert.equal(intentForKey('ArrowDown', 'vertical', 'ltr', false), 'next');
	assert.equal(intentForKey('ArrowUp', 'vertical', 'ltr', false), 'prev');
	assert.equal(intentForKey('ArrowRight', 'vertical', 'ltr', false), null);
	assert.equal(intentForKey('ArrowRight', 'horizontal', 'ltr', false), 'next');
	assert.equal(intentForKey('ArrowDown', 'horizontal', 'ltr', false), null);
	assert.equal(intentForKey('ArrowDown', 'both', 'ltr', false), 'next');
	assert.equal(intentForKey('ArrowLeft', 'both', 'ltr', false), 'prev');
	assert.equal(intentForKey('Tab', 'both', 'ltr', false), null);
	assert.equal(intentForKey('a', 'vertical', 'ltr', false), null);
});

test('intentForKey: Home/End/PageUp/PageDown', () => {
	assert.equal(intentForKey('Home', 'vertical', 'ltr', false), 'first');
	assert.equal(intentForKey('End', 'horizontal', 'rtl', false), 'last');
	assert.equal(intentForKey('PageUp', 'vertical', 'ltr', false), 'page-up');
	assert.equal(intentForKey('PageDown', 'vertical', 'ltr', false), 'page-down');
});

test('intentForKey mirrors horizontal arrows in rtl', () => {
	assert.equal(intentForKey('ArrowLeft', 'horizontal', 'rtl', false), 'next');
	assert.equal(intentForKey('ArrowRight', 'horizontal', 'rtl', false), 'prev');
	assert.equal(intentForKey('ArrowLeft', 'vertical', 'rtl', true), 'next');
});

test('intentForKey in a grid', () => {
	assert.equal(intentForKey('ArrowDown', 'vertical', 'ltr', true), 'down');
	assert.equal(intentForKey('ArrowUp', 'horizontal', 'ltr', true), 'up');
	assert.equal(intentForKey('ArrowRight', 'vertical', 'ltr', true), 'next');
});

test('next/prev step and wrap when looping', () => {
	assert.equal(nextIndex(list(3, 0), 'next'), 1);
	assert.equal(nextIndex(list(3, 2), 'next'), 0);
	assert.equal(nextIndex(list(3, 0), 'prev'), 2);
});

test('next/prev stop at the edge without loop', () => {
	assert.equal(nextIndex(list(3, 2, { loop: false }), 'next'), 2);
	assert.equal(nextIndex(list(3, 0, { loop: false }), 'prev'), 0);
});

test('nothing highlighted: next lands on the first enabled, prev on the last', () => {
	const disabled = [true, false, false, true];
	assert.equal(nextIndex(list(4, -1, { disabled }), 'next'), 1);
	assert.equal(nextIndex(list(4, -1, { disabled }), 'prev'), 2);
	assert.equal(nextIndex(list(4, -1, { disabled, loop: false }), 'prev'), 2);
});

test('disabled items are skipped, including across the wrap', () => {
	const disabled = [false, true, true, false, true];
	assert.equal(nextIndex(list(5, 0, { disabled }), 'next'), 3);
	assert.equal(nextIndex(list(5, 3, { disabled }), 'next'), 0);
	assert.equal(nextIndex(list(5, 3, { disabled, loop: false }), 'next'), 3);
	assert.equal(nextIndex(list(5, 0, { disabled }), 'prev'), 3);
});

test('first/last skip disabled; all disabled or empty returns -1', () => {
	const disabled = [true, false, false, true];
	assert.equal(nextIndex(list(4, 2, { disabled }), 'first'), 1);
	assert.equal(nextIndex(list(4, 1, { disabled }), 'last'), 2);
	assert.equal(nextIndex(list(3, -1, { disabled: [true, true, true] }), 'next'), -1);
	assert.equal(nextIndex(list(0, -1), 'first'), -1);
});

test('grid moves by a row in the same column, skipping disabled cells', () => {
	// 3 columns, 8 items:  0 1 2 / 3 4 5 / 6 7
	assert.equal(nextIndex(list(8, 1, { columns: 3 }), 'down'), 4);
	assert.equal(nextIndex(list(8, 4, { columns: 3 }), 'up'), 1);
	const disabled = [false, false, false, false, true, false, false, false];
	assert.equal(nextIndex(list(8, 1, { columns: 3, disabled }), 'down'), 7);
	assert.equal(nextIndex(list(8, 1, { columns: 3 }), 'next'), 2);
});

test('grid wraps to the same column only when looping, and handles a short last row', () => {
	assert.equal(nextIndex(list(8, 7, { columns: 3 }), 'down'), 1);
	assert.equal(nextIndex(list(8, 2, { columns: 3 }), 'up'), 5, 'column 2 ends on row 2 (index 5)');
	assert.equal(nextIndex(list(8, 1, { columns: 3 }), 'up'), 7);
	assert.equal(nextIndex(list(8, 7, { columns: 3, loop: false }), 'down'), 7);
	assert.equal(nextIndex(list(8, -1, { columns: 3 }), 'down'), 0);
});

test('page-down / page-up jump by a page and land on an enabled item', () => {
	assert.equal(nextIndex(list(30, 0), 'page-down'), 10);
	assert.equal(nextIndex(list(30, 25), 'page-down'), 29);
	assert.equal(nextIndex(list(30, 15), 'page-up'), 5);
	assert.equal(nextIndex(list(30, 3), 'page-up'), 0);
	const disabled = Array.from({ length: 30 }, (_, i) => i === 10 || i === 11);
	assert.equal(nextIndex(list(30, 0, { disabled }), 'page-down'), 12);
	assert.equal(nextIndex(list(5, 0, { page: 2 }), 'page-down'), 2);
	const tail = [false, false, false, true, true];
	assert.equal(nextIndex(list(5, 1, { disabled: tail, page: 3 }), 'page-down'), 2);
	assert.equal(nextIndex(list(5, 2, { disabled: tail, page: 3 }), 'page-down'), 2);
});

test('firstEnabled scans forward or backward', () => {
	assert.equal(firstEnabled([true, false, true]), 1);
	assert.equal(firstEnabled([true, false, true], 2), -1);
	assert.equal(firstEnabled([false, true, true], 2, true), 0);
	assert.equal(firstEnabled([], 0), -1);
});
