import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, test } from 'node:test';
import type { Component } from 'svelte';
import type { ChatWorkbenchMessage } from '../src/lib/types.ts';
import { ssr } from './ssr.ts';

const { load, html, snippet } = ssr();
let ChatWorkbench: Component<Record<string, unknown>>;
let Markdown: Component<Record<string, unknown>>;
let PromptInput: Component<Record<string, unknown>>;
let ToolResult: Component<Record<string, unknown>>;
let ApprovalCard: Component<Record<string, unknown>>;
let TodoList: Component<Record<string, unknown>>;

before(async () => {
	ChatWorkbench = await load('/src/lib/workbench/ChatWorkbench.svelte');
	Markdown = await load('/src/lib/agents/Markdown.svelte');
	PromptInput = await load('/src/lib/agents/PromptInput.svelte');
	ToolResult = await load('/src/lib/agents/ToolResult.svelte');
	ApprovalCard = await load('/src/lib/agents/ApprovalCard.svelte');
	TodoList = await load('/src/lib/agents/TodoList.svelte');
});

const MESSAGES: ChatWorkbenchMessage[] = [
	{ id: 'm1', role: 'user', text: 'What is blocked?' },
	{
		id: 'm2',
		role: 'assistant',
		parts: [
			{ type: 'tool', tool: 'list_cards', summary: 'Done', status: 'success' },
			{ type: 'note', text: 'About #212' }
		],
		text: 'Two cards:\n\n- **#212**\n- see [Board](https://example.com/board)'
	}
];

