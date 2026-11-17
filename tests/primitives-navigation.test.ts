import assert from 'node:assert/strict';
import test from 'node:test';
import type { AppShellItem } from '../src/lib/primitives/navigation/AppShell.svelte';
import { paginationRange } from '../src/lib/primitives/navigation/pagination-range.ts';
import { ssr } from './ssr.ts';

const { load, html, snippet } = ssr();

const S = 'start-ellipsis';
const E = 'end-ellipsis';

test('paginationRange shows every page when they fit', () => {
	assert.deepEqual(paginationRange({ page: 1, pageCount: 1 }), [1]);
	assert.deepEqual(paginationRange({ page: 3, pageCount: 7 }), [1, 2, 3, 4, 5, 6, 7]);
	assert.deepEqual(paginationRange({ page: 1, pageCount: 0 }), []);
});

test('paginationRange puts an ellipsis only at the far end near the start', () => {
	assert.deepEqual(paginationRange({ page: 1, pageCount: 12 }), [1, 2, 3, 4, 5, E, 12]);
	assert.deepEqual(paginationRange({ page: 4, pageCount: 12 }), [1, 2, 3, 4, 5, E, 12]);
});

test('paginationRange puts ellipses on both sides in the middle', () => {
	assert.deepEqual(paginationRange({ page: 6, pageCount: 12 }), [1, S, 5, 6, 7, E, 12]);
});

test('paginationRange mirrors near the end', () => {
	assert.deepEqual(paginationRange({ page: 12, pageCount: 12 }), [1, S, 8, 9, 10, 11, 12]);
	assert.deepEqual(paginationRange({ page: 9, pageCount: 12 }), [1, S, 8, 9, 10, 11, 12]);
});

test('paginationRange never hides a single page behind an ellipsis', () => {
	// Page 5 of 12 with siblings 1: pages 2-3 are two hidden pages, so an ellipsis; page 4 is shown.
	assert.deepEqual(paginationRange({ page: 5, pageCount: 12 }), [1, S, 4, 5, 6, E, 12]);
	assert.deepEqual(paginationRange({ page: 5, pageCount: 9 }), [1, S, 4, 5, 6, E, 9]);
	// Page 4 of 9: only page 2 sits between the boundary and the siblings, so it is shown, not elided.
	assert.deepEqual(paginationRange({ page: 4, pageCount: 9 }), [1, 2, 3, 4, 5, E, 9]);
});

test('paginationRange keeps a constant slot count and honours siblings and boundaries', () => {
	for (let page = 1; page <= 20; page++) assert.equal(paginationRange({ page, pageCount: 20 }).length, 7);
	assert.deepEqual(paginationRange({ page: 10, pageCount: 20, siblings: 2 }), [1, S, 8, 9, 10, 11, 12, E, 20]);
	assert.deepEqual(paginationRange({ page: 10, pageCount: 20, boundaries: 2 }), [1, 2, S, 9, 10, 11, E, 19, 20]);
	assert.deepEqual(paginationRange({ page: 10, pageCount: 20, siblings: 0, boundaries: 0 }), [S, 10, E]);
});

test('paginationRange clamps an out-of-range page', () => {
	assert.deepEqual(paginationRange({ page: 99, pageCount: 12 }), paginationRange({ page: 12, pageCount: 12 }));
	assert.deepEqual(paginationRange({ page: -3, pageCount: 12 }), paginationRange({ page: 1, pageCount: 12 }));
});

const PLACES: AppShellItem[] = [
	{ label: 'Home', href: '/' },
	{ label: 'Board', href: '/acme/board' },
	{ label: 'Chat', href: '/acme/chat', fill: true },
	{ label: 'Settings', href: '/acme/settings/', count: 2, countLabel: 'open notices' },
	{ label: 'Activity', href: '/acme/activity', count: 0 }
];

