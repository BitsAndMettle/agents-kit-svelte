import assert from 'node:assert/strict';
import test from 'node:test';
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
