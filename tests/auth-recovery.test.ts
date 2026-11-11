import assert from 'node:assert/strict';
import test from 'node:test';
import { afterSuccess, failed } from '../src/lib/auth/recovery/result.ts';
import { groupSecret, plainSecret } from '../src/lib/auth/recovery/secret.ts';

test('groupSecret splits a key into groups of four and keeps case', () => {
	assert.equal(groupSecret('JBSWY3DPEHPK3PXP'), 'JBSW Y3DP EHPK 3PXP');
	assert.equal(groupSecret('abcdefghij'), 'abcd efgh ij');
	assert.equal(groupSecret('jbsw y3dp-ehpk'), 'jbsw y3dp ehpk');
	assert.equal(groupSecret(''), '');
	assert.equal(groupSecret('ABCDEF', 3), 'ABC DEF');
	assert.equal(groupSecret('ABCDEF', 0), 'ABCDEF');
});

test('plainSecret removes spaces, dashes and line breaks', () => {
	assert.equal(plainSecret('JBSW Y3DP-EHPK\n3PXP'), 'JBSWY3DPEHPK3PXP');
});

test('failed is true for a form error or any field error, and false for nothing', () => {
	assert.equal(failed(undefined), false);
	assert.equal(failed({}), false);
	assert.equal(failed({ errors: {} }), false);
	assert.equal(failed({ errors: { code: undefined } }), false);
	assert.equal(failed({ error: 'No' }), true);
	assert.equal(failed({ errors: { code: 'Wrong' } }), true);
});

test('afterSuccess runs the callback for a plain success and not for an error', () => {
	let ran = 0;
	afterSuccess(undefined, () => ran++);
	assert.equal(ran, 1);
	const result = { error: 'No' };
	assert.equal(afterSuccess(result, () => ran++), result);
	assert.equal(ran, 1);
});

test('afterSuccess waits for a promise, passes its result through and skips errors and rejections', async () => {
	let ran = 0;
	assert.equal(await afterSuccess(Promise.resolve(), () => ran++), undefined);
	assert.equal(ran, 1);
	const failure = { errors: { code: 'Wrong' } };
	assert.equal(await afterSuccess(Promise.resolve(failure), () => ran++), failure);
	assert.equal(ran, 1);
	await assert.rejects(afterSuccess(Promise.reject(new Error('down')), () => ran++));
	assert.equal(ran, 1);
});
