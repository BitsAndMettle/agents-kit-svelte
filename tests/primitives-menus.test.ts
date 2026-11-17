import assert from 'node:assert/strict';
import test from 'node:test';
import {
	formatShortcut,
	groupBy,
	isApplePlatform,
	isTextEntry,
	matchesQuery,
	matchesShortcut,
	parseShortcut,
	themeCookie,
	themeOf
} from '../src/lib/primitives/menus/helpers.ts';
import { pillClass } from '../src/lib/ui/styles.ts';
import { ssr } from './ssr.ts';

const { load, html } = ssr();

test('themeOf: what the kit draws for <html>; the dark class wins, a missing or unknown data-theme is light', () => {
	assert.equal(themeOf('dark', false), 'dark');
	assert.equal(themeOf('system', false), 'system');
	assert.equal(themeOf('light', false), 'light');
	assert.equal(themeOf(null, false), 'light');
	assert.equal(themeOf('sepia', false), 'light');
	assert.equal(themeOf('light', true), 'dark');
	assert.equal(themeOf(null, true), 'dark');
});

test('themeCookie keeps the theme for a year on every path, same-site and secure', () => {
	assert.equal(themeCookie('theme', 'system'), 'theme=system; Max-Age=31536000; Path=/; SameSite=Lax; Secure');
});

test('ThemeToggle: one button named Theme opens the Light, Dark and System choice', async () => {
	const ThemeToggle = await load('/src/lib/primitives/menus/ThemeToggle.svelte');
	const out = html(ThemeToggle, { cookie: 'theme' });
	assert.equal(out.match(/<button\b/g)?.length, 1);
	assert.match(out, /<button aria-label="Theme"[^>]*aria-haspopup="menu"/);
	assert.deepEqual([...out.matchAll(/role="menuitemradio"[^>]*>[\s\S]*?<span[^>]*>([^<]*)<\/span>/g)].map(([, label]) => label), ['Light', 'Dark', 'System']);
});

test('CommandPalette triggerCompact: a 32px ghost icon opener named by triggerLabel, the shortcut from 640px', async () => {
	const CommandPalette = await load('/src/lib/primitives/menus/CommandPalette.svelte');
	const opener = (props: Record<string, unknown>) => html(CommandPalette, { commands: [], triggerLabel: 'Search', ...props }).match(/<button[\s\S]*?<\/button>/)![0];
	const compact = opener({ triggerCompact: true });
	assert.match(compact, /aria-label="Search"/);
	assert.ok(compact.includes(`class="${pillClass('ghost', 'md').replaceAll('&', '&amp;')}"`));
	assert.match(compact, /<span class="hidden text-xs sm:inline">Ctrl\+K<\/span>/);
	assert.doesNotMatch(compact, /<kbd|>Search</);
	const full = opener({});
	assert.match(full, /<span>Search<\/span>/);
	assert.match(full, /<kbd[^>]*>Ctrl\+K<\/kbd>/);
	assert.doesNotMatch(full, /aria-label=/);
});

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
