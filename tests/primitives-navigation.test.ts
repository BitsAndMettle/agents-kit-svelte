import assert from 'node:assert/strict';
import test from 'node:test';
import { paginationRange } from '../src/lib/primitives/navigation/pagination-range.ts';

const S = 'start-ellipsis';
const E = 'end-ellipsis';

test('paginationRange shows every page when they fit', () => {
	assert.deepEqual(paginationRange({ page: 1, pageCount: 1 }), [1]);
	assert.deepEqual(paginationRange({ page: 3, pageCount: 7 }), [1, 2, 3, 4, 5, 6, 7]);
	assert.deepEqual(paginationRange({ page: 1, pageCount: 0 }), []);
});

test('paginationRange puts an ellipsis only at the far end near the start', () => {
	assert.deepEqual(paginationRange({ page: 1, pageCount: 12 }), [1, 2, 3, 4, 5, E, 12]);
	assert.deepEqual(paginationRange({ page: 4, pageCount: 12 }), [1, 2, 3, 4, 5, E, 12]);
});

test('paginationRange puts ellipses on both sides in the middle', () => {
	assert.deepEqual(paginationRange({ page: 6, pageCount: 12 }), [1, S, 5, 6, 7, E, 12]);
});

test('paginationRange mirrors near the end', () => {
	assert.deepEqual(paginationRange({ page: 12, pageCount: 12 }), [1, S, 8, 9, 10, 11, 12]);
	assert.deepEqual(paginationRange({ page: 9, pageCount: 12 }), [1, S, 8, 9, 10, 11, 12]);
});

test('paginationRange never hides a single page behind an ellipsis', () => {
	// Page 5 of 12 with siblings 1: pages 2-3 are two hidden pages, so an ellipsis; page 4 is shown.
	assert.deepEqual(paginationRange({ page: 5, pageCount: 12 }), [1, S, 4, 5, 6, E, 12]);
	assert.deepEqual(paginationRange({ page: 5, pageCount: 9 }), [1, S, 4, 5, 6, E, 9]);
	// Page 4 of 9: only page 2 sits between the boundary and the siblings, so it is shown, not elided.
	assert.deepEqual(paginationRange({ page: 4, pageCount: 9 }), [1, 2, 3, 4, 5, E, 9]);
});

test('paginationRange keeps a constant slot count and honours siblings and boundaries', () => {
	for (let page = 1; page <= 20; page++) assert.equal(paginationRange({ page, pageCount: 20 }).length, 7);
	assert.deepEqual(paginationRange({ page: 10, pageCount: 20, siblings: 2 }), [1, S, 8, 9, 10, 11, 12, E, 20]);
	assert.deepEqual(paginationRange({ page: 10, pageCount: 20, boundaries: 2 }), [1, 2, S, 9, 10, 11, E, 19, 20]);
	assert.deepEqual(paginationRange({ page: 10, pageCount: 20, siblings: 0, boundaries: 0 }), [S, 10, E]);
});

test('paginationRange clamps an out-of-range page', () => {
	assert.deepEqual(paginationRange({ page: 99, pageCount: 12 }), paginationRange({ page: 12, pageCount: 12 }));
	assert.deepEqual(paginationRange({ page: -3, pageCount: 12 }), paginationRange({ page: 1, pageCount: 12 }));
});
