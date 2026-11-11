import assert from 'node:assert/strict';
import test from 'node:test';
import { groupBlockedWork, humanizeBlockedKind, isBlockedItemBusy } from '../src/lib/agents-ui/blocked-work.ts';
import type { BlockedItem } from '../src/lib/agents-ui/blocked-work.ts';
import { SAMPLE_BLOCKED_ITEMS } from '../src/lib/fixtures/workflows.ts';

const item = (id: string, kind: string): BlockedItem => ({ id, title: id, reason: { kind, label: kind }, actions: [] });

test('groups by kind in first-seen order and keeps item order', () => {
	const groups = groupBlockedWork([item('a', 'hold'), item('b', 'parked'), item('c', 'hold')]);
	assert.deepEqual(groups.map((g) => g.kind), ['hold', 'parked']);
	assert.deepEqual(groups[0].items.map((i) => i.id), ['a', 'c']);
});

test('order puts listed kinds first, the rest after in first-seen order', () => {
	const groups = groupBlockedWork([item('a', 'x'), item('b', 'hold'), item('c', 'y')], ['hold']);
	assert.deepEqual(groups.map((g) => g.kind), ['hold', 'x', 'y']);
});

test('labels fall back to a humanized kind', () => {
	assert.equal(humanizeBlockedKind('blocker-closed'), 'Blocker closed');
	const [g] = groupBlockedWork([item('a', 'needs-person')], [], { 'needs-person': 'Needs you' });
	assert.equal(g.label, 'Needs you');
	assert.equal(groupBlockedWork([item('a', 'parked')])[0].label, 'Parked');
});

test('no items gives no groups', () => assert.deepEqual(groupBlockedWork([]), []));

test('isBlockedItemBusy reads the item flag or the id set', () => {
	assert.equal(isBlockedItemBusy({ ...item('a', 'k'), busy: true }), true);
	assert.equal(isBlockedItemBusy(item('a', 'k'), new Set(['a'])), true);
	assert.equal(isBlockedItemBusy(item('a', 'k'), ['b']), false);
	assert.equal(isBlockedItemBusy(item('a', 'k')), false);
});

test('sample fixtures cover four reason kinds, a confirmed danger action and an item with no actions', () => {
	assert.ok(new Set(SAMPLE_BLOCKED_ITEMS.map((i) => i.reason.kind)).size >= 4);
	assert.ok(SAMPLE_BLOCKED_ITEMS.some((i) => i.actions.some((a) => a.tone === 'danger' && a.confirm)));
	assert.ok(SAMPLE_BLOCKED_ITEMS.some((i) => i.actions.length === 0));
});
