import assert from 'node:assert/strict';
import test from 'node:test';
import { activeCells, caretForClick, normalizeCode, startsGroup } from '../src/lib/auth/fields/otp.ts';
import { defaultRulesSummary, evaluateRules } from '../src/lib/auth/fields/password.ts';

test('normalizeCode keeps digits only, cuts to length, and handles spaced or dashed codes', () => {
	assert.equal(normalizeCode('123 456', 6), '123456');
	assert.equal(normalizeCode('123-456', 6), '123456');
	assert.equal(normalizeCode(' 1a2b3 ', 6), '123');
	assert.equal(normalizeCode('1234567890', 6), '123456');
	assert.equal(normalizeCode('', 6), '');
	assert.equal(normalizeCode('12', 0), '');
});

test('normalizeCode keeps letters when alphanumeric', () => {
	assert.equal(normalizeCode('ab-12 cD', 8, true), 'ab12cD');
	assert.equal(normalizeCode('ab-12 cD', 4, true), 'ab12');
	assert.equal(normalizeCode('é_ß9', 8, true), '9');
});

test('activeCells marks the cell to fill, the last cell when full, or every selected cell', () => {
	assert.deepEqual(activeCells(0, 0, 4), [true, false, false, false]);
	assert.deepEqual(activeCells(2, 2, 4), [false, false, true, false]);
	assert.deepEqual(activeCells(4, 4, 4), [false, false, false, true]);
	assert.deepEqual(activeCells(1, 3, 4), [false, true, true, false]);
	assert.deepEqual(activeCells(0, 4, 4), [true, true, true, true]);
	assert.deepEqual(activeCells(0, 0, 0), []);
});

test('caretForClick maps a click to a cell but never beyond the typed text', () => {
	assert.equal(caretForClick(5, 100, 4, 4), 0);
	assert.equal(caretForClick(60, 100, 4, 4), 2);
	assert.equal(caretForClick(60, 100, 4, 1), 1);
	assert.equal(caretForClick(999, 100, 4, 4), 3);
	assert.equal(caretForClick(-5, 100, 4, 4), 0);
	assert.equal(caretForClick(10, 0, 4, 3), 3);
});

test('startsGroup flags the first cell of each group after the first', () => {
	assert.deepEqual([0, 1, 2, 3, 4, 5].map((i) => startsGroup(i, 3)), [false, false, false, true, false, false]);
	assert.equal(startsGroup(3, 0), false);
});

test('evaluateRules runs each test, and a throwing test counts as unmet', () => {
	const rules = [
		{ label: 'Long', test: (v: string) => v.length >= 4 },
		{ label: 'Digit', test: (v: string) => /\d/.test(v) },
		{
			label: 'Broken',
			test: () => {
				throw new Error('boom');
			}
		}
	];
	assert.deepEqual(evaluateRules(rules, 'abc1'), [true, true, false]);
	assert.deepEqual(evaluateRules(rules, ''), [false, false, false]);
	assert.equal(defaultRulesSummary(2, 3), '2 of 3 requirements met');
});
