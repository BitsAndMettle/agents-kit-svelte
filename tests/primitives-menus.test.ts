import assert from 'node:assert/strict';
import test from 'node:test';
import {
	formatShortcut,
	groupBy,
	isApplePlatform,
	isTextEntry,
	matchesQuery,
	matchesShortcut,
	parseShortcut
} from '../src/lib/primitives/menus/helpers.ts';

const key = (k: string, mods: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey', boolean>> = {}) => ({
	key: k,
	ctrlKey: false,
	metaKey: false,
	altKey: false,
	shiftKey: false,
	...mods
});

test('matchesQuery: every word, any field, ignoring case; empty matches all', () => {
	assert.equal(matchesQuery(['Open settings'], ''), true);
	assert.equal(matchesQuery(['Open settings'], '  '), true);
	assert.equal(matchesQuery(['Open settings'], 'SET'), true);
	assert.equal(matchesQuery(['Open settings', 'Workspace'], 'open work'), true);
	assert.equal(matchesQuery(['Open settings'], 'open board'), false);
	assert.equal(matchesQuery([undefined, 'Platform'], 'plat'), true);
});

test('groupBy keeps first-appearance order and one unnamed section', () => {
	const items = [
		{ id: 'a', group: 'X' },
		{ id: 'b' },
		{ id: 'c', group: 'Y' },
		{ id: 'd', group: 'X' },
		{ id: 'e' }
	];
	assert.deepEqual(
		groupBy(items).map((s) => [s.name, s.items.map((i) => i.id)]),
		[
			['X', ['a', 'd']],
			[null, ['b', 'e']],
			['Y', ['c']]
		]
	);
	assert.deepEqual(groupBy([]), []);
});

test('parseShortcut reads modifiers and the key', () => {
	assert.deepEqual(parseShortcut('mod+k'), { key: 'k', mod: true, ctrl: false, meta: false, alt: false, shift: false });
	assert.deepEqual(parseShortcut('Ctrl+Shift+P'), { key: 'p', mod: false, ctrl: true, meta: false, alt: false, shift: true });
	assert.equal(parseShortcut('mod++')?.key, '+');
	assert.equal(parseShortcut('ctrl+'), null);
});

test('matchesShortcut: mod is ⌘ on Apple, Ctrl elsewhere; extra modifiers do not match', () => {
	assert.equal(matchesShortcut(key('k', { ctrlKey: true }), 'mod+k', false), true);
	assert.equal(matchesShortcut(key('k', { metaKey: true }), 'mod+k', false), false);
	assert.equal(matchesShortcut(key('k', { metaKey: true }), 'mod+k', true), true);
	assert.equal(matchesShortcut(key('K', { ctrlKey: true }), 'mod+k', false), true);
	assert.equal(matchesShortcut(key('k', { ctrlKey: true, shiftKey: true }), 'mod+k', false), false);
	assert.equal(matchesShortcut(key('P', { ctrlKey: true, shiftKey: true }), 'ctrl+shift+p', true), true);
	assert.equal(matchesShortcut(key('k'), 'mod+k', false), false);
	assert.equal(matchesShortcut(key('k', { ctrlKey: true }), '', false), false);
});

test('formatShortcut uses symbols on Apple platforms', () => {
	assert.equal(formatShortcut('mod+k', true), '⌘K');
	assert.equal(formatShortcut('mod+k', false), 'Ctrl+K');
	assert.equal(formatShortcut('ctrl+shift+p', true), '⌃⇧P');
	assert.equal(formatShortcut('alt+enter', false), 'Alt+Enter');
	assert.equal(formatShortcut('', false), '');
});

test('isApplePlatform', () => {
	assert.equal(isApplePlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)'), true);
	assert.equal(isApplePlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'), true);
	assert.equal(isApplePlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), false);
});

test('isTextEntry: text inputs, textareas, selects and contenteditable', () => {
	assert.equal(isTextEntry({ tagName: 'INPUT', type: 'text' }), true);
	assert.equal(isTextEntry({ tagName: 'input', type: 'search' }), true);
	assert.equal(isTextEntry({ tagName: 'INPUT' }), true);
	assert.equal(isTextEntry({ tagName: 'INPUT', type: 'checkbox' }), false);
	assert.equal(isTextEntry({ tagName: 'TEXTAREA' }), true);
	assert.equal(isTextEntry({ tagName: 'SELECT' }), true);
	assert.equal(isTextEntry({ tagName: 'DIV', isContentEditable: true }), true);
	assert.equal(isTextEntry({ tagName: 'BUTTON' }), false);
	assert.equal(isTextEntry(null), false);
});
