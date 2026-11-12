import assert from 'node:assert/strict';
import test from 'node:test';
import { timeUntil, usageLevel, usagePercent, usageScale, usageTone } from '../src/lib/settings/controls/meter.ts';
import { groupMatrixEvents, matrixCellKey, matrixColumnState, parseMatrixCellKey, toggleMatrixColumn } from '../src/lib/settings/controls/matrix.ts';
import { filterSettingsItems, groupSettingsItems, selectableIds } from '../src/lib/settings/controls/item-list.ts';
import { idPart } from '../src/lib/settings/controls/ids.ts';
import { SAMPLE_SETTINGS_MEMBERS } from '../src/lib/fixtures/settings.ts';

// ---- UsageMeter ----

test('usageLevel: under, near at the warning threshold, over at the danger threshold', () => {
	assert.equal(usageLevel(30, 50), 'under');
	assert.equal(usageLevel(40, 50), 'near');
	assert.equal(usageLevel(42, 50), 'near');
	assert.equal(usageLevel(50, 50), 'over');
	assert.equal(usageLevel(61, 50), 'over');
});

test('usageLevel: custom thresholds, unlimited, no data and a zero limit', () => {
	assert.equal(usageLevel(30, 50, { warning: 0.5 }), 'near');
	assert.equal(usageLevel(55, 50, { danger: 1.2 }), 'near');
	assert.equal(usageLevel(61, 50, { danger: 1.2 }), 'over');
	assert.equal(usageLevel(12, null), 'unlimited');
	assert.equal(usageLevel(12, undefined), 'unlimited');
	assert.equal(usageLevel(undefined, 50), 'none');
	assert.equal(usageLevel(Number.NaN, 50), 'none');
	assert.equal(usageLevel(0, 0), 'under');
	assert.equal(usageLevel(1, 0), 'over');
});

test('usageTone: words and colour agree; unlimited and unknown stay neutral', () => {
	assert.equal(usageTone('under'), 'accent');
	assert.equal(usageTone('near'), 'warning');
	assert.equal(usageTone('over'), 'danger');
	assert.equal(usageTone('unlimited'), 'neutral');
	assert.equal(usageTone('none'), 'neutral');
});

test('usageScale: a shared max wins, else the largest value shown, never below 1', () => {
	assert.equal(usageScale({ value: 31, limit: 40, max: 50 }), 50);
	assert.equal(usageScale({ value: 42, limit: 50 }), 50);
	assert.equal(usageScale({ value: 61, limit: 50 }), 61);
	assert.equal(usageScale({ value: 20, limit: 30, marker: 28.5, projected: 34 }), 34);
	assert.equal(usageScale({}), 1);
	assert.equal(usageScale({ value: 5, limit: null }), 5);
});

test('usagePercent clamps and rounds; timeUntil gives days and hours or nothing once passed', () => {
	assert.equal(usagePercent(42, 50), 84);
	assert.equal(usagePercent(61, 50), 100);
	assert.equal(usagePercent(-3, 50), 0);
	assert.equal(usagePercent(1, 3), 33.3);
	assert.deepEqual(timeUntil(Date.UTC(2026, 11, 1), Date.UTC(2026, 10, 12, 9)), { days: 18, hours: 15 });
	assert.deepEqual(timeUntil(3_600_000 * 5, 0), { days: 0, hours: 5 });
	assert.equal(timeUntil(0, 1), undefined);
});

// ---- NotificationMatrix ----

test('matrix cell keys round-trip; the last colon splits event from channel', () => {
	assert.equal(matrixCellKey('mention', 'email'), 'mention:email');
	assert.deepEqual(parseMatrixCellKey('mention:email'), { event: 'mention', channel: 'email' });
	assert.deepEqual(parseMatrixCellKey('team:joined:push'), { event: 'team:joined', channel: 'push' });
	assert.equal(parseMatrixCellKey('nocolon'), null);
	assert.equal(parseMatrixCellKey(':email'), null);
	assert.equal(parseMatrixCellKey('mention:'), null);
});

