import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import type { Component } from 'svelte';
import { ssr } from './ssr.ts';

// The Studio chrome: every new class sits behind a new prop value, and the defaults draw what they drew before.
const { load, html, snippet } = ssr();
let AppShell: Component<Record<string, unknown>>;
let NativeSelect: Component<Record<string, unknown>>;
let Progress: Component<Record<string, unknown>>;
let Message: Component<Record<string, unknown>>;
let MessageScroller: Component<Record<string, unknown>>;
let ChatWorkbench: Component<Record<string, unknown>>;

before(async () => {
	AppShell = await load('/src/lib/primitives/navigation/AppShell.svelte');
	NativeSelect = await load('/src/lib/primitives/form/NativeSelect.svelte');
	Progress = await load('/src/lib/primitives/display/Progress.svelte');
	Message = await load('/src/lib/agents/Message.svelte');
	MessageScroller = await load('/src/lib/agents/MessageScroller.svelte');
	ChatWorkbench = await load('/src/lib/workbench/ChatWorkbench.svelte');
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
	assert.match(count[1], /\btext-\[11px\]/);
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

test('Message plain: no avatar, one muted "Name · time" line over the text; a user message is its bubble alone', () => {
	const reply = html(Message, { role: 'assistant', author: 'Referee', timestamp: '14:02', text: 'Hello', plain: true });
	assert.doesNotMatch(reply, /<svg/);
	assert.match(reply, /<article[^>]*class="group\/message flex w-full justify-start"/);
	assert.match(reply, /<div class="min-w-0 flex-1 space-y-3"><header class="flex items-center gap-2 text-xs text-fg-light"><span>Referee · <span class="tabular-nums">14:02<\/span><\/span>\s*<\/header>/);
	assert.match(reply, /data-slot="message-content" class="space-y-3 text-\[15px\] leading-\[1\.7\] text-fg-main"/);
	const user = html(Message, { role: 'user', author: 'You', timestamp: '14:01', text: 'Hi', plain: true });
	assert.match(user, /<header class="sr-only"><span>You · <span class="tabular-nums">14:01<\/span><\/span>\s*<\/header>/);
	assert.match(user, /<div class="min-w-0 flex max-w-\[88%\] flex-col items-end sm:max-w-\[78%\]">/);
	assert.match(user, /data-slot="message-content" class="[^"]*rounded-bubble bg-chat-user[^"]*leading-\[1\.55\]/);
	// The default keeps its avatar.
	assert.match(html(Message, { role: 'assistant', author: 'Referee', text: 'Hello' }), /<svg/);
});

const ROWS = [
	{ id: 'q', title: 'Questions', subtitle: 'Asked by the agents', pinned: true },
	{ id: 'a', title: 'Alpha', date: '14:02', group: 'Today', mark: 'example', active: true },
	{ id: 'b', title: 'Beta', subtitle: 'Waiting', group: 'Today' }
];
const TALK = [
	{ id: 'm1', role: 'user', text: 'What is blocked?', timestamp: '14:01' },
	{ id: 'm2', role: 'assistant', text: 'Two cards.', timestamp: '14:02' },
	{ id: 'm3', role: 'assistant', status: 'streaming' }
];

test('ChatWorkbench studio: the band keeps only the tabs; rails, title line, log and composer at the Studio measure; no sparkle', () => {
	const out = html(ChatWorkbench, {
		chrome: 'studio',
		title: 'Referee',
		subtitle: 'acme/web',
		status: { text: 'Ready', tone: 'success' },
		conversations: ROWS,
		onNewConversation: () => {},
		headerActions: snippet(() => '<button type="button">Pause</button>'),
		aside: snippet(() => '<p>Needs you</p>'),
		messages: TALK,
		busy: true
	});
	const header = out.slice(out.indexOf('<header'), out.indexOf('</header>'));
	assert.match(header, /^<header class="[^"]*lg:hidden/);
	assert.match(header, /role="tablist"/);
	assert.doesNotMatch(header, /Referee<\/h2>|acme\/web|Pause|bg-chat-accent-subtle/);
	assert.match(out, /<aside aria-label="Conversations" class="hidden min-h-0 w-65 shrink-0 flex-col gap-4\.5 overflow-y-auto bg-canvas-secondary px-3\.5 py-5 lg:flex">/);
	assert.match(out, /<aside aria-label="At a glance" class="hidden min-h-0 w-75 shrink-0 flex-col gap-7 overflow-y-auto bg-canvas-secondary px-4\.5 py-6 lg:flex">/);
	assert.match(
		out,
		/<div class="mx-auto flex w-full max-w-\[45rem\] shrink-0 flex-wrap items-baseline gap-2\.5 px-5 pt-5\.5 pb-1\.5 sm:px-8">\s*<h2 class="max-w-full shrink-0 truncate text-\[15px\] font-medium text-fg-main">Referee<\/h2>\s*<p class="min-w-0 truncate text-\[13px\] text-fg-light">acme\/web<\/p>\s*<p class="ml-auto min-w-0 truncate text-\[13px\] text-fg-light"><span aria-hidden="true" class="mr-2 inline-block size-1\.5 rounded-full align-middle bg-status-success "><\/span>Ready<\/p>\s*<div class="flex min-w-0 items-center gap-1\.5 \*:shrink"><button type="button">Pause<\/button><\/div>\s*<\/div>/
	);
	const log = out.match(/role="log"[^>]*class="([^"]*)"/)![1];
	assert.match(log, /\bmax-w-\[45rem\]/);
	assert.match(log, /\bspace-y-9\b/);
	assert.doesNotMatch(log, /max-w-3xl|space-y-7/);
	// Nothing at the old measure, and the composer at the text's inset.
	assert.doesNotMatch(out, /max-w-3xl/);
	assert.match(out, /max-w-\[41rem\]/);
	assert.match(out, /<div class="relative shrink-0 px-4 pt-2 pb-5\.5 sm:px-8">/);
	assert.doesNotMatch(out, /ak-spark/);
	assert.match(out, /Thinking…/);
	assert.doesNotMatch(out, /bg-chat-accent-subtle/);
	assert.match(out, /<header class="flex items-center gap-2 text-xs text-fg-light"><span>Assistant · <span class="tabular-nums">14:02<\/span><\/span>/);
	// Without a status, the actions take the line's end.
	assert.match(html(ChatWorkbench, { chrome: 'studio', title: 'Referee', headerActions: snippet(() => '<button type="button">Pause</button>') }), /<div class="ml-auto flex min-w-0 items-center gap-1\.5 \*:shrink">/);
	const empty = html(ChatWorkbench, { chrome: 'studio', empty: snippet(() => '<p>Ask</p>') });
	assert.match(empty, /<div class="mx-auto max-w-\[41rem\] pb-3"><p>Ask<\/p><\/div>/);
	assert.equal(empty.match(/<p>Ask<\/p>/g)?.length, 1);
	// Quiet keeps its sparkle.
	assert.match(html(ChatWorkbench, { chrome: 'quiet', messages: TALK, busy: true }), /ak-spark/);
});

test('ChatWorkbench studio rail: 34px rows with a mouse in the sidebar only, muted until on screen, a 6px slot and dot on every row', () => {
	const out = html(ChatWorkbench, { chrome: 'studio', conversations: ROWS, onNewConversation: () => {}, view: 'conversations' });
	const sidebar = out.slice(out.indexOf('<aside'), out.indexOf('</aside>'));
	const panel = out.slice(out.indexOf('role="tabpanel"'), out.indexOf('</nav>', out.indexOf('role="tabpanel"')));
	assert.equal([...sidebar.matchAll(/<button[^>]*pointer-fine:min-h-8\.5/g)].length, 3);
	assert.doesNotMatch(panel, /pointer-fine:min-h-8\.5/);
	// The 40px New row: 14px regular text after a 16px plus.
	assert.match(sidebar, /<button type="button" class="[^"]*\btext-sm leading-\[18px\][^"]*items-center gap-2\.5 text-fg-main hover:bg-card-bg pointer-fine:min-h-10"><svg[^>]*stroke-width="1\.8"[^>]*class="[^"]*size-4 text-fg-light[^"]*"[\s\S]*?<\/svg>New conversation<\/button>/);
	assert.match(sidebar, /<p class="flex h-9 items-end px-2\.5 pb-1\.5 text-xs text-fg-light">Today<\/p>/);
	for (const list of [sidebar, panel]) {
		assert.match(list, /<ul class="space-y-px text-sm">/);
		assert.equal([...list.matchAll(/<span class="flex w-1\.5 shrink-0 items-center justify-center">/g)].length, 3);
		assert.match(list, /role="img" aria-label="example"[^>]*class="size-1\.5 shrink-0 rounded-full"/);
		assert.equal([...list.matchAll(/<span aria-hidden="true" class="size-1\.5 shrink-0 rounded-full bg-fg-light\/20"><\/span>/g)].length, 1);
		assert.match(list, /<svg[^>]*role="img"[^>]*aria-label="Pinned"[\s\S]*?Questions/);
		const active = list.match(/<button[^>]*aria-current="true"[^>]*class="([^"]*)"/)![1];
		assert.match(active, / bg-card-bg text-fg-main$/);
		assert.doesNotMatch(active, /font-medium/);
		const idle = list.match(/<button[^>]*>(?:(?!<\/button>)[\s\S])*?Beta/)![0];
		assert.match(idle, /class="[^"]* text-fg-light hover:bg-card-bg hover:text-fg-main"/);
		assert.match(list, /<span class="w-full truncate pl-4 text-xs[^"]*">Waiting<\/span>/);
	}
	// No row has a mark: no neutral dots.
	assert.doesNotMatch(html(ChatWorkbench, { chrome: 'studio', conversations: ROWS.map((row) => ({ ...row, mark: undefined })) }), /bg-fg-light\/20/);
});

