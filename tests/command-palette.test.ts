import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import type { Component } from 'svelte';
import { ssr } from './ssr.ts';

const { load, html } = ssr();
let CommandPalette: Component<Record<string, unknown>>;

before(async () => {
	CommandPalette = await load('/src/lib/primitives/menus/CommandPalette.svelte');
});

test('CommandPalette triggerCompact: a ghost icon opener named by triggerLabel, the shortcut from 640px', () => {
	const opener = (props: Record<string, unknown>) => html(CommandPalette, { commands: [], triggerLabel: 'Search', ...props }).match(/<button[\s\S]*?<\/button>/)![0];
	const compact = opener({ triggerCompact: true });
	assert.match(compact, /aria-label="Search"/);
	assert.match(compact, /h-8/);
	assert.match(compact, /<span class="hidden text-xs sm:inline">Ctrl\+K<\/span>/);
	assert.doesNotMatch(compact, /<kbd|>Search</);
	const full = opener({});
	assert.match(full, /<span>Search<\/span>/);
	assert.match(full, /<kbd[^>]*>Ctrl\+K<\/kbd>/);
	assert.doesNotMatch(full, /aria-label=/);
});
