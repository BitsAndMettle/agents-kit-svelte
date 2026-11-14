import assert from 'node:assert/strict';
import test from 'node:test';
import {
	AVATAR_TINTS,
	initialsFromName,
	progressPercent,
	resolveKey,
	toneIndexFromName
} from '../src/lib/primitives/display/helpers.ts';
import { ssr } from './ssr.ts';

const { load, html, snippet } = ssr();

test('Alert: only a dismissible alert has a dismiss button and a busy state', async () => {
	const Alert = await load('/src/lib/primitives/display/Alert.svelte');
	assert.doesNotMatch(html(Alert, { title: 'Saved' }), /aria-busy|<button/);
	assert.match(html(Alert, { title: 'Saving', 'aria-busy': 'true' }), /^<div aria-busy="true"/, 'your own aria-busy still reaches it');
	assert.match(html(Alert, { title: 'Saved', onDismiss: () => {} }), /^<div[^>]*aria-busy="false"[^>]*>[\s\S]*<button[^>]*aria-label="Dismiss"/);
});

test('Notice is an Alert: a warning by default, always with a dismiss button named after it', async () => {
	const Notice = await load('/src/lib/primitives/display/Notice.svelte');
	const out = html(Notice, { title: 'Build box is offline', description: 'Nothing can run.', class: 'mt-4', onDismiss: () => {} });
	// One element: the alert itself carries the busy state, the tone and the caller's class.
	assert.match(out, /^<div aria-busy="false" class="[^"]*bg-status-warning-subtle[^"]* mt-4"/);
	assert.match(out, /<button[^>]*aria-label="Dismiss: Build box is offline"/);

	const other = html(Notice, { title: 'Hors ligne', tone: 'danger', dismissLabel: 'Ignorer', onDismiss: () => {} });
	assert.match(other, /bg-status-danger-subtle/);
	assert.match(other, /aria-label="Ignorer: Hors ligne"/);
});

test('ListRow: a list item with its title, the facts after it, a quieter line under it and the actions at the end', async () => {
	const ListRow = await load('/src/lib/primitives/display/ListRow.svelte');
	const out = html(ListRow, {
		title: 'Build box',
		description: 'Two slots free',
		children: snippet(() => '<span>Online</span>'),
		actions: snippet(() => '<button type="button">Revoke</button>')
	});
	assert.match(out, /^<li class="[^"]*"><div[^>]*><div[^>]*><p[^>]*>Build box<\/p>\s*<span>Online<\/span><\/div>\s*<p[^>]*>Two slots free<\/p><\/div>\s*<div[^>]*><button type="button">Revoke<\/button><\/div><\/li>$/);

	// With `href` the title is the link, and attributes and your class reach the list item.
	const link = html(ListRow, { title: 'example/site', href: 'https://example.com/site', id: 'repo', class: 'px-4' });
	assert.match(link, /^<li id="repo" class="[^"]* px-4">/);
	assert.match(link, /<a href="https:\/\/example\.com\/site"[^>]*>example\/site<\/a>/);
	assert.doesNotMatch(link, /<p|<button/);
});

test('CopyCommand: the whole command beside a named copy button, and nothing said until something is copied', async () => {
	const CopyCommand = await load('/src/lib/primitives/display/CopyCommand.svelte');
	const out = html(CopyCommand, { command: 'npm install <thing> && echo "done"', copyLabel: 'Copy the install command', class: 'mt-2' });
	assert.match(out, /^<div class="[^"]* mt-2">/);
	// Every word is its own box, and together they are the command, character for character.
	const code = out.match(/<code[^>]*>([\s\S]*?)<\/code>/)?.[1] ?? '';
	assert.equal(code.replace(/<[^>]*>/g, ''), 'npm install &lt;thing> &amp;&amp; echo "done"');
	assert.equal(code.match(/<span/g)?.length, 6);
	assert.match(out, /<button type="button" aria-label="Copy the install command"/);
	assert.match(out, /<p role="status" class="[^"]*sr-only"><\/p>/);
});

test('initialsFromName takes first and last word, or two letters of one word', () => {
	assert.equal(initialsFromName('Ada Lovelace'), 'AL');
	assert.equal(initialsFromName('  grace   brewster  hopper '), 'GH');
	assert.equal(initialsFromName('Linus'), 'LI');
	assert.equal(initialsFromName('x'), 'X');
	assert.equal(initialsFromName('   '), '');
});

test('toneIndexFromName is stable, case-insensitive and in range', () => {
	const a = toneIndexFromName('Ada Lovelace', AVATAR_TINTS.length);
	assert.equal(a, toneIndexFromName('ada lovelace ', AVATAR_TINTS.length));
	for (const name of ['', 'A', 'Grace Hopper', 'Margaret Hamilton']) {
		const index = toneIndexFromName(name, AVATAR_TINTS.length);
		assert.ok(index >= 0 && index < AVATAR_TINTS.length);
	}
});

test('resolveKey maps Mod and the Mac modifiers, and passes other keys through', () => {
	assert.deepEqual(resolveKey('Mod', true), { display: '⌘', label: 'Command' });
	assert.deepEqual(resolveKey('Mod', false), { display: 'Ctrl', label: 'Control' });
	assert.deepEqual(resolveKey('Shift', true), { display: '⇧', label: 'Shift' });
	assert.deepEqual(resolveKey('Shift', false), { display: 'Shift', label: 'Shift' });
	assert.deepEqual(resolveKey('K', true), { display: 'K', label: 'K' });
});

test('progressPercent clamps to the range and tolerates an empty range', () => {
	assert.equal(progressPercent(50, 0, 100), 50);
	assert.equal(progressPercent(150, 0, 100), 100);
	assert.equal(progressPercent(-5, 0, 100), 0);
	assert.equal(progressPercent(7, 5, 10), 40);
	assert.equal(progressPercent(3, 5, 5), 0);
});
