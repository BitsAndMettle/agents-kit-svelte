import assert from 'node:assert/strict';
import test from 'node:test';
import { activeCells, applyEdit, caretForClick, normalizeCode, startsGroup } from '../src/lib/auth/fields/otp.ts';
import { defaultRulesSummary, evaluateRules } from '../src/lib/auth/fields/password.ts';

test('normalizeCode keeps digits only, cuts to length, and handles spaced or dashed codes', () => {
	assert.equal(normalizeCode('123 456', 6), '123456');
	assert.equal(normalizeCode('123-456', 6), '123456');
	assert.equal(normalizeCode(' 1a2b3 ', 6), '123');
	assert.equal(normalizeCode('1234567890', 6), '123456');
	assert.equal(normalizeCode('', 6), '');
	assert.equal(normalizeCode('12', 0), '');
});

test('normalizeCode folds full-width characters to plain ones', () => {
	assert.equal(normalizeCode('１２３４５６', 6), '123456');
	assert.equal(normalizeCode('１２３ ４５６７', 6), '123456');
	assert.equal(normalizeCode('ａｂ１２', 8, true), 'ab12');
	assert.equal(normalizeCode('ａｂ１２', 8), '12');
});

test('normalizeCode keeps letters when alphanumeric', () => {
	assert.equal(normalizeCode('ab-12 cD', 8, true), 'ab12cD');
	assert.equal(normalizeCode('ab-12 cD', 4, true), 'ab12');
	assert.equal(normalizeCode('é_ß9', 8, true), '9');
});

const edit = (prev: string, start: number, end: number, inserted: string, length = 6, alphanumeric = false) =>
	applyEdit(prev, start, end, inserted, length, alphanumeric);

test('applyEdit appends at the end, one character or many, and cuts to length', () => {
	assert.deepEqual(edit('', 0, 0, '1'), { value: '1', caret: 1 });
	assert.deepEqual(edit('12', 2, 2, '3'), { value: '123', caret: 3 });
	assert.deepEqual(edit('12', 2, 2, '3456789'), { value: '123456', caret: 6 });
	assert.deepEqual(edit('', 0, 0, '1234567890'), { value: '123456', caret: 6 });
});

test('applyEdit inserts in the middle of a code that is not full', () => {
	assert.deepEqual(edit('1245', 2, 2, '3'), { value: '12345', caret: 3 });
	assert.deepEqual(edit('1245', 0, 0, '9'), { value: '91245', caret: 1 });
	// Not full, so it inserts; the result is cut to length.
	assert.deepEqual(edit('12345', 2, 2, '99'), { value: '129934', caret: 4 });
});

test('applyEdit overwrites after the caret when the code is full', () => {
	assert.deepEqual(edit('123456', 2, 2, '9'), { value: '129456', caret: 3 });
	assert.deepEqual(edit('123456', 2, 2, '99'), { value: '129956', caret: 4 });
	assert.deepEqual(edit('123456', 0, 0, '9'), { value: '923456', caret: 1 });
	assert.deepEqual(edit('123456', 4, 4, '789'), { value: '123478', caret: 6 });
	assert.deepEqual(edit('123456', 0, 0, '987654321'), { value: '987654', caret: 6 });
});

test('applyEdit overwrites the last cell, and a caret after a full code changes nothing', () => {
	assert.deepEqual(edit('123456', 5, 5, '9'), { value: '123459', caret: 6 });
	assert.deepEqual(edit('123456', 5, 5, '98'), { value: '123459', caret: 6 });
	assert.deepEqual(edit('123456', 6, 6, '7'), { value: '123456', caret: 6 });
});

test('applyEdit replaces a whole selection with longer or shorter text', () => {
	assert.deepEqual(edit('123456', 0, 6, '6543210'), { value: '654321', caret: 6 });
	assert.deepEqual(edit('123456', 0, 6, '654 321'), { value: '654321', caret: 6 });
	assert.deepEqual(edit('123456', 0, 6, '78'), { value: '78', caret: 2 });
	assert.deepEqual(edit('123', 0, 3, '9'), { value: '9', caret: 1 });
});

test('applyEdit replaces a partial selection with several characters', () => {
	assert.deepEqual(edit('123456', 2, 3, '999'), { value: '129994', caret: 5 });
	assert.deepEqual(edit('123456', 1, 5, '9'), { value: '196', caret: 2 });
	assert.deepEqual(edit('1234', 1, 3, '9'), { value: '194', caret: 2 });
	// A backwards range is read as the same selection.
	assert.deepEqual(edit('123456', 3, 2, '999'), { value: '129994', caret: 5 });
});

test('applyEdit drops separators and folds full-width input', () => {
	assert.deepEqual(edit('', 0, 0, '123 456'), { value: '123456', caret: 6 });
	assert.deepEqual(edit('', 0, 0, '123-456'), { value: '123456', caret: 6 });
	assert.deepEqual(edit('12', 2, 2, ' 3-4 '), { value: '1234', caret: 4 });
	assert.deepEqual(edit('', 0, 0, '１２３４５６'), { value: '123456', caret: 6 });
	assert.deepEqual(edit('123456', 1, 1, '９'), { value: '193456', caret: 2 });
	assert.deepEqual(edit('12', 2, 2, 'a3b'), { value: '123', caret: 3 });
});

test('applyEdit keeps letters only when alphanumeric', () => {
	assert.deepEqual(edit('ab', 2, 2, 'c-D', 8, true), { value: 'abcD', caret: 4 });
	assert.deepEqual(edit('ab12cd34', 6, 7, 'Z', 8, true), { value: 'ab12cdZ4', caret: 7 });
	assert.deepEqual(edit('', 0, 0, 'ａｂ１２', 8, true), { value: 'ab12', caret: 4 });
	assert.deepEqual(edit('', 0, 0, 'ab12', 8, false), { value: '12', caret: 2 });
});

test('applyEdit treats an insert that cleans to nothing as no edit', () => {
	assert.deepEqual(edit('123', 1, 1, ''), { value: '123', caret: 1 });
	assert.deepEqual(edit('123', 3, 3, 'a'), { value: '123', caret: 3 });
	assert.deepEqual(edit('123456', 1, 4, '-'), { value: '123456', caret: 4 });
	assert.deepEqual(edit('123456', 2, 2, ' '), { value: '123456', caret: 2 });
});

test('applyEdit clamps out-of-range selections and a zero length', () => {
	assert.deepEqual(edit('12', 5, 9, '3'), { value: '123', caret: 3 });
	assert.deepEqual(edit('12', -3, 0, '9'), { value: '912', caret: 1 });
	assert.deepEqual(edit('', 0, 0, '1', 0), { value: '', caret: 0 });
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

test('applyEdit: a whole code inserted into a full code replaces it wherever the caret is', () => {
	assert.deepEqual(applyEdit('123456', 6, 6, '654321', 6), { value: '654321', caret: 6 });
	assert.deepEqual(applyEdit('123456', 2, 2, '654 321', 6), { value: '654321', caret: 6 });
});
