import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import type { Component } from 'svelte';
import { ssr } from './ssr.ts';

// The Studio chrome: every new class sits behind a new prop value, and the defaults draw what they drew before.
const { load, html, snippet } = ssr();
let AppShell: Component<Record<string, unknown>>;
let NativeSelect: Component<Record<string, unknown>>;
let Progress: Component<Record<string, unknown>>;

before(async () => {
	AppShell = await load('/src/lib/primitives/navigation/AppShell.svelte');
	NativeSelect = await load('/src/lib/primitives/form/NativeSelect.svelte');
	Progress = await load('/src/lib/primitives/display/Progress.svelte');
});

const PLACES = [
	{ label: 'Dashboard', href: '/acme', count: 2, countLabel: 'need you', countTone: 'warning' },
	{ label: 'Referee', href: '/acme/referee', fill: true },
	{ label: 'Settings', href: '/acme/settings' }
];
const MARK = '<svg aria-hidden="true" class="size-5"></svg>';
const links = (out: string) => [...out.matchAll(/<a href="[^"]*"( aria-current="page")? class="([^"]*)"/g)].map(([, current, classes]) => ({ current: Boolean(current), classes }));

test('AppShell studio: a 56px bar on the card surface, the name bold from 640px, flat places with the current one filled, solid counts', () => {
	const out = html(AppShell, { chrome: 'studio', title: 'Acme', mark: snippet(() => MARK), items: PLACES, path: '/acme/referee', actions: snippet(() => '<button type="button">Sign out</button>') });
	assert.match(out, /<header class="sticky top-0 z-40 shrink-0 border-b border-card-border bg-card-bg">/);
	assert.match(out, /<div class="mx-auto flex flex-wrap items-center min-h-14 gap-x-4 gap-y-3 px-4 py-2 lg:gap-x-6 sm:px-5">/);
	assert.match(html(AppShell, { chrome: 'studio', items: PLACES, path: '/', maxWidth: '76.75rem' }), /<div class="[^"]*min-h-14[^"]* sm:px-6" style="max-width: 76.75rem;">/);
	assert.match(out, /<p class="m-0 flex items-center gap-2 text-sm font-semibold sm:text-base sm:font-bold"><svg aria-hidden="true" class="size-5"><\/svg>Acme<\/p>/);
	// Flat links: no segment group around them.
	assert.match(out, /<ul class="m-0 flex list-none items-center gap-1 p-0">/);
	const all = links(out);
	assert.equal(all.length, 3);
	for (const link of all) {
		assert.match(link.classes, /\bh-\[30px\][^"]*\brounded-chip\b[^"]*\btext-sm\b[^"]*\bmax-sm:h-10\b/);
		if (link.current) assert.match(link.classes, / bg-canvas-secondary font-semibold text-fg-main$/);
		else assert.match(link.classes, / text-fg-light hover:bg-canvas-secondary hover:text-fg-main$/);
	}
	assert.deepEqual(all.map((link) => link.current), [false, true, false]);
	// The count is solid and still says what it counts.
	const count = out.match(/Dashboard\s*<span class="([^"]*)">\s*2<span class="sr-only"> need you<\/span><\/span>/);
	assert.ok(count, 'the count and its label');
	assert.match(count[1], /\bpx-\[7px\][^"]*\bleading-\[14px\][^"]*\bfont-semibold\b/);
	assert.doesNotMatch(count[1], /-subtle\b/);
	assert.match(out, /<div class="ml-auto flex items-center gap-1\.5 lg:gap-6"><button type="button">Sign out<\/button><\/div>/);
});

test('AppShell defaults: soft is the bar as it was; a mark adds only its row to the name, and draws without a title', () => {
	const props = { title: 'Acme', items: PLACES, path: '/acme', actions: snippet(() => '<button type="button">Sign out</button>') };
	const soft = html(AppShell, props);
	assert.equal(soft, html(AppShell, { ...props, chrome: 'soft' }));
	assert.match(soft, /<p class="m-0 text-sm font-semibold">Acme<\/p>/);
	assert.doesNotMatch(soft, /min-h-14|border-card-border|h-\[30px\]|lg:gap-6/);
	const marked = html(AppShell, { ...props, mark: snippet(() => MARK) });
	assert.equal(marked.replace('flex items-center gap-2 ', '').replace(MARK, ''), soft);
	assert.match(html(AppShell, { items: PLACES, path: '/', mark: snippet(() => MARK) }), /<p class="m-0 flex items-center gap-2 text-sm font-semibold"><svg aria-hidden="true" class="size-5"><\/svg><\/p>/);
});

test('NativeSelect studio: 36px with the chip radius in place of the control height and radius; mono sets the monospace face', () => {
	const options = [{ value: 'acme/web', label: 'acme/web' }];
	const select = (props: Record<string, unknown>) => html(NativeSelect, { options, 'aria-label': 'Repository', ...props }).match(/<select[^>]*class="([^"]*)"/)![1];
	const studio = select({ size: 'studio' });
	assert.match(studio, /\bh-9\b/);
	assert.match(studio, /\brounded-chip\b/);
	assert.match(studio, /\bpl-2\.5 pr-7 text-\[13px\]/);
	assert.doesNotMatch(studio, /\bh-8\b|\brounded-control\b|\bfont-mono\b/);
	assert.match(select({ size: 'studio', mono: true }), /\bfont-mono\b/);
	assert.match(select({ mono: true }), /\bh-8\b[\s\S]*\bfont-mono\b/);
	const plain = select({});
	assert.doesNotMatch(plain, /\bh-9\b|\brounded-chip\b|\bfont-mono\b/);
	assert.match(plain, /\bh-8\b/);
});

test('Progress xs: a 2px track in the border colour; md keeps its track', () => {
	const track = (size?: string) => html(Progress, { 'aria-label': 'Checkout', value: 7, max: 24, size }).match(/<div class="([^"]*rounded-full[^"]*)"/)![1];
	const xs = track('xs');
	assert.match(xs, /\bh-0\.5\b/);
	assert.match(xs, /\bbg-card-border\b/);
	assert.doesNotMatch(xs, /\bbg-canvas-secondary\b|\bh-1\.5\b/);
	assert.equal(track(), track('md'));
	assert.match(track(), /\bh-1\.5\b[\s\S]*\bbg-canvas-secondary\b/);
	assert.doesNotMatch(track(), /bg-card-border/);
});
