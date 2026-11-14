import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Setting, Tier, TierPreset } from '../src/lib/settings/types.ts';
import { ssr } from './ssr.ts';

const { load, html, module } = ssr();

test('Draft: holds the newest change until its save settles, whether it was saved or refused', async () => {
	const { Draft } = await module<typeof import('../src/lib/settings/draft.svelte.ts')>('/src/lib/settings/draft.svelte.ts');
	const draft = new Draft<string>();
	assert.equal(draft.value, undefined);

	let saved!: () => void;
	const first = draft.hold('first', () => new Promise<void>((resolve) => (saved = resolve)));
	assert.equal(draft.value, 'first');

	// A newer change takes over, and the older save settling lets go of nothing.
	let refuse!: (reason: Error) => void;
	const second = draft.hold('second', () => new Promise<void>((_, reject) => (refuse = reject)));
	saved();
	await first;
	assert.equal(draft.value, 'second');

	// A rejection lets go too, and is the caller's to handle.
	refuse(new Error('refused'));
	await assert.rejects(second, /refused/);
	assert.equal(draft.value, undefined);

	// A save that returns nothing is over at once.
	const seen: string[] = [];
	await draft.hold('third', (value) => void seen.push(value));
	assert.deepEqual(seen, ['third']);
	assert.equal(draft.value, undefined);
});

test('SettingsForm: each row gets the control its value calls for, named and described by the row', async () => {
	const SettingsForm = await load('/src/lib/settings/SettingsForm.svelte');
	const settings: Setting[] = [
		{ id: 'holds', label: 'Hold protected changes', description: 'Waits for you.', value: true },
		{ id: 'limit', label: 'Daily run limit', value: 40, min: 0, max: 500 },
		{ id: 'model', label: 'Model', value: 'deep', options: [{ value: 'fast', label: 'Fast' }, { value: 'deep', label: 'Deep' }] },
		{ id: 'prefix', label: 'Branch prefix', value: 'agent/', disabled: true }
	];
	const out = html(SettingsForm, { settings, onChange: () => {}, class: 'px-4' });
	const rows = out.split('<li').slice(1);
	assert.equal(rows.length, 4);

	// A boolean is a switch. The row's label names it and the row's description describes it.
	assert.match(rows[0], /<label for="(\S+?)"[^>]*>Hold protected changes<\/label>\s*<p id="\1-description"[^>]*>Waits for you\.<\/p>[\s\S]*<input id="\1" aria-describedby="\1-description" type="checkbox" role="switch" checked=""/);
	// A number is a number box that cannot be left empty, kept within its bounds by the browser.
	assert.match(rows[1], /<label for="(\S+?)"[^>]*>Daily run limit<\/label>[\s\S]*<input min="0" max="500" id="\1" required="" value="40" type="number"/);
	assert.doesNotMatch(rows[1], /aria-describedby/);
	// A string is a select of its options, or a text box when it has none.
	assert.match(rows[2], /<select id="\S+"[^>]*><option value="fast">Fast<\/option><option value="deep" selected="">Deep<\/option>/);
	assert.match(rows[3], /<input id="\S+" disabled="" value="agent\/" type="text"/);

	// Nothing is being saved yet, and your class reaches the list.
	assert.match(out, /^<ul aria-busy="false" class="[^"]* px-4">/);
	assert.equal(html(SettingsForm, { settings, onChange: () => {}, disabled: true }).match(/ disabled=""/g)?.length, 4);
});

test('TierMatrix: a radio group per tier, a locked tier turned off, and the matching preset pressed', async () => {
	const TierMatrix = await load('/src/lib/settings/TierMatrix.svelte');
	const tiers: Tier[] = [
		{ id: 'low', label: 'Low risk', description: 'Docs and tests.' },
		{ id: 'critical', label: 'Critical', locked: true }
	];
	const presets: TierPreset<Record<string, string>>[] = [
		{ id: 'careful', label: 'Careful', value: { low: 'ask' } },
		{ id: 'balanced', label: 'Balanced', value: { low: 'merge' } }
	];
	const props = {
		tiers,
		options: [
			{ value: 'ask', label: 'Ask' },
			{ value: 'merge', label: 'Merge' }
		],
		presets,
		value: { low: 'merge', critical: 'ask' },
		onChange: () => {}
	};
	const out = html(TierMatrix, props);

	// A tier's label names its group and its description describes it.
	assert.match(out, /<p id="(\S+?)"[^>]*>Low risk<\/p>\s*<p id="\1-description"[^>]*>Docs and tests\.<\/p>[\s\S]*?role="radiogroup" aria-labelledby="\1" aria-describedby="\1-description"/);
	const checked = [...out.matchAll(/role="radio" aria-checked="true"[\s\S]*?<span id="[^"]*-label"[^>]*>(\w+)<\/span>/g)].map(([, label]) => label);
	assert.deepEqual(checked, ['Merge', 'Ask']);
	// A locked tier shows its choice and is turned off; the other is not.
	assert.equal(out.match(/role="radiogroup"/g)?.length, 2);
	assert.match(out, /<p id="(\S+?)"[^>]*>Critical<\/p>[\s\S]*role="radiogroup" aria-disabled="true" aria-labelledby="\1"/);
	assert.equal(out.match(/role="radiogroup" aria-disabled="true"/g)?.length, 1);
	// The preset whose choices match is the pressed one.
	assert.match(out, /^<div aria-busy="false"[^>]*><div role="group" aria-label="Presets"[^>]*><button type="button" aria-pressed="false"[^>]*>Careful<\/button><button type="button" aria-pressed="true"[^>]*>Balanced<\/button><\/div>/);

	const bare = html(TierMatrix, { ...props, presets: undefined, disabled: true });
	assert.doesNotMatch(bare, /role="group"/);
	assert.equal(bare.match(/role="radiogroup" aria-disabled="true"/g)?.length, 2);
	assert.match(html(TierMatrix, { ...props, disabled: true, presetsLabel: 'Profils' }), /aria-label="Profils"[^>]*><button type="button" aria-pressed="false" disabled=""/);
});
