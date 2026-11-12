import assert from 'node:assert/strict';
import test from 'node:test';
import {
	CONSEQUENCE_TONES,
	conflictChoices,
	headingBelow,
	isGroupList,
	isSuperseded,
	readReassign,
	reassignDefaults,
	reassignFieldName,
	reassignOptions,
	summarizeChanges
} from '../src/lib/settings/save/helpers.ts';
import { SAMPLE_CONFLICT_FIELDS, SAMPLE_CONSEQUENCES } from '../src/lib/fixtures/settings.ts';
import type { ReassignSpec, SettingsChange } from '../src/lib/settings/shared/types.ts';

const changes: SettingsChange[] = [
	{ name: 'a', label: 'A', from: '1', to: '2' },
	{ name: 'b', label: 'B', from: 'x', to: 'y' },
	{ name: 'c', label: 'C', to: 'on' },
	{ name: 'd', label: 'D', from: 'p', to: 'q' },
	{ name: 'e', label: 'E', from: 'r', to: 's' }
];

test('summarizeChanges lists the first few in order and counts the rest', () => {
	assert.deepEqual(summarizeChanges(changes, 3), { shown: changes.slice(0, 3), more: 2 });
	assert.deepEqual(summarizeChanges(changes.slice(0, 2), 3), { shown: changes.slice(0, 2), more: 0 });
	assert.deepEqual(summarizeChanges(changes, 0), { shown: [], more: 5 });
	assert.deepEqual(summarizeChanges(changes, -2), { shown: [], more: 5 });
	assert.deepEqual(summarizeChanges(changes, 2.7), { shown: changes.slice(0, 2), more: 3 });
	assert.deepEqual(summarizeChanges([], 3), { shown: [], more: 0 });
});

test('isSuperseded: only a different (or emptied) current token takes Undo away', () => {
	assert.equal(isSuperseded(1, 1), false);
	assert.equal(isSuperseded(1, 2), true);
	assert.equal(isSuperseded('a', 'a'), false);
	assert.equal(isSuperseded('a', 'b'), true);
	// The app says nothing can be undone now.
	assert.equal(isSuperseded(1, null), true);
	// The app does not track tokens: never superseded.
	assert.equal(isSuperseded(1, undefined), false);
	// No token of its own: nothing to supersede.
	assert.equal(isSuperseded(undefined, 3), false);
	assert.equal(isSuperseded(undefined, null), false);
	// Tokens compare by value and type: 1 is not '1'.
	assert.equal(isSuperseded(1, '1'), true);
});

test('conflictChoices defaults to the latest version and never keeps Both where it is not allowed', () => {
	assert.deepEqual(conflictChoices(SAMPLE_CONFLICT_FIELDS), { teamName: 'theirs', channels: 'theirs', retention: 'theirs' });
	assert.deepEqual(conflictChoices(SAMPLE_CONFLICT_FIELDS, undefined, { teamName: 'mine', channels: 'both' }), {
		teamName: 'mine',
		channels: 'both',
		retention: 'theirs'
	});
	// The value wins over the default; Both falls back where the field does not allow it.
	assert.deepEqual(conflictChoices(SAMPLE_CONFLICT_FIELDS, { retention: 'both', teamName: 'theirs' }, { teamName: 'mine' }), {
		teamName: 'theirs',
		channels: 'theirs',
		retention: 'theirs'
	});
	// Choices for fields that are not in conflict are dropped.
	assert.deepEqual(conflictChoices(SAMPLE_CONFLICT_FIELDS.slice(0, 1), { teamName: 'mine', gone: 'mine' }), { teamName: 'mine' });
});

test('isGroupList tells titled groups from a flat list', () => {
	assert.equal(isGroupList(SAMPLE_CONSEQUENCES), true);
	assert.equal(isGroupList(SAMPLE_CONSEQUENCES[0].items), false);
	assert.equal(isGroupList([]), false);
});

test('every consequence tone maps to a colour tone', () => {
	assert.deepEqual(CONSEQUENCE_TONES, { ok: 'success', no: 'danger', warn: 'warning', info: 'neutral' });
});

test('headingBelow steps down and stays within h2 to h6', () => {
	assert.equal(headingBelow(3), 4);
	assert.equal(headingBelow(5, 2), 6);
	assert.equal(headingBelow(6), 6);
	assert.equal(headingBelow(1, 0), 2);
	assert.equal(headingBelow(2, 0), 2);
});

const spec: ReassignSpec = {
	label: 'Who takes over?',
	dependents: [
		{ id: 'weekly', label: 'Weekly summary' },
		{ id: 'churn', label: 'Churn review' },
		{ id: 'quality', label: 'Quality dashboard' }
	],
	options: [
		{ value: 'ben', label: 'Ben', disabled: true },
		{ value: 'ada', label: 'Ada' },
		{ value: 'chloe', label: 'Chloé' }
	],
	defaultFor: (id) => (id === 'quality' ? 'chloe' : id === 'churn' ? 'ben' : 'nobody')
};

test('reassign: field names, per-dependent options and defaults', () => {
	assert.equal(reassignFieldName(spec, 'weekly'), 'reassign.weekly');
	assert.equal(reassignFieldName({ name: 'owner' }, 'weekly'), 'owner.weekly');
	assert.equal(reassignOptions(spec, 'weekly').length, 3);
	const perDependent: Pick<ReassignSpec, 'options'> = { options: (id) => [{ value: `${id}-owner`, label: id }] };
	assert.deepEqual(reassignOptions(perDependent, 'churn'), [{ value: 'churn-owner', label: 'churn' }]);
	// An unknown or disabled default falls back to the first enabled option.
	assert.deepEqual(reassignDefaults(spec), { weekly: 'ada', churn: 'ada', quality: 'chloe' });
	assert.deepEqual(reassignDefaults({ ...spec, options: [{ value: 'x', label: 'X', disabled: true }] }), { weekly: '', churn: '', quality: '' });
});

test('readReassign reads each dependent from posted data', () => {
	const data = new Map<string, unknown>([
		['reassign.weekly', 'chloe'],
		['reassign.churn', 'ada']
	]);
	assert.deepEqual(readReassign(data, spec), { weekly: 'chloe', churn: 'ada', quality: '' });
	const form = new FormData();
	form.set('owner.weekly', 'ada');
	assert.deepEqual(readReassign(form, { name: 'owner', dependents: [{ id: 'weekly', label: 'Weekly' }] }), { weekly: 'ada' });
});
