import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
	CONSEQUENCE_TONES,
	conflictChoices,
	groupFlatConsequences,
	headingBelow,
	isGroupList,
	isSuperseded,
	readReassign,
	reassignDefaults,
	reassignFieldName,
	reassignOptions,
	summarizeChanges
} from '../src/lib/settings/save/helpers.ts';
import { adoptSnapshotAsDefaults, diffForm, snapshotForm } from '../src/lib/settings/shared/diff.ts';
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

test('groupFlatConsequences puts ok items under "stays" only when there are effects too', () => {
	const no = { tone: 'no' as const, label: 'Deleted' };
	const warn = { tone: 'warn' as const, label: 'Invites stop' };
	const ok = { tone: 'ok' as const, label: 'Invoices stay' };
	assert.deepEqual(groupFlatConsequences([no, ok, warn], 'Happens', 'Stays'), [
		{ label: 'Happens', items: [no, warn] },
		{ label: 'Stays', items: [ok] }
	]);
	assert.deepEqual(groupFlatConsequences([no, warn], 'Happens', 'Stays'), [{ label: 'Happens', items: [no, warn] }]);
	assert.deepEqual(groupFlatConsequences([ok], 'Happens', 'Stays'), [{ label: 'Happens', items: [ok] }]);
});

/**
 * A tiny stand-in for a form's controls. Setting an option's default selects it, as a browser can,
 * so adopting defaults can move a value that must then be put back.
 */
function fakeForm() {
	const text = { name: 'teamName', type: 'text', value: 'Saved', defaultValue: 'Saved' };
	const check = { name: 'digest', type: 'checkbox', checked: true, defaultChecked: true };
	const select = { name: 'retention', type: 'select-one', options: [] as Array<{ value: string; selected: boolean; defaultSelected: boolean }> };
	const option = (value: string, on: boolean) => {
		let defaultSelected = on;
		const o = {
			value,
			selected: on,
			get defaultSelected() {
				return defaultSelected;
			},
			set defaultSelected(next: boolean) {
				defaultSelected = next;
				if (next) select.options.forEach((other) => (other.selected = other === o));
			}
		};
		return o;
	};
	select.options = [option('30', false), option('90', true)];
	const choose = (value: string) => select.options.forEach((o) => (o.selected = o.value === value));
	const hidden = { name: 'revision', type: 'hidden', value: '7', defaultValue: '7' };
	const off = { name: 'note', type: 'text', value: 'x', defaultValue: 'x', disabled: true };
	const fields = [
		{ name: 'teamName', label: 'Team name' },
		{ name: 'digest', label: 'Weekly digest' },
		{ name: 'retention', label: 'Data retention' }
	];
	return { text, check, select, choose, fields, form: { elements: [text, check, select, hidden, off] } };
}

test('snapshotForm records the value-holding, enabled controls only', () => {
	const f = fakeForm();
	const snapshot = snapshotForm(f.form);
	assert.deepEqual(
		snapshot.map((s) => s.control.name),
		['teamName', 'digest', 'retention']
	);
	assert.equal(snapshot[0].value, 'Saved');
	assert.equal(snapshot[1].checked, true);
	assert.deepEqual(snapshot[2].selected, [false, true]);
});

test('adoptSnapshotAsDefaults saves what was submitted and keeps edits made while it was in flight', () => {
	const f = fakeForm();
	f.text.value = 'First';
	const snapshot = snapshotForm(f.form);
	// While the save is in flight the person edits two fields.
	f.check.checked = false;
	f.choose('30');
	adoptSnapshotAsDefaults(snapshot);
	// The server got "First", on and 90 days: those are the saved values now; the new edits are kept.
	assert.equal(f.text.defaultValue, 'First');
	assert.equal(f.text.value, 'First');
	assert.equal(f.check.defaultChecked, true);
	assert.equal(f.check.checked, false);
	assert.deepEqual(
		f.select.options.map((o) => [o.defaultSelected, o.selected]),
		[
			[false, true],
			[true, false]
		]
	);
	assert.deepEqual(
		diffForm(f.form, f.fields).map((c) => `${c.label}: ${c.from} → ${c.to}`),
		['Weekly digest: On → Off', 'Data retention: 90 → 30']
	);
});

test('adoptSnapshotAsDefaults leaves the form clean when nothing was edited in flight', () => {
	const f = fakeForm();
	f.text.value = 'First';
	f.choose('30');
	const snapshot = snapshotForm(f.form);
	adoptSnapshotAsDefaults(snapshot);
	assert.equal(f.text.defaultValue, 'First');
	assert.deepEqual(
		f.select.options.map((o) => [o.defaultSelected, o.selected]),
		[
			[true, true],
			[false, false]
		]
	);
	assert.deepEqual(diffForm(f.form, f.fields), []);
});

test('ConsequenceDialog spreads rest on its own form only, never on the draft-mode fieldset', () => {
	const source = readFileSync(new URL('../src/lib/settings/save/ConsequenceDialog.svelte', import.meta.url), 'utf8');
	const spreads = source.split('\n').filter((line) => /\{\.\.\.rest\b/.test(line));
	assert.equal(spreads.length, 1);
	assert.match(spreads[0], /^\s*<form \{\.\.\.rest\}/);
	assert.doesNotMatch(source, /<fieldset[^>]*\.\.\.rest/);
});