test('AppShell: one bar over the page, with the name, the places inside a named navigation and your controls', async () => {
	const AppShell = await load('/src/lib/primitives/navigation/AppShell.svelte');
	const out = html(AppShell, {
		title: 'Acme',
		items: PLACES,
		path: '/acme/board',
		'aria-label': 'Workspace',
		actions: snippet(() => '<button type="button">Sign out</button>'),
		children: snippet(() => '<p>The page</p>'),
		'data-app': 'acme',
		class: 'min-h-full'
	});

	// Your attributes reach the root, and your class replaces the kit's: here, how tall the shell is at least.
	assert.match(out, /^<div data-app="acme" class="(?![^"]*min-h-dvh)[^"]* min-h-full">/);
	// The bar, then the page as the one main region.
	assert.match(out, /<header[^>]*><div[^>]*><p[^>]*>Acme<\/p>\s*<nav aria-label="Workspace"[^>]*>[\s\S]*<\/nav>\s*<div[^>]*><button type="button">Sign out<\/button><\/div><\/div><\/header>\s*<main[^>]*><p>The page<\/p><\/main><\/div>$/);
	assert.deepEqual([...out.matchAll(/<a href="([^"]*)"/g)].map(([, href]) => href), PLACES.map((item) => item.href));
	// A count shows after its label, with what it counts for a screen reader. A count of 0 does not show.
	assert.match(out, />Settings\s*<span[^>]*>\s*2<span class="sr-only"> open notices<\/span><\/span>\s*<\/a>/);
	assert.match(out, />Activity\s*<\/a>/);

	// Without a name or controls the bar is the navigation alone, and it still has a name.
	const bare = html(AppShell, { items: PLACES, path: '/' });
	assert.match(bare, /<header[^>]*><div[^>]*>\s*<nav aria-label="Main"[^>]*>[\s\S]*<\/nav>\s*<\/div><\/header>/);
});

test('AppShell: given the width of the page, the content of the bar lines up with it while the bar spans the window', async () => {
	const AppShell = await load('/src/lib/primitives/navigation/AppShell.svelte');
	assert.match(html(AppShell, { items: PLACES, path: '/', maxWidth: '72rem' }), /<header class="[^"]*border-b[^"]*"><div class="mx-auto [^"]*" style="max-width: 72rem;">/);
	assert.doesNotMatch(html(AppShell, { items: PLACES, path: '/' }), /max-width/);
});

test('AppShell: a page scrolls with the document under a bar that stays, and a place that fills gets exactly the viewport', async () => {
	const AppShell = await load('/src/lib/primitives/navigation/AppShell.svelte');
	const heights = (path: string) => (html(AppShell, { items: PLACES, path }).match(/^<div class="([^"]*)"/)?.[1] ?? '').split(' ').filter((name) => name.endsWith('h-dvh'));

	// At least the viewport, and as tall as the page: the document scrolls it.
	assert.deepEqual(heights('/acme/board'), ['min-h-dvh']);
	assert.deepEqual(heights('/elsewhere'), ['min-h-dvh']);
	// Exactly the viewport, so the page gets the space under the bar. A page under that place gets it too.
	assert.deepEqual(heights('/acme/chat'), ['h-dvh']);
	assert.deepEqual(heights('/acme/chat/earlier'), ['h-dvh']);
	// The bar stays in view while the document scrolls.
	assert.match(html(AppShell, { items: PLACES, path: '/acme/board' }), /<header class="sticky top-0 /);
});

test('AppShell: the item the path is under is the current page', async () => {
	const AppShell = await load('/src/lib/primitives/navigation/AppShell.svelte');
	const currentAt = (path: string, items = PLACES) => [...html(AppShell, { items, path }).matchAll(/<a href="([^"]*)" aria-current="page"/g)].map(([, href]) => href);

	assert.deepEqual(currentAt('/acme/board'), ['/acme/board']);
	// A page under an item belongs to it, and slashes at the end do not count.
	assert.deepEqual(currentAt('/acme/board/42/'), ['/acme/board']);
	assert.deepEqual(currentAt('/acme/settings'), ['/acme/settings/']);
	// A longer name is another place: only the root is above it.
	assert.deepEqual(currentAt('/acme/boardroom'), ['/']);
	assert.deepEqual(currentAt('/'), ['/']);
	// With no item above the path, no page is current.
	assert.deepEqual(currentAt('/elsewhere', PLACES.slice(1)), []);
});
