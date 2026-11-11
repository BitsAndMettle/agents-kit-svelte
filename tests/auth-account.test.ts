import assert from 'node:assert/strict';
import test from 'node:test';
import { isThenable } from '../src/lib/core/promise.ts';

test('isThenable recognises promises and nothing else', () => {
	assert.equal(isThenable(Promise.resolve()), true);
	assert.equal(isThenable({ then() {} }), true);
	assert.equal(isThenable(undefined), false);
	assert.equal(isThenable(null), false);
	assert.equal(isThenable('then'), false);
	assert.equal(isThenable(() => 1), false);
});