test('matrixColumnState: all, some or none of the changeable cells', () => {
	const keys = ['a:email', 'b:email', 'c:email'];
	assert.equal(matrixColumnState(keys, ['a:email', 'b:email', 'c:email', 'a:push']), 'all');
	assert.equal(matrixColumnState(keys, ['b:email']), 'some');
	assert.equal(matrixColumnState(keys, ['a:push']), 'none');
	assert.equal(matrixColumnState([], ['a:email']), 'none');
});

test('toggleMatrixColumn turns only the given cells on or off and keeps the rest in order', () => {
	const selected = ['a:push', 'b:email', 'c:push'];
	assert.deepEqual(toggleMatrixColumn(selected, ['a:email', 'b:email'], true), ['a:push', 'b:email', 'c:push', 'a:email']);
	assert.deepEqual(toggleMatrixColumn(selected, ['a:email', 'b:email'], false), ['a:push', 'c:push']);
	// A locked cell is left out of `keys`, so it is never touched.
	assert.deepEqual(toggleMatrixColumn(['s:email'], ['a:email'], false), ['s:email']);
});

test('groupMatrixEvents keeps first-appearance order and leaves ungrouped events unlabelled', () => {
	const groups = groupMatrixEvents([
		{ id: 'a', group: 'Activity' },
		{ id: 'x' },
		{ id: 'b', group: 'Activity' },
		{ id: 's', group: 'Account' }
	]);
	assert.deepEqual(
		groups.map((g) => [g.group, g.events.map((e) => e.id)]),
		[
			['Activity', ['a', 'b']],
			[undefined, ['x']],
			['Account', ['s']]
		]
	);
});

// ---- SettingsItemList ----

test('filterSettingsItems matches every word across label, description, meta, badges and status, ignoring case and accents', () => {
	const ids = (q: string) => filterSettingsItems(SAMPLE_SETTINGS_MEMBERS, q).map((m) => m.id);
	assert.deepEqual(ids(''), ['m1', 'm2', 'm3', 'm4', 'i1']);
	assert.deepEqual(ids('chloe'), ['m3']);
	assert.deepEqual(ids('ADMIN'), ['m2']);
	assert.deepEqual(ids('owner'), ['m1']);
	assert.deepEqual(ids('away'), ['m4']);
	assert.deepEqual(ids('northwind invited'), ['i1']);
	assert.deepEqual(ids('nobody here'), []);
});

test('groupSettingsItems keeps unknown groups in the main list', () => {
	const { main, groups } = groupSettingsItems(
		[
			{ id: 'a', label: 'A' },
			{ id: 'b', label: 'B', group: 'invited' },
			{ id: 'c', label: 'C', group: 'gone' }
		],
		[{ id: 'invited' }]
	);
	assert.deepEqual(main.map((i) => i.id), ['a', 'c']);
	assert.deepEqual(groups.get('invited')?.map((i) => i.id), ['b']);
});

test('selectableIds drops locked and missing items from a bulk action', () => {
	assert.deepEqual(selectableIds(SAMPLE_SETTINGS_MEMBERS, ['m1', 'm2', 'gone', 'i1']), ['m2', 'i1']);
});

// ---- Element ids ----

test('idPart keeps letters and digits and gives every other character its own escape, with no hyphen', () => {
	assert.equal(idPart('m1'), 'm1');
	assert.equal(idPart('a-b'), 'a_19_b');
	assert.equal(idPart('mention:email'), 'mention_1m_email');
	assert.equal(idPart('a b'), 'a_w_b');
	assert.ok(!idPart('x-y:z é/😀').includes('-'));
	assert.match(idPart('x-y:z é/😀'), /^[A-Za-z0-9_]+$/);
});

test('idPart is one-to-one, so joined ids from different parts never collide', () => {
	const join = (...parts: string[]) => parts.map(idPart).join('-');
	assert.notEqual(join('a-b', 'c'), join('a', 'b-c'));
	assert.notEqual(join('a_b'), join('a b'));
	assert.notEqual(join('a__b'), join('a_b'));
	const samples = ['a', 'a-', '-a', 'a_', '_a', 'a:b', 'a::b', 'a_1m_b', 'é', 'é', '😀', ''];
	assert.equal(new Set(samples.map(idPart)).size, samples.length);
});
