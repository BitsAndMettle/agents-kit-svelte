import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { BoardLane, StatusStat } from '../src/lib/board/types.ts';
import { ssr } from './ssr.ts';

const { load, html, snippet } = ssr();

interface Task {
	id: number;
	title: string;
}

const LANES: BoardLane<Task>[] = [
	{
		id: 'ready',
		label: 'Ready',
		groups: [
			{ id: 'digest', label: 'Weekly digest', items: [{ id: 1, title: 'One' }, { id: 2, title: 'Two' }] },
			{ id: 'loose', items: [{ id: 3, title: 'Three' }] }
		]
	},
	{ id: 'done', label: 'Done', groups: [] }
];

test('BoardLanes: lanes in order with their counts, cards under group headings, drawn by the snippet', async () => {
	const BoardLanes = await load('/src/lib/board/BoardLanes.svelte');
	const card = snippet((task: Task) => `<article>${task.title}</article>`);
	const out = html(BoardLanes, { lanes: LANES, card });

	assert.match(out, /<section aria-label="Ready"[^>]*><header[^>]*><h2[^>]*>Ready<\/h2>\s*<span[^>]*>3<\/span><\/header>/);
	// A labelled group gets a heading; cards that stand alone get none.
	assert.match(out, /<div[^>]*><h3[^>]*>Weekly digest<\/h3>\s*<ul[^>]*><li[^>]*><article>One<\/article><\/li><li[^>]*><article>Two<\/article><\/li><\/ul><\/div>\s*<div[^>]*>\s*<ul[^>]*><li[^>]*><article>Three<\/article><\/li><\/ul><\/div>/);
	// An empty lane keeps its heading and count, and nothing else.
	assert.match(out, /<section aria-label="Done"[^>]*><header[^>]*><h2[^>]*>Done<\/h2>\s*<span[^>]*>0<\/span><\/header>\s*<\/section>/);
	assert.ok(out.indexOf('aria-label="Ready"') < out.indexOf('aria-label="Done"'));

	assert.match(html(BoardLanes, { lanes: LANES, card, headingLevel: 4 }), /<h4[^>]*>Ready<\/h4>[\s\S]*<h5[^>]*>Weekly digest<\/h5>/);
});

test('CardFace: the title alone opens the card, with the reference, status and actions around it', async () => {
	const CardFace = await load('/src/lib/board/CardFace.svelte');

	const still = html(CardFace, { title: 'Rotate the key', reference: 'KIT-221', status: 'Waiting for you', tone: 'warning' });
	assert.match(still, /<p[^>]*>KIT-221<\/p>\s*<h3[^>]*>Rotate the key<\/h3>/);
	assert.match(still, /bg-status-warning[^>]*><\/span>Waiting for you/);
	assert.doesNotMatch(still, /data-card-main/);

	const link = html(CardFace, {
		title: 'Rotate the key',
		href: '/cards/221',
		onSelect: () => {},
		headingLevel: 5,
		actions: snippet(() => '<button type="button">Merge</button>')
	});
	assert.match(link, /<h5[^>]*><a href="\/cards\/221" data-card-main[^>]*>Rotate the key<\/a><\/h5>/);
	assert.equal(link.match(/ data-card-main/g)?.length, 1, 'one tab stop for the card, and href wins over onSelect');
	// Actions sit above the stretched title, so they stay separately clickable.
	assert.match(link, /<div class="relative z-10[^"]*"><button type="button">Merge<\/button><\/div>/);

	assert.match(html(CardFace, { title: 'Rotate the key', onSelect: () => {} }), /<h3[^>]*><button type="button" data-card-main[^>]*>Rotate the key<\/button><\/h3>/);
});

test('StatusStrip: the status with its tone, numbers formatted like metrics, then the actions', async () => {
	const StatusStrip = await load('/src/lib/board/StatusStrip.svelte');
	const stats: StatusStat[] = [
		{ id: 'runs', label: 'Runs', value: 7.4, unit: '/h' },
		{ id: 'ttm', label: 'Ready to merged', value: 2280, format: 'duration' },
		{ id: 'pass', label: 'Pass rate', value: 93, format: 'percent' },
		{ id: 'slots', label: 'Slots', value: 4, max: 6 },
		{ id: 'none', label: 'No data yet', value: Number.NaN, format: 'duration' }
	];
	const out = html(StatusStrip, { status: 'Paused', tone: 'warning', stats, actions: snippet(() => '<button type="button">Resume</button>') });

	assert.match(out, /bg-status-warning[^>]*><\/span>Paused/);
	const shown = [...out.matchAll(/<dt[^>]*>([^<]*)<\/dt>\s*<dd[^>]*>([^<]*)<\/dd>/g)].map(([, label, value]) => [label, value]);
	assert.deepEqual(shown, [['Runs', '7.4/h'], ['Ready to merged', '38m'], ['Pass rate', '93%'], ['Slots', '4/6'], ['No data yet', '–']]);
	assert.ok(out.indexOf('</dl>') < out.indexOf('Resume'));

	assert.doesNotMatch(html(StatusStrip, { status: 'Running' }), /<dl|<button/);
});