test('ChatWorkbench: newConversationLabel names both New buttons; searchLabel draws a named search field over each list', () => {
	const named = html(ChatWorkbench, { conversations: ROWS, onNewConversation: () => {}, newConversationLabel: 'New chat' });
	assert.equal(named.match(/New chat/g)?.length, 2);
	assert.doesNotMatch(named, /New conversation/);
	const field = /<input type="search"[^>]*aria-label="Search"[^>]*placeholder="Search"[^>]*class="([^"]*)"/g;
	const sidebar = (out: string) => out.slice(out.indexOf('<aside'), out.indexOf('</aside>'));
	for (const chrome of ['full', 'quiet', 'studio']) {
		const out = html(ChatWorkbench, { chrome, conversations: ROWS, onNewConversation: () => {}, searchLabel: 'Search' });
		const fields = [...out.matchAll(field)];
		assert.equal(fields.length, 1, chrome);
		assert.match(sidebar(out), /<\/button>\s*<input type="search"[^>]*>\s*<nav/);
		assert.match(fields[0][1], /\bh-11\b[^"]*\bshrink-0\b[^"]*bg-canvas-border[^"]*pointer-fine:h-\[35px\]/);
		if (chrome === 'quiet') assert.match(sidebar(out), /<input[^>]*class="[^"]* my-1"/);
		const both = html(ChatWorkbench, { chrome, conversations: ROWS, searchLabel: 'Search', view: 'conversations' });
		assert.equal([...both.matchAll(field)].length, 2, chrome);
		assert.match(both, /role="tabpanel"[^>]*>\s*<input type="search"[^>]*class="[^"]* mb-2"[^>]*>\s*<nav/);
	}
	assert.doesNotMatch(html(ChatWorkbench, { conversations: ROWS, view: 'conversations' }), /type="search"/);
	assert.doesNotMatch(html(ChatWorkbench, { conversations: [], searchLabel: 'Search', view: 'conversations' }), /type="search"/);
	assert.doesNotMatch(html(ChatWorkbench, { conversations: ROWS, conversationsNotice: 'Reading…', searchLabel: 'Search', view: 'conversations' }), /type="search"/);
});

