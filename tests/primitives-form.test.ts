import assert from 'node:assert/strict';
import test from 'node:test';
import { createFieldState, fieldControlAttrs, joinIds, type FieldState } from '../src/lib/primitives/form/field.ts';
import { readBoolean } from '../src/lib/primitives/form/form-data.ts';
import { counterMessage, formatCharacterCount, nearLimitThreshold } from '../src/lib/primitives/form/text-count.ts';
import { sliderRatio } from '../src/lib/primitives/form/slider-ratio.ts';

const field = (overrides: Partial<FieldState> = {}): FieldState => ({
	controlId: 'f-control',
	labelId: 'f-label',
	descriptionId: 'f-hint',
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
	assert.deepEqual(fieldControlAttrs(field({ descriptionId: undefined, hintId: undefined }), {}), { id: 'f-control' });
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
	assert.equal(formatCharacterCount({ length: 45, max: 120, left: 75 }), '45 of 120 characters used');
});

test('the counter words come from the formatter', () => {
	const german = ({ left }: { left: number }) => (left === 0 ? 'Limit erreicht' : `Noch ${left} Zeichen`);
	assert.equal(counterMessage(110, 120, 12, german), 'Noch 10 Zeichen');
	assert.equal(counterMessage(125, 120, 12, german), 'Limit erreicht');
	assert.equal(counterMessage(10, 120, 12, german), '');
});

test('sliderRatio clamps and survives an empty range', () => {
	assert.equal(sliderRatio(5, 0, 10), 0.5);
	assert.equal(sliderRatio(-3, 0, 10), 0);
	assert.equal(sliderRatio(30, 0, 10), 1);
	assert.equal(sliderRatio(4, 4, 4), 0);
	assert.equal(sliderRatio(Number.NaN, 0, 10), 0);
});

test('describedBy ids join after the description and before the error, in a plain field only', () => {
	const described = field({ describedBy: ['row-status', 'row-lock'], errorId: 'f-error', invalid: true });
	assert.equal(fieldControlAttrs(described, { describedBy: 'own' })['aria-describedby'], 'own f-hint row-status row-lock f-error');
	assert.equal(fieldControlAttrs(field({ describedBy: ['row-status'], group: true }), { describedBy: 'own' })['aria-describedby'], 'own');
	// Without describedBy, nothing changes.
	assert.equal(fieldControlAttrs(field(), {})['aria-describedby'], 'f-hint');
});

test("createFieldState uses Field's id scheme and reads its options live", () => {
	let description = false;
	let error = false;
	let lockId: string | undefined;
	const state = createFieldState({
		id: 'row1',
		description: () => description,
		error: () => error,
		required: () => true,
		describedBy: () => [undefined, lockId, '']
	});
	assert.equal(state.controlId, 'row1-control');
	assert.equal(state.labelId, 'row1-label');
	assert.equal(state.descriptionId, undefined);
	assert.equal(state.errorId, undefined);
	assert.equal(state.invalid, false);
	assert.equal(state.describedBy, undefined);
	description = true;
	error = true;
	lockId = 'row1-lock';
	assert.equal(state.descriptionId, 'row1-description');
	assert.equal(state.hintId, 'row1-description');
	assert.equal(state.errorId, 'row1-error');
	assert.equal(state.invalid, true);
	assert.deepEqual(state.describedBy, ['row1-lock']);
	assert.deepEqual(fieldControlAttrs(state), {
		id: 'row1-control',
		'aria-describedby': 'row1-description row1-lock row1-error',
		'aria-invalid': 'true',
		'aria-errormessage': 'row1-error',
		required: true
	});
	assert.equal(createFieldState({ id: 'x', controlId: () => 'custom' }).controlId, 'custom');
});

test('readBoolean reads the hidden-false plus checkbox-true pair, last value wins', () => {
	const data = new FormData();
	data.append('on', 'false');
	data.append('on', 'true');
	data.append('off', 'false');
	data.append('box', 'on');
	data.append('zero', '0');
	assert.equal(readBoolean(data, 'on'), true);
	assert.equal(readBoolean(data, 'off'), false);
	assert.equal(readBoolean(data, 'box'), true);
	assert.equal(readBoolean(data, 'zero'), false);
	assert.equal(readBoolean(data, 'missing'), false);
});
