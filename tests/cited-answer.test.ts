import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeSources } from '../src/lib/agents/cited-answer.ts';

test('summarizeSources states', () => {
	assert.equal(summarizeSources([]).state, 'none');
	assert.equal(summarizeSources([{ check: 'verified' }, { check: 'verified' }]).state, 'all-verified');
	const some = summarizeSources([{ check: 'verified' }, { check: 'unverified' }]);
	assert.equal(some.state, 'some-unverified');
	assert.equal(some.label, '1 of 2 sources checked');
});

test('a mismatch wins over unverified', () => {
	const s = summarizeSources([{ check: 'unverified' }, { check: 'mismatch' }, { check: 'verified' }]);
	assert.equal(s.state, 'mismatch');
	assert.equal(s.mismatch, 1);
	assert.equal(s.total, 3);
});

test('sendable needs at least one source and no mismatch', () => {
	assert.equal(summarizeSources([]).sendable, false);
	assert.equal(summarizeSources([{ check: 'unverified' }]).sendable, true);
	assert.equal(summarizeSources([{ check: 'verified' }, { check: 'mismatch' }]).sendable, false);
});