test('with messages, the app data renders and the demo does not', () => {
	const out = html(ChatWorkbench, { title: 'Referee', subtitle: 'devbox', status: { text: 'Online', tone: 'success' }, messages: MESSAGES, assistantName: 'Referee' });
	assert.match(out, /What is blocked\?/);
	assert.match(out, /<strong[^>]*>#212<\/strong>/);
	assert.match(out, /<a [^>]*href="https:\/\/example\.com\/board"[^>]*rel="noopener noreferrer nofollow"/);
	assert.match(out, /list_cards/);
	assert.match(out, /About #212/);
	assert.match(out, />Referee<\/span>/);
	assert.match(out, /devbox/);
	assert.match(out, /bg-status-success/);
	assert.doesNotMatch(out, /Restart demo/);
	assert.doesNotMatch(out, /Fix OAuth callback redirect loop/);
});

test('demo plays the scripted session and loads on demand; data mode has no main landmark and an h2 title by default', async () => {
	assert.match(html(await load('/src/lib/workbench/ChatWorkbenchDemo.svelte')), /Restart demo/);
	// A static import would put the demo in every app's chat chunk.
	const source = await readFile(new URL('../src/lib/workbench/ChatWorkbench.svelte', import.meta.url), 'utf8');
	assert.doesNotMatch(source, /^\s*import\s+\w+\s+from\s+'\.\/ChatWorkbenchDemo\.svelte'/m);
	assert.doesNotMatch(html(ChatWorkbench, { demo: true }), /<section/);
	const out = html(ChatWorkbench, { title: 'Referee' });
	assert.doesNotMatch(out, /<main/);
	assert.match(out, /<h2[^>]*>Referee<\/h2>/);
	assert.match(html(ChatWorkbench, { title: 'Referee', headingLevel: 1 }), /<h1[^>]*>Referee<\/h1>/);
});

test('conversations: a sidebar from 1024px and tabs below, or tabs only in panel layout', () => {
	const conversations = [
		{ id: 'c1', title: 'First', date: 'Nov 12', subtitle: 'devbox', active: true },
		{ id: 'c2', title: 'Second' }
	];
	const auto = html(ChatWorkbench, { conversations, onNewConversation: () => {} });
	assert.match(auto, /<aside[^>]*aria-label="Conversations"[^>]*lg:flex/);
	assert.match(auto, /role="tablist"/);
	assert.match(auto, /lg:hidden/);
	assert.match(auto, /aria-current="true"[^>]*>[\s\S]*?First[\s\S]*?Nov 12 · devbox/);
	assert.match(auto, /New conversation/);

	const panel = html(ChatWorkbench, { conversations, layout: 'panel' });
	assert.doesNotMatch(panel, /<aside/);
	assert.match(panel, /role="tablist"/);
	assert.doesNotMatch(panel, /New conversation/);

	const none = html(ChatWorkbench, {});
	assert.doesNotMatch(none, /<aside|role="tablist"/);
});

test('message status, empty state, footer, trailing and header action snippets', () => {
	const out = html(ChatWorkbench, {
		messages: [
			{ id: 's', role: 'assistant', status: 'streaming' },
			{ id: 'e', role: 'system', status: 'error', statusText: 'Not delivered, send again.' }
		],
		busy: true,
		busyLabel: 'Working on it',
		messageFooter: snippet((message: ChatWorkbenchMessage) => `<span>footer:${message.id}</span>`),
		trailing: snippet(() => '<button type="button">Approve the plan</button>'),
		headerActions: snippet(() => '<button type="button">Pause</button>')
	});
	assert.match(out, /Thinking…/);
	assert.match(out, /aria-busy="true"/);
	assert.match(out, /text-status-danger[^>]*>Not delivered, send again\./);
	// What waits for the person sits after the last message, before the busy line and the composer.
	assert.match(out, /footer:s[\s\S]*footer:e[\s\S]*Approve the plan[\s\S]*Working on it[\s\S]*<textarea/);
	assert.match(out, /Pause/);
	const empty = html(ChatWorkbench, { empty: snippet(() => '<p>Ask me anything</p>') });
	assert.match(empty, /Ask me anything/);
});

test('composer: model and effort picker, attachments and disabled state', () => {
	const out = html(ChatWorkbench, {
		models: [{ id: 'sonnet', label: 'Sonnet' }],
		model: 'sonnet',
		efforts: [{ id: 'high', label: 'High' }],
		effort: 'high',
		attachments: [{ id: 'card', label: '#212 · example' }],
		disabled: true,
		placeholder: 'Message the Referee'
	});
	assert.match(out, /aria-label="Model: Sonnet · High"/);
	assert.match(out, /aria-label="Remove #212 · example"/);
	assert.match(out, /<textarea[^>]*disabled/);
	assert.doesNotMatch(out, /Add context or skill/);
});

test('PromptInput: options without a version show no v prefix; no demo chips or menu by default', () => {
	const out = html(PromptInput, { agents: [{ id: 'opus', label: 'Opus' }], selectedAgentId: 'opus' });
	assert.doesNotMatch(out, /Signed in|>v/);
	assert.doesNotMatch(out, /trailside\/1210|Backend v2|Add context or skill/);
	assert.match(out, /aria-label="Run with: Opus"/);
	const none = html(PromptInput, {});
	assert.doesNotMatch(none, /aria-haspopup="listbox"/);
	// 16px unless the screen is wide and the pointer fine, so iOS does not zoom on focus.
	assert.match(none, /<textarea[^>]*class="[^"]*text-base[^"]*sm:pointer-fine:text-\[15px\]/);
	// 44px send button on phones.
	assert.match(none, /<button[^>]*aria-label="Send prompt"[^>]*max-sm:size-11/);
});

test('Markdown renders hostile text as text', () => {
	const out = html(Markdown, {
		text: '<img src=x onerror=alert(1)>\n\n[x](javascript:alert(1)) [y](data:text/html,hi)\n\n```\nplain\n```'
	});
	assert.doesNotMatch(out, /<img|<a /);
	assert.match(out, /&lt;img src=x onerror=alert\(1\)>/);
	assert.match(out, /\[x\]\(javascript:alert\(1\)\)/);
	assert.match(out, />text<\/span>/);
});

test('aside: a right rail from 1024px without border lines, and none in panel layout', () => {
	const aside = snippet(() => '<p>2 need you</p>');
	const out = html(ChatWorkbench, { aside, asideLabel: 'Needs you', conversations: [] });
	assert.match(out, /<aside aria-label="Needs you" class="hidden [^"]*lg:flex"><p>2 need you<\/p><\/aside>/);
	assert.doesNotMatch(out, /border-[rb] /);
	assert.doesNotMatch(html(ChatWorkbench, { aside, layout: 'panel' }), /<aside/);
	assert.doesNotMatch(html(ChatWorkbench, {}), /<aside/);
});

test('ChatWorkbench hands contextOptions and commands to its composer', () => {
	const out = html(ChatWorkbench, {
		contextOptions: [{ label: 'Card 218', attachment: { id: 'card-218', label: 'Card 218' } }],
		commands: [{ name: 'status', text: 'What is happening right now?' }],
		value: '/'
	});
	assert.match(out, /aria-label="Add context or skill"/);
	assert.match(out, /role="listbox" aria-label="Commands"[\s\S]*\/status[\s\S]*What is happening right now\?/);
});

test('PromptInput: the / menu opens while the text starts with /, filtered by the name', () => {
	const commands = [
		{ name: 'plan', text: 'Plan the next Feature with me.' },
		{ name: 'status', text: 'What is happening right now?' },
		{ name: 'stop', text: 'Stop what you are doing.' }
	];
	const options = (value: string) => [...html(PromptInput, { commands, value }).matchAll(/role="option"[^>]*>[\s\S]*?\/(\w+)</g)].map((m) => m[1]);
	assert.deepEqual(options('/'), ['plan', 'status', 'stop']);
	assert.deepEqual(options('/St'), ['status', 'stop']);
	assert.deepEqual(options('/x'), []);
	assert.deepEqual(options('status'), []);
	const out = html(PromptInput, { commands, value: '/s' });
	// The text field keeps focus and names the option the keys move through.
	assert.match(out, /<textarea[^>]*aria-autocomplete="list"[^>]*aria-controls="([^"]+)"[^>]*aria-activedescendant="([^"]+)"/);
	assert.match(out, /aria-selected="true"[^>]*>[\s\S]*?\/status/);
	assert.doesNotMatch(html(PromptInput, {}), /aria-autocomplete|role="listbox"/);
});

test('ToolResult without output is one line: no chevron, Copy or terminal box', () => {
	const bare = html(ToolResult, { tool: 'plan.file', summary: 'Card 218', meta: '14:02' });
	assert.match(bare, /plan\.file[\s\S]*Card 218[\s\S]*14:02/);
	assert.doesNotMatch(bare, /<button|aria-expanded|Copy output|bg-terminal-bg/);
	const full = html(ToolResult, { tool: 'Bash', output: 'ok' });
	assert.match(full, /aria-expanded="true"/);
	assert.match(full, /Copy output/);
	assert.match(full, /bg-terminal-bg[\s\S]*>ok</);
});

test('ApprovalCard shows a decision only when it is given one, and waits while pending', () => {
	const questions = [{ id: 'q', question: 'Where to?', options: [{ id: 'a', label: 'Home' }, { id: 'b', label: 'Sign-in' }] }];
	const open = html(ApprovalCard, { title: 'Policy', questions });
	assert.match(open, /Where to\?/);
	assert.doesNotMatch(open, /Decision recorded/);
	const waiting = html(ApprovalCard, { title: 'Policy', questions, pending: true });
	assert.match(waiting, /aria-busy="true"[^>]*>\s*Submit decision/);
	const decided = html(ApprovalCard, { title: 'Policy', questions, decided: { q: ['Sign-in'] } });
	assert.match(decided, /Decision recorded: Sign-in/);
	assert.doesNotMatch(decided, /role="radio"/);
});

test('TodoList editable: each row moves and is removed, a detail opens on a press, rows are added, one button hands them back', () => {
	const items = [
		{ id: 'a', label: 'Keep the return path', detail: 'Read next.', status: 'pending' },
		{ id: 'b', label: 'Test the redirects', status: 'pending' }
	];
	const out = html(TodoList, { items, editable: true, submitLabel: 'File plan', onSubmit: () => {} });
	assert.match(out, /aria-label="Move Keep the return path up" aria-disabled="true"/);
	assert.match(out, /aria-label="Move Test the redirects down" aria-disabled="true"/);
	assert.match(out, /aria-label="Remove Test the redirects"/);
	assert.match(out, /<details[^>]*><summary[^>]*>\s*<span[^>]*>Keep the return path<\/span>[\s\S]*?<\/summary>\s*<p[^>]*>Read next\.<\/p>/);
	const done = html(TodoList, { items: [{ ...items[0], status: 'completed' }], editable: true });
	assert.match(done, /<summary[^>]*>\s*<span class="[^"]*line-through[^"]*">Keep the return path</);
	assert.match(out, /<input[^>]*aria-label="Add a step"/);
	assert.match(out, />File plan<\/button>/);
	assert.doesNotMatch(html(TodoList, { items, editable: true }), /File plan|Done<\/button>/);
	const still = html(TodoList, { items });
	assert.doesNotMatch(still, /Move |Remove |Add a step|<details/);
	assert.match(still, />Read next\.<\/span>/);
});
