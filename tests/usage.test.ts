import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import type { Component } from 'svelte';
import { projectBurn } from '../src/lib/charts/scale.ts';
import { SAMPLE_ACCOUNT_USAGE } from '../src/lib/fixtures/chat.ts';
import type { AccountUsage } from '../src/lib/types.ts';
import { ssr } from './ssr.ts';

type UsageModule = typeof import('../src/lib/state/usage.ts');

const { load, module, html, snippet } = ssr();
let usage: UsageModule;
let UsagePill: Component<Record<string, unknown>>;
let UsageRows: Component<Record<string, unknown>>;
let ToolResult: Component<Record<string, unknown>>;
let TokenBurnChart: Component<Record<string, unknown>>;

before(async () => {
	usage = await module<UsageModule>('/src/lib/state/usage.ts');
	UsagePill = await load('/src/lib/runtime/UsagePill.svelte');
	UsageRows = await load('/src/lib/runtime/UsageRows.svelte');
	ToolResult = await load('/src/lib/agents/ToolResult.svelte');
	TokenBurnChart = await load('/src/lib/charts/TokenBurnChart.svelte');
});

const [personal, work, spare] = SAMPLE_ACCOUNT_USAGE;
const at = Date.UTC(2026, 10, 17, 14, 6);

test('each status takes a kit tone and its own words', () => {
	assert.deepEqual(usage.USAGE_TONE, { available: 'success', low: 'warning', switched: 'info', out: 'neutral', off: 'neutral' });
	assert.equal(usage.usageText(personal), '34% left · Sat 20:00');
	assert.equal(usage.usageText(work), 'Out until Tue 18:20');
	assert.equal(usage.usageText(spare), 'Past the 98% switch point');
	assert.equal(usage.usageText({ ...spare, switchAt: undefined }), 'Past the switch point');
	assert.equal(usage.usageText({ ...personal, status: 'off' }), 'Off');
	const low: AccountUsage = { label: 'L', agent: 'Claude Code', status: 'low', windows: { fiveHour: { used: 91, resetsAt: Date.UTC(2026, 10, 17, 17) }, week: { used: 40, resetsAt: Date.UTC(2026, 10, 21, 20) } } };
	assert.equal(usage.usageText(low), '9% left · Tue 17:00', 'the window nearest its limit decides');
	assert.equal(usage.usageText(low, 'Europe/Berlin'), '9% left · Tue 18:00');
	assert.equal(usage.usageText({ ...low, windows: {} }), 'Not read yet');
	for (const account of SAMPLE_ACCOUNT_USAGE) assert.doesNotMatch(usage.usageText(account), /no new runs/i);
});

test('only out and off accounts are not free', () => {
	assert.deepEqual(SAMPLE_ACCOUNT_USAGE.map(usage.usageFree), [true, false, true]);
});

test('usageBurn projects one reading at its average rate since the window began', () => {
	const burn = usage.usageBurn(personal, 'week')!;
	assert.equal(burn.end, 168);
	assert.equal(burn.budget, 98);
	assert.equal(burn.points.length, 2);
	assert.deepEqual(burn.points[0], { t: 0, spent: 0 });
	assert.equal(burn.points[1].spent, 66);
	assert.ok(Math.abs(burn.points[1].t - 66.1) < 1e-9, 'the reading sits 66 h 06 min into the week');
	const { rate, crossesAt } = projectBurn(burn.points, burn.end, burn.budget);
	assert.ok(Math.abs(rate - 66 / 66.1) < 1e-9);
	assert.equal(burn.formatTime(crossesAt!), 'Wed 22:08');
	assert.equal(burn.formatValue(97.6), '98%');
	assert.equal(burn.rateLabel, '%/day');
	assert.equal(usage.usageBurn(personal, 'fiveHour')!.rateLabel, '%/h');
});

test('usageBurn draws nothing without a reading, and a reading past the switch point crosses at once', () => {
	assert.equal(usage.usageBurn({ ...personal, at: undefined }, 'week'), undefined);
	assert.equal(usage.usageBurn(spare, 'fiveHour'), undefined);
	const early = usage.usageBurn({ ...personal, at: Date.UTC(2026, 10, 1) }, 'week')!;
	assert.equal(early.points[1].t, 0, 'a reading from before the window began sits at its start');
	assert.equal(projectBurn(early.points, early.end, early.budget).crossesAt, null);
	const past = usage.usageBurn({ ...spare, at }, 'week')!;
	assert.equal(projectBurn(past.points, past.end, past.budget).crossesAt, past.points[1].t);
});

test('UsagePill counts free accounts and opens on a row per account', () => {
	const closed = html(UsagePill, { accounts: SAMPLE_ACCOUNT_USAGE });
	assert.match(closed, /aria-expanded="false"/);
	assert.match(closed, /Claude Code · 2 of 3 free/);
	assert.doesNotMatch(closed, /role="progressbar"/);
	const open = html(UsagePill, { accounts: SAMPLE_ACCOUNT_USAGE, open: true, children: snippet(() => '<a href="/settings">Open Subscriptions</a>') });
	const controls = open.match(/aria-controls="([^"]+)"/)![1];
	assert.match(open, new RegExp(`id="${controls}"`));
	assert.equal(open.match(/role="progressbar"/g)?.length, 3);
	assert.match(open, /Personal[\s\S]*Work[\s\S]*Spare[\s\S]*Open Subscriptions/);
	assert.match(html(UsagePill, { accounts: [work] }), /0 of 1 free/);
});

test('UsageRows: a named track and a status badge per account, as the body of a usage.read step', () => {
	const rows = html(UsageRows, { accounts: SAMPLE_ACCOUNT_USAGE, timeZone: 'Europe/Berlin' });
	assert.match(rows, /aria-label="Personal usage"[^>]*aria-valuenow="66"/);
	assert.match(rows, /aria-label="Work usage"[^>]*aria-valuenow="100"/);
	assert.match(rows, /Out until Tue 19:20/);
	assert.match(rows, /bg-status-info-subtle[^"]*"[^>]*>\s*Past the 98% switch point/);
	const card = html(ToolResult, { tool: 'usage.read', summary: 'claude-code', meta: 'checked 12m ago', children: snippet(() => '<ul>rows</ul>') });
	assert.match(card, /usage\.read[\s\S]*checked 12m ago[\s\S]*<ul>rows<\/ul>/);
	assert.doesNotMatch(card, /<button|aria-expanded|Copy output/);
});

test('TokenBurnChart names the switch point and speaks percent for a usage window, tokens by default', () => {
	const chart = html(TokenBurnChart, { title: 'Personal · this week', ...usage.usageBurn(personal, 'week') });
	assert.match(chart, />of 98% <\/span>/);
	assert.match(chart, /Projected at end<\/dt>\s*<dd[^>]*>168%</, 'the average rate carried on to the reset');
	assert.match(chart, />Switch point</);
	assert.doesNotMatch(chart, /Budget|tokens/);
	const tokens = html(TokenBurnChart, { points: [{ t: 0, spent: 0 }, { t: 60, spent: 1200 }], budget: 5000 });
	assert.match(tokens, /of 5k tokens/);
	assert.match(tokens, />Budget</);
});
