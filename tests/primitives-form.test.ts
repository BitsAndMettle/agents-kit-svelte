import assert from 'node:assert/strict';
import test from 'node:test';
import { fieldControlAttrs, joinIds, type FieldState } from '../src/lib/primitives/form/field.ts';
import { counterMessage, nearLimitThreshold } from '../src/lib/primitives/form/text-count.ts';
import { sliderRatio } from '../src/lib/primitives/form/slider-ratio.ts';

const field = (overrides: Partial<FieldState> = {}): FieldState => ({
	controlId: 'f-control',
	labelId: 'f-label',
	hintId: 'f-hint',
	errorId: undefined,
	invalid: false,
	required: false,
	disabled: false,
	group: false,
	...overrides
});

test('joinIds drops blanks and repeats', () => {
	assert.equal(joinIds('a', undefined, '', 'b a', null), 'a b');
	assert.equal(joinIds(undefined, ''), undefined);
});

test('a standalone control keeps only its own state', () => {
	assert.deepEqual(fieldControlAttrs(undefined, {}), {});
	assert.deepEqual(fieldControlAttrs(undefined, { id: 'mine', describedBy: 'help', invalid: true, required: true, disabled: true }), {
		id: 'mine',
		'aria-describedby': 'help',
		'aria-invalid': 'true',
		required: true,
		disabled: true
	});
});

test('a plain field gives its id, hint, error and states to the control', () => {
	const attrs = fieldControlAttrs(field({ errorId: 'f-error', invalid: true, required: true }), { id: 'ignored', describedBy: 'own' });
	assert.deepEqual(attrs, {
		id: 'f-control',
		'aria-describedby': 'own f-hint f-error',
		'aria-invalid': 'true',
		'aria-errormessage': 'f-error',
		required: true
	});
});

test('the error is referenced only while the control is invalid', () => {
	assert.deepEqual(fieldControlAttrs(field({ hintId: undefined }), {}), { id: 'f-control' });
	assert.equal(fieldControlAttrs(field({ errorId: 'f-error', invalid: true }))['aria-errormessage'], 'f-error');
});

test('own true booleans win over a field that says false', () => {
	assert.equal(fieldControlAttrs(field(), { disabled: true }).disabled, true);
	assert.equal(fieldControlAttrs(field(), { invalid: true })['aria-invalid'], 'true');
});

test('members of a group field keep their own id and take only the invalid state', () => {
	const group = field({ group: true, errorId: 'f-error', invalid: true, required: true, disabled: true });
	assert.deepEqual(fieldControlAttrs(group, { id: 'box' }), { id: 'box', 'aria-invalid': 'true', 'aria-errormessage': 'f-error' });
});

test('a group control (radiogroup) takes aria-required, not native required', () => {
	const group = field({ group: true, required: true, disabled: true });
	assert.deepEqual(fieldControlAttrs(group, {}, 'group'), { 'aria-required': 'true', disabled: true });
	assert.deepEqual(fieldControlAttrs(field({ required: true }), {}, 'group'), {
		id: 'f-control',
		'aria-describedby': 'f-hint',
		'aria-required': 'true'
	});
});

test('the counter starts speaking near the limit', () => {
	assert.equal(nearLimitThreshold(120), 12);
	assert.equal(nearLimitThreshold(40), 10);
	assert.equal(nearLimitThreshold(5), 5);
	assert.equal(counterMessage(100, 120, 12), '');
	assert.equal(counterMessage(108, 120, 12), '12 characters left');
	assert.equal(counterMessage(119, 120, 12), '1 character left');
	assert.equal(counterMessage(120, 120, 12), 'Character limit reached, 120 of 120 used');
});

test('sliderRatio clamps and survives an empty range', () => {
	assert.equal(sliderRatio(5, 0, 10), 0.5);
	assert.equal(sliderRatio(-3, 0, 10), 0);
	assert.equal(sliderRatio(30, 0, 10), 1);
	assert.equal(sliderRatio(4, 4, 4), 0);
	assert.equal(sliderRatio(Number.NaN, 0, 10), 0);
});
