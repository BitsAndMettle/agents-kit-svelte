import assert from 'node:assert/strict';
import test from 'node:test';
import { isBuffering, isTypeaheadKey, typeahead, TYPEAHEAD_IDLE } from '../src/lib/headless/logic/typeahead.ts';

const labels = ['apple', 'apricot', 'banana', 'blueberry', 'cherry', 'avocado'];
const none = labels.map(() => false);

function type(chars: string, start = -1, times?: number[], disabled = none) {
	let state = TYPEAHEAD_IDLE;
	let current = start;
	const hits: number[] = [];
	[...chars].forEach((char, i) => {
		const result = typeahead(state, { labels, disabled, current, char, now: times?.[i] ?? 1000 + i * 100 });
		state = result.state;
		if (result.index >= 0) current = result.index;
		hits.push(result.index);
	});
	return { state, current, hits };
}

test('a prefix accumulates in the buffer and narrows the match', () => {
	const { current, state } = type('apr');
	assert.equal(current, 1);
	assert.equal(state.buffer, 'apr');
});

test('a growing prefix stays on the current item when it still matches', () => {
	assert.deepEqual(type('ap').hits, [0, 0]);
});

test('the first press moves to the next match after the current item', () => {
	assert.equal(type('a', 0).current, 1);
});

test('repeating one letter cycles through items starting with it, wrapping', () => {
	assert.deepEqual(type('aaaa').hits, [0, 1, 5, 0]);
	assert.deepEqual(type('bbb').hits, [2, 3, 2]);
});

test('the buffer resets after the timeout', () => {
	const { hits, state } = type('ac', -1, [1000, 1700]);
	assert.deepEqual(hits, [0, 4], 'after the pause "c" starts a new search');
	assert.equal(state.buffer, 'c');
});

test('a custom timeout is honoured', () => {
	const r1 = typeahead(TYPEAHEAD_IDLE, { labels, disabled: none, current: -1, char: 'b', now: 0 });
	const r2 = typeahead(r1.state, { labels, disabled: none, current: r1.index, char: 'l', now: 900, timeout: 1000 });
	assert.equal(r2.index, 3);
	assert.equal(r2.state.buffer, 'bl');
});

test('disabled items never match', () => {
	const disabled = [true, false, false, false, false, false];
	assert.equal(type('a', -1, undefined, disabled).current, 1);
});

test('no match keeps the highlight (-1) but keeps the buffer', () => {
	const result = typeahead(TYPEAHEAD_IDLE, { labels, disabled: none, current: 2, char: 'z', now: 0 });
	assert.equal(result.index, -1);
	assert.equal(result.state.buffer, 'z');
});

test('input is case-insensitive against normalised labels', () => {
	assert.equal(typeahead(TYPEAHEAD_IDLE, { labels, disabled: none, current: -1, char: 'C', now: 0 }).index, 4);
});

test('space is a character only while a buffer is live', () => {
	const idle = typeahead(TYPEAHEAD_IDLE, { labels, disabled: none, current: 0, char: ' ', now: 0 });
	assert.equal(idle.index, -1);
	assert.equal(idle.state.buffer, '');
	const spaced = ['new york', 'new zealand', 'newark'];
	let state = TYPEAHEAD_IDLE;
	let current = -1;
	for (const char of 'new ') {
		const r = typeahead(state, { labels: spaced, disabled: [false, false, false], current, char, now: 10 });
		state = r.state;
		if (r.index >= 0) current = r.index;
	}
	assert.equal(state.buffer, 'new ');
	assert.equal(current, 0);
});

test('isBuffering and isTypeaheadKey', () => {
	assert.equal(isBuffering(TYPEAHEAD_IDLE, 0), false);
	assert.equal(isBuffering({ buffer: 'a', at: 100 }, 500), true);
	assert.equal(isBuffering({ buffer: 'a', at: 100 }, 700), false);
	assert.equal(isTypeaheadKey('a', false, false, false), true);
	assert.equal(isTypeaheadKey('é', false, false, false), true);
	assert.equal(isTypeaheadKey('a', true, false, false), false);
	assert.equal(isTypeaheadKey('a', false, true, false), false);
	assert.equal(isTypeaheadKey('a', false, false, true), false);
	assert.equal(isTypeaheadKey('Enter', false, false, false), false);
	assert.equal(isTypeaheadKey('ArrowDown', false, false, false), false);
});
