import assert from 'node:assert/strict';
import test from 'node:test';
import { LINK_CLASS, isThenable } from '../src/lib/auth/signin/look.ts';

test('isThenable recognises promises and nothing else', () => {
	assert.equal(isThenable(Promise.resolve()), true);
	assert.equal(isThenable({ then() {} }), true);
	assert.equal(isThenable(undefined), false);
	assert.equal(isThenable(null), false);
	assert.equal(isThenable('then'), false);
});

test('the link class keeps a visible focus style', () => {
	assert.match(LINK_CLASS, /focus-visible:outline/);
});
