import assert from 'node:assert/strict';
import test from 'node:test';
import { countLinks, layoutView, matchesShortcut, parseShortcut, type ShortcutEvent } from '../src/lib/settings/shell/shell.ts';
import { SAMPLE_SETTINGS_NAV } from '../src/lib/fixtures/settings.ts';
import { filterSettingsLinks } from '../src/lib/settings/shared/search.ts';

const key = (k: string, mods: Partial<Omit<ShortcutEvent, 'key'>> = {}): ShortcutEvent => ({ key: k, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods });

test('layoutView: auto shows the index until a section is current; section and index are fixed', () => {
	assert.equal(layoutView('auto', null), 'index');
	assert.equal(layoutView('auto', undefined), 'index');
	assert.equal(layoutView('auto', ''), 'index');
	assert.equal(layoutView('auto', 'billing'), 'section');
	assert.equal(layoutView('section', null), 'section');
	assert.equal(layoutView('index', 'billing'), 'index');
});

test('countLinks counts every link, disabled ones included, and follows a filter', () => {
	assert.equal(countLinks(SAMPLE_SETTINGS_NAV), 8);
	assert.equal(countLinks([]), 0);
	assert.equal(countLinks(filterSettingsLinks(SAMPLE_SETTINGS_NAV, 'invoices')), 1);
	assert.equal(countLinks(filterSettingsLinks(SAMPLE_SETTINGS_NAV, 'zzz')), 0);
});

test('parseShortcut reads modifiers in any order and gives Kbd keys', () => {
	assert.deepEqual(parseShortcut('mod+k'), { mod: true, ctrl: false, alt: false, shift: false, key: 'k', keys: ['Mod', 'K'] });
	assert.deepEqual(parseShortcut('Shift+Ctrl+F')?.keys, ['Ctrl', 'Shift', 'F']);
	assert.deepEqual(parseShortcut('/'), { mod: false, ctrl: false, alt: false, shift: false, key: '/', keys: ['/'] });
	assert.deepEqual(parseShortcut('+')?.key, '+');
	assert.equal(parseShortcut('escape')?.keys[0], 'Escape');
	assert.equal(parseShortcut(false), undefined);
	assert.equal(parseShortcut(''), undefined);
	assert.equal(parseShortcut('mod+'), undefined);
	assert.equal(parseShortcut('ctrl+shift'), undefined);
});

test('matchesShortcut: mod is Cmd on Apple platforms and Ctrl elsewhere', () => {
	const modK = parseShortcut('mod+k')!;
	assert.equal(matchesShortcut(modK, key('k', { metaKey: true }), true), true);
	assert.equal(matchesShortcut(modK, key('K', { metaKey: true }), true), true);
	assert.equal(matchesShortcut(modK, key('k', { ctrlKey: true }), true), false);
	assert.equal(matchesShortcut(modK, key('k', { ctrlKey: true }), false), true);
	assert.equal(matchesShortcut(modK, key('k', { metaKey: true }), false), false);
	assert.equal(matchesShortcut(modK, key('k', { ctrlKey: true, shiftKey: true }), false), false);
	assert.equal(matchesShortcut(modK, key('k'), false), false);
	assert.equal(matchesShortcut(modK, key('j', { ctrlKey: true }), false), false);
});

test('matchesShortcut: a bare printable key ignores Shift but not other modifiers', () => {
	const slash = parseShortcut('/')!;
	assert.equal(matchesShortcut(slash, key('/'), false), true);
	assert.equal(matchesShortcut(slash, key('/', { shiftKey: true }), false), true);
	assert.equal(matchesShortcut(slash, key('/', { ctrlKey: true }), false), false);
	assert.equal(matchesShortcut(slash, key('/', { altKey: true }), false), false);
	const shifted = parseShortcut('ctrl+shift+p')!;
	assert.equal(matchesShortcut(shifted, key('P', { ctrlKey: true, shiftKey: true }), true), true);
	assert.equal(matchesShortcut(shifted, key('p', { ctrlKey: true }), true), false);
});
