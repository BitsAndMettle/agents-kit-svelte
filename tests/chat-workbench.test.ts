import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import type { Component } from 'svelte';
import type { ChatWorkbenchMessage } from '../src/lib/types.ts';
import { ssr } from './ssr.ts';

const { load, html, snippet } = ssr();
let ChatWorkbench: Component<Record<string, unknown>>;
let Markdown: Component<Record<string, unknown>>;
let PromptInput: Component<Record<string, unknown>>;

before(async () => {
	ChatWorkbench = await load('/src/lib/workbench/ChatWorkbench.svelte');
	Markdown = await load('/src/lib/agents/Markdown.svelte');
	PromptInput = await load('/src/lib/agents/PromptInput.svelte');
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

test('demo plays the scripted session; data mode has no main landmark and an h2 title by default', () => {
	assert.match(html(ChatWorkbench, { demo: true }), /Restart demo/);
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

test('message status, empty state, footer and header action snippets', () => {
	const out = html(ChatWorkbench, {
		messages: [
			{ id: 's', role: 'assistant', status: 'streaming' },
			{ id: 'e', role: 'system', status: 'error', statusText: 'Not delivered, send again.' }
		],
		messageFooter: snippet((message: ChatWorkbenchMessage) => `<span>footer:${message.id}</span>`),
		headerActions: snippet(() => '<button type="button">Pause</button>')
	});
	assert.match(out, /Thinking…/);
	assert.match(out, /aria-busy="true"/);
	assert.match(out, /text-status-danger[^>]*>Not delivered, send again\./);
	assert.match(out, /footer:s[\s\S]*footer:e/);
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
