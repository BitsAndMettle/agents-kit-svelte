import assert from 'node:assert/strict';
import test from 'node:test';
import { badgeLabel, countLinks, coveringLock, layoutView, matchesShortcut, parseShortcut, resultMessage, asSentence, sentenceStop, type ShortcutEvent } from '../src/lib/settings/shell/shell.ts';
import { pickLock } from '../src/lib/settings/shared/lock.ts';
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

test('coveringLock: the stronger lock wins, with its own reason; a tie goes to the page', () => {
	const own = { kind: 'permission' as const };
	const weakParent = { lock: { kind: 'plan' as const }, reasonId: 'parent-reason' };
	const strongParent = { lock: { kind: 'readonly' as const }, reasonId: 'parent-reason' };
	assert.equal(coveringLock(undefined, 'own-reason', undefined, pickLock), undefined);
	assert.deepEqual(coveringLock(own, 'own-reason', undefined, pickLock), { lock: own, reasonId: 'own-reason' });
	// A weaker lock from above never beats the page's own.
	assert.deepEqual(coveringLock(own, 'own-reason', weakParent, pickLock), { lock: own, reasonId: 'own-reason' });
	assert.equal(coveringLock(own, 'own-reason', strongParent, pickLock), strongParent);
	assert.equal(coveringLock(undefined, 'own-reason', weakParent, pickLock), weakParent);
	const tie = { lock: { kind: 'permission' as const }, reasonId: 'parent-reason' };
	assert.deepEqual(coveringLock(own, 'own-reason', tie, pickLock), { lock: own, reasonId: 'own-reason' });
});

test('resultMessage shows a returned error, else field errors, else nothing', () => {
	assert.equal(resultMessage(undefined), undefined);
	assert.equal(resultMessage('done'), undefined);
	assert.equal(resultMessage({}), undefined);
	assert.equal(resultMessage({ error: '  ' }), undefined);
	assert.equal(resultMessage({ error: 'Server said no' }), 'Server said no');
	assert.equal(resultMessage({ error: 'Server said no', errors: { name: 'Too long' } }), 'Server said no');
	assert.equal(resultMessage({ errors: { name: 'Too long.', email: 'Taken.' } }), 'Too long. Taken.');
	assert.equal(resultMessage({ errors: { name: undefined } }), undefined);
	assert.equal(resultMessage({ notice: 'Saved' }), undefined);
});

test('sentenceStop and asSentence end a spoken part with a full stop unless it has one', () => {
	assert.equal(sentenceStop('6 members'), '.');
	assert.equal(sentenceStop('Team name and address.'), '');
	assert.equal(sentenceStop('Really?'), '');
	assert.equal(sentenceStop('   '), '');
	assert.equal(asSentence('Count: 3'), 'Count: 3.');
	assert.equal(asSentence(' Unsaved changes '), 'Unsaved changes.');
	assert.equal(asSentence('Done!'), 'Done!');
});

test('badgeLabel says a number is a count and reads a word as it is', () => {
	assert.equal(badgeLabel(3), 'Count: 3');
	assert.equal(badgeLabel(0), 'Count: 0');
	assert.equal(badgeLabel('Beta'), 'Beta');
});
