import assert from 'node:assert/strict';
import test from 'node:test';
import {
	closeLayer,
	dismissOnEscape,
	dismissOnFocusOut,
	dismissOnPointer,
	hasModal,
	openLayer,
	resolveParent,
	topModalIndex,
	type Chain,
	type ChainEntry
} from '../src/lib/headless/logic/layer-chain.ts';

const allow = { escape: true, outside: true, focusOut: true };
const modal = (id: string, dismiss = { ...allow, focusOut: false }): ChainEntry => ({ id, kind: 'modal', dismiss });
const pop = (id: string, dismiss = allow): ChainEntry => ({ id, kind: 'popover', dismiss });
const ids = (chain: Chain) => chain.map((e) => e.id);

test('resolveParent picks the deepest layer containing the trigger', () => {
	const chain = [modal('dialog'), pop('menu'), pop('sub')];
	assert.equal(resolveParent(chain, true, (i) => i <= 1), 1);
	assert.equal(resolveParent(chain, true, () => true), 2);
});

test('resolveParent stacks programmatic opens on top', () => {
	assert.equal(resolveParent([pop('a'), pop('b')], false, () => false), 1);
	assert.equal(resolveParent([], false, () => false), -1);
});

test('resolveParent clamps an outside trigger to the top modal, else roots it', () => {
	assert.equal(resolveParent([modal('d'), pop('p')], true, () => false), 0);
	assert.equal(resolveParent([pop('p')], true, () => false), -1);
});

test('openLayer closes non-ancestors top-down and pushes', () => {
	const chain = [modal('dialog'), pop('menu'), pop('sub')];
	const change = openLayer(chain, pop('other'), 0);
	assert.deepEqual(ids(change.chain), ['dialog', 'other']);
	assert.deepEqual(change.close, ['sub', 'menu']);
});

test('openLayer as a root replaces the whole chain (single open path)', () => {
	const change = openLayer([pop('a'), pop('a-child')], pop('b'), -1);
	assert.deepEqual(ids(change.chain), ['b']);
	assert.deepEqual(change.close, ['a-child', 'a']);
});

test('openLayer is idempotent', () => {
	const first = openLayer([pop('a')], pop('b'), 0);
	const again = openLayer(first.chain, pop('b'), 0);
	assert.equal(again.chain, first.chain);
	assert.deepEqual(again.close, []);
});

test('closeLayer closes the layer and everything above it, top-down, idempotently', () => {
	const chain = [modal('dialog'), pop('menu'), pop('sub')];
	const change = closeLayer(chain, 'menu');
	assert.deepEqual(ids(change.chain), ['dialog']);
	assert.deepEqual(change.close, ['sub', 'menu']);
	const again = closeLayer(change.chain, 'menu');
	assert.deepEqual(again.close, []);
	assert.equal(again.chain, change.chain);
});

test('nested Escape closes the topmost layer only, in order', () => {
	let chain: Chain = [modal('dialog'), pop('popover')];
	let change = dismissOnEscape(chain);
	assert.deepEqual(change.close, ['popover']);
	assert.equal(change.consumed, true);
	chain = change.chain;
	change = dismissOnEscape(chain);
	assert.deepEqual(change.close, ['dialog']);
	chain = change.chain;
	change = dismissOnEscape(chain);
	assert.deepEqual(change.close, []);
	assert.equal(change.consumed, false);
});

test('a refusing top layer swallows Escape so nothing closes through it', () => {
	const chain = [modal('dialog'), pop('busy', { ...allow, escape: false })];
	const change = dismissOnEscape(chain);
	assert.deepEqual(change.close, []);
	assert.equal(change.consumed, true);
	assert.equal(change.chain, chain);
});

test('pointer outside every layer closes non-modal layers top-down', () => {
	const change = dismissOnPointer([pop('menu'), pop('sub')], -1);
	assert.deepEqual(change.close, ['sub', 'menu']);
	assert.deepEqual(change.chain, []);
});

test('pointer inside a lower layer closes only the layers above the hit', () => {
	const chain = [modal('dialog'), pop('popover')];
	const change = dismissOnPointer(chain, 0);
	assert.deepEqual(change.close, ['popover']);
	assert.deepEqual(ids(change.chain), ['dialog']);
});

test('pointer inside the topmost layer closes nothing', () => {
	const chain = [pop('menu'), pop('sub')];
	assert.deepEqual(dismissOnPointer(chain, 1).close, []);
});

test('backdrop press (hit -1) closes the modal when it allows outside dismissal', () => {
	assert.deepEqual(dismissOnPointer([modal('dialog')], -1).close, ['dialog']);
	const alert = modal('alert', { escape: true, outside: false, focusOut: false });
	assert.deepEqual(dismissOnPointer([alert], -1).close, []);
});

test('pointer dismissal stops at the first refusing layer', () => {
	const chain = [pop('a'), pop('b', { ...allow, outside: false }), pop('c')];
	const change = dismissOnPointer(chain, -1);
	assert.deepEqual(change.close, ['c']);
	assert.deepEqual(ids(change.chain), ['a', 'b']);
});

test('pointer dismissal never reaches below the top modal', () => {
	const chain = [pop('page-popover'), modal('dialog'), pop('inner')];
	const change = dismissOnPointer(chain, -1);
	assert.deepEqual(change.close, ['inner', 'dialog']);
	assert.deepEqual(ids(change.chain), ['page-popover']);
});

test('focus-out closes a non-modal layer when focus leaves it and its children', () => {
	const chain = [pop('menu'), pop('sub')];
	assert.deepEqual(dismissOnFocusOut(chain, 'menu', -1).close, ['sub', 'menu']);
	assert.deepEqual(dismissOnFocusOut(chain, 'menu', 1).close, [], 'focus moved into the submenu');
	assert.deepEqual(dismissOnFocusOut(chain, 'menu', 0).close, [], 'focus stayed in the menu');
	assert.deepEqual(dismissOnFocusOut(chain, 'sub', 0).close, ['sub'], 'focus moved back to the parent');
});

test('focus-out never closes modals or layers without focusOut', () => {
	assert.deepEqual(dismissOnFocusOut([modal('dialog')], 'dialog', -1).close, []);
	assert.deepEqual(dismissOnFocusOut([pop('p', { ...allow, focusOut: false })], 'p', -1).close, []);
	assert.deepEqual(dismissOnFocusOut([pop('p')], 'missing', -1).close, []);
});

test('topModalIndex and hasModal', () => {
	assert.equal(topModalIndex([pop('a'), modal('b'), modal('c'), pop('d')]), 2);
	assert.equal(topModalIndex([pop('a')]), -1);
	assert.equal(hasModal([pop('a')]), false);
	assert.equal(hasModal([pop('a'), modal('b')]), true);
});