test('ChatWorkbench: messageFooter gets the action and chip classes; a status may take the accent', () => {
	const footer = snippet((message: { id: string }, c: { actions: string; action: string; chips: string; chip: string }) => `<div data-id="${message.id}" class="${c.actions}"><button class="${c.action}">Copy</button></div><div class="${c.chips}"><button class="${c.chip}">Next</button></div>`);
	const out = html(ChatWorkbench, { messages: [{ id: 'm2', role: 'assistant', text: 'Hi' }], messageFooter: footer });
	assert.match(out, /<div data-id="m2" class="flex flex-wrap items-center gap-x-4\.5 gap-y-1 text-\[13px\] leading-\[1\.3\] text-fg-light"><button class="inline-flex min-h-11 [^"]*pointer-fine:min-h-0 pointer-fine:py-0\.5">Copy<\/button><\/div><div class="flex flex-wrap gap-2"><button class="inline-flex min-h-11 items-center rounded-full border border-chat-border [^"]*pointer-fine:min-h-\[29px\]">Next<\/button><\/div>/);
	for (const chrome of ['full', 'studio']) assert.match(html(ChatWorkbench, { chrome, title: 'Referee', status: { text: 'Working', tone: 'accent' } }), /bg-accent-primary/);
});

test('MessageScroller merges contentClass, so a passed utility replaces the one the kit sets', () => {
	const content = (contentClass: string) => html(MessageScroller, { navigation: 'none', contentClass, children: snippet(() => '<p>x</p>') }).match(/role="log"[^>]*class="([^"]*)"/)![1].replace(/ svelte-\w+$/, '');
	assert.equal(content('pb-10'), 'mx-auto w-full max-w-3xl space-y-7 px-5 py-6 sm:px-8 pb-10');
	assert.doesNotMatch(content('max-w-none'), /max-w-3xl/);
});

test('MessageScroller leaves scroll anchoring on, so growth above a reader who scrolled up does not move what they read', () => {
	const viewport = html(MessageScroller, { navigation: 'none', children: snippet(() => '<p>x</p>') }).match(/<section[^>]*class="([^"]*)"/)![1];
	assert.match(viewport, /aks-scrollport/);
	assert.doesNotMatch(viewport, /overflow-anchor/);
});
