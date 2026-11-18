import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { BoardLane, CardFact, CardQuestion, StatusStat } from '../src/lib/board/types.ts';
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
	assert.match(still, /<p[^>]*>KIT-221<\/p>\s*<h4[^>]*>Rotate the key<\/h4>/);
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

	assert.match(html(CardFace, { title: 'Rotate the key', onSelect: () => {} }), /<h4[^>]*><button type="button" data-card-main[^>]*>Rotate the key<\/button><\/h4>/);
});

test('CardSheet: a sheet named by the card, with its reference and status, its facts as a list and the actions at the foot', async () => {
	const CardSheet = await load('/src/lib/board/CardSheet.svelte');
	const facts: CardFact[] = [
		{ label: 'Pull request', value: '#57', href: 'https://example.com/pull/57' },
		{ label: 'Checks', value: 'Passed', tone: 'success' },
		{ label: 'Head', value: '9f2c1ab' }
	];
	const out = html(CardSheet, {
		title: 'Rotate the key',
		reference: 'KIT-221',
		status: 'Waiting for you',
		tone: 'warning',
		facts,
		children: snippet(() => '<p>More about the card</p>'),
		actions: snippet(() => '<button type="button">Merge</button>'),
		'data-card': '221',
		class: 'w-[min(32rem,100vw)]'
	});

	// It is a Sheet: your attributes and class reach the dialog, and the card's title is its heading.
	assert.match(out, /^\s*<dialog data-card="221"[^>]*class="(?![^"]*24rem)[^"]* w-\[min\(32rem,100vw\)\]">/);
	assert.match(out, /<h2[^>]*>Rotate the key<\/h2>\s*<p[^>]*><span[^>]*>KIT-221<\/span>\s*<span[^>]*><span aria-hidden="true"[^>]*bg-status-warning[^>]*><\/span>\s*Waiting for you<\/span><\/p>/);
	// A fact is its label and its value: a link with `href`, and marked with its tone.
	assert.deepEqual([...out.matchAll(/<dt[^>]*>([^<]*)<\/dt>/g)].map(([, label]) => label), ['Pull request', 'Checks', 'Head']);
	assert.match(out, /<dt[^>]*>Pull request<\/dt>\s*<dd[^>]*><a href="https:\/\/example\.com\/pull\/57"[^>]*>#57<\/a><\/dd>/);
	assert.match(out, /<dt[^>]*>Checks<\/dt>\s*<dd[^>]*><span[^>]*><span aria-hidden="true"[^>]*bg-status-success[^>]*><\/span>\s*Passed<\/span><\/dd>/);
	assert.match(out, /<dt[^>]*>Head<\/dt>\s*<dd[^>]*>9f2c1ab<\/dd>/);
	// What the sheet says can take focus, so focus need not start on a control.
	assert.match(out, /<div tabindex="-1" class="[^"]*"><dl/);
	// Your content follows the facts, and the actions are the sheet's foot.
	assert.ok(out.indexOf('</dl>') < out.indexOf('<p>More about the card</p>'));
	assert.match(out, /<p>More about the card<\/p>[\s\S]*<div class="[^"]*border-t[^"]*"><button type="button">Merge<\/button><\/div>/);

	// A card with a title alone has no list, no question and no foot.
	assert.doesNotMatch(html(CardSheet, { title: 'Rotate the key' }), /<dl|<ul|<li|border-t|aria-busy/);
});

test('CardSheet: a question keeps its line breaks and offers each option as a button, busy only while an answer is on its way', async () => {
	const CardSheet = await load('/src/lib/board/CardSheet.svelte');
	// Options are data: two that read the same are still two buttons.
	const question: CardQuestion = { text: 'Which key?\nThe plan names two.', options: ['The signing key', 'Both', 'Both'] };
	const out = html(CardSheet, { title: 'Rotate the key', question, onAnswer: () => {} });

	assert.match(out, /aria-busy="false"[^>]*>[\s\S]*<p[^>]*>Question<\/p>[\s\S]*<p class="[^"]*whitespace-pre-line[^"]*">Which key\?\nThe plan names two\.<\/p>\s*<ul/);
	assert.deepEqual([...out.matchAll(/<li><button type="button"[^>]*><span[^>]*>\s*([^<]*?)\s*<\/span>/g)].map(([, option]) => option), ['The signing key', 'Both', 'Both']);

	// Its name is yours to give, and with nobody to tell, the options cannot be pressed.
	const looking = html(CardSheet, { title: 'Rotate the key', question, questionLabel: 'Open question' });
	assert.match(looking, /<p[^>]*>Open question<\/p>/);
	assert.equal(looking.match(/<li><button disabled=""/g)?.length, 3);
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

test('CardSheet: the question block is the accent unless the sheet is given a tone for it', async () => {
	const CardSheet = await load('/src/lib/board/CardSheet.svelte');
	const question: CardQuestion = { text: 'Which key?', options: ['The signing key'] };
	/** The classes of the question's block: the element marked busy while an answer is on its way. */
	const block = (props: Record<string, unknown>) => /<div(?=[^>]*aria-busy=)[^>]*class="([^"]*)"/.exec(html(CardSheet, { title: 'Rotate the key', question, ...props }))?.[1] ?? '';

	assert.match(block({}), /bg-accent-subtle/);
	assert.match(block({ questionTone: 'neutral' }), /border-card-border bg-canvas-secondary/);
	assert.doesNotMatch(block({ questionTone: 'neutral' }), /accent/);
});
