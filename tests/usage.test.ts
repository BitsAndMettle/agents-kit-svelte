import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import type { Component } from 'svelte';
import { projectBurn, projectionEnd } from '../src/lib/charts/scale.ts';
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

test('an out account names when it is back: its own until, else the latest reset among windows at their limit', () => {
	const fiveHour = { used: 100, resetsAt: Date.UTC(2026, 10, 17, 18, 20) };
	const week = { used: 100, resetsAt: Date.UTC(2026, 10, 20, 9) };
	const out: AccountUsage = { label: 'O', agent: 'Claude Code', status: 'out', windows: { fiveHour, week } };
	assert.equal(usage.usageText(out), 'Out until Fri 09:00', 'both full: the week resets last');
	const weekFirst = { ...out, windows: { fiveHour: { used: 100, resetsAt: Date.UTC(2026, 10, 17, 18, 20) }, week: { used: 100, resetsAt: Date.UTC(2026, 10, 17, 16) } } };
	assert.equal(usage.usageText(weekFirst), 'Out until Tue 18:20', 'both full: the five-hour window resets last');
	assert.equal(usage.usageText({ ...out, until: Date.UTC(2026, 10, 17, 14, 36) }), 'Out until Tue 14:36', 'a refusal that names its end');
	assert.equal(usage.usageText({ ...out, windows: {}, until: Date.UTC(2026, 10, 17, 14, 36) }), 'Out until Tue 14:36', 'a refused account with no reading');
	assert.equal(usage.usageText({ ...out, windows: {} }), 'Out');
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

test('a usage projection ends on the switch point it meets, runs to the reset under it, and never passes 100%', () => {
	const week = usage.usageBurn(personal, 'week')!;
	const meets = projectionEnd(week.points, week.end, week.budget, week.limit);
	assert.equal(meets.spent, 98);
	assert.equal(week.formatTime(meets.t), 'Wed 22:08');
	const five = usage.usageBurn(personal, 'fiveHour')!;
	const under = projectionEnd(five.points, five.end, five.budget, five.limit);
	assert.equal(under.t, 5, 'to the reset');
	assert.ok(under.spent < 98);
	assert.deepEqual(projectionEnd([{ t: 0, spent: 0 }, { t: 1, spent: 50 }], 5, undefined, 100), { t: 2, spent: 100 }, 'no switch point: stops at the limit');
	const past = usage.usageBurn({ ...spare, at }, 'week')!;
	assert.deepEqual(projectionEnd(past.points, past.end, past.budget, past.limit), past.points[1], 'already there: no projection');
	const tokens = [{ t: 0, spent: 0 }, { t: 60, spent: 3000 }];
	assert.deepEqual(projectionEnd(tokens, 200, 5000), { t: 200, spent: projectBurn(tokens, 200, 5000).projected }, 'tokens run to the end');
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
	assert.match(rows, /aria-label="Personal usage"[^>]*aria-valuetext="66%"/, 'the track speaks the used percent, the badge the words');
	const card = html(ToolResult, { tool: 'usage.read', summary: 'claude-code', meta: 'checked 12m ago', children: snippet(() => '<ul>rows</ul>') });
	assert.match(card, /usage\.read[\s\S]*checked 12m ago[\s\S]*<ul>rows<\/ul>/);
	assert.doesNotMatch(card, /<button|aria-expanded|Copy output/);
});

test('TokenBurnChart names the switch point and speaks percent for a usage window, tokens by default', () => {
	const chart = html(TokenBurnChart, { title: 'Personal · this week', ...usage.usageBurn(personal, 'week') });
	assert.match(chart, />of 98%<\/span>/);
	assert.match(chart, /Switch point<\/dt>\s*<dd[^>]*text-status-info[^>]*>\s*Reached Wed 22:08/, 'a switch point is reached, not run out');
	assert.doesNotMatch(chart, /Projected at end/, 'the line stops at the switch point, so nothing reads past it');
	assert.doesNotMatch(chart, /Budget|tokens|Runs out|status-danger/);
	assert.match(chart, />Mon 20:00</, 'weekly ticks fall on days');
	const clear = html(TokenBurnChart, usage.usageBurn(personal, 'fiveHour'));
	assert.match(clear, /Projected at end<\/dt>\s*<dd[^>]*>81%</, 'under the switch point it runs to the reset');
	assert.match(clear, /Switch point<\/dt>\s*<dd[^>]*>\s*Not reached/, 'no second percent beside the used one');
	assert.doesNotMatch(clear, /% used/);
	assert.match(clear, /aria-label="Five-hour usage\./);
	const passed = html(TokenBurnChart, usage.usageBurn({ ...spare, at }, 'week'));
	assert.match(passed, /Switch point<\/dt>\s*<dd[^>]*>\s*Passed\s*</);
	const tokens = html(TokenBurnChart, { points: [{ t: 0, spent: 0 }, { t: 60, spent: 1200 }], budget: 5000 });
	assert.match(tokens, /of 5k tokens/);
	assert.match(tokens, />Budget</);
	assert.match(tokens, /[0-9]+% used/);
	assert.match(tokens, /aria-label="Token burn\./);
	const running = html(TokenBurnChart, { points: [{ t: 0, spent: 0 }, { t: 60, spent: 3000 }], budget: 5000, end: 200 });
	assert.match(running, /Budget<\/dt>\s*<dd[^>]*text-status-danger[^>]*>\s*Runs out at 1:40/);
	assert.match(running, /Projected at end<\/dt>\s*<dd[^>]*>10k</, 'a token projection still runs past its budget to the end');
});

const reading = Date.UTC(2026, 10, 17, 14, 6);
const fiveHour = (used: number) => ({ used, resetsAt: Date.UTC(2026, 10, 17, 16, 40) });
const week = (used: number) => ({ used, resetsAt: Date.UTC(2026, 10, 19, 20) });

test('usageWindowText: what is left and when it resets, a week naming its day; a full window says when; none running has it all', () => {
	const read: AccountUsage = { label: 'A', agent: 'Claude Code', at: reading, switchAt: 98, status: 'available', windows: { fiveHour: fiveHour(34), week: week(61) } };
	assert.equal(usage.usageWindowText(read, 'fiveHour'), '66% left · 16:40');
	assert.equal(usage.usageWindowText(read, 'week'), '39% left · Thu 20:00');
	assert.equal(usage.usageWindowText(read, 'fiveHour', 'Europe/Berlin'), '66% left · 17:40');
	assert.equal(usage.usageWindowText({ ...read, windows: { fiveHour: { used: 100, resetsAt: Date.UTC(2026, 10, 17, 18, 20) } } }, 'fiveHour'), 'Resets 18:20');
	assert.equal(usage.usageWindowText({ ...read, windows: { week: week(100) } }, 'week'), 'Resets Thu 20:00');
	assert.equal(usage.usageWindowText({ ...read, windows: {} }, 'fiveHour'), '100% left');
	assert.equal(usage.usageWindowText({ ...read, at: undefined }, 'week'), undefined, 'never read');
});

test('UsageTable: one row per account, counted from 1, a named track per window and the status in its own column', async () => {
	const UsageTable = await load('/src/lib/runtime/UsageTable.svelte');
	const account = (label: string, rest: Partial<AccountUsage>): AccountUsage => ({ label, agent: 'Claude Code', at: reading, switchAt: 98, status: 'available', windows: {}, ...rest });
	const accounts: AccountUsage[] = [
		account('Personal', { windows: { fiveHour: fiveHour(34), week: week(66) } }),
		account('Work', { status: 'out', windows: { fiveHour: { used: 100, resetsAt: Date.UTC(2026, 10, 17, 18, 20) }, week: week(72) } }),
		account('Spare', { status: 'switched', windows: { week: week(98) } }),
		account('New', { at: undefined }),
		account('Old', { status: 'off', windows: { fiveHour: fiveHour(10), week: week(20) } }),
		account('Refused', { status: 'out', at: undefined, until: Date.UTC(2026, 10, 17, 14, 36) }),
		account('Low', { status: 'low', windows: { fiveHour: { used: 91, resetsAt: Date.UTC(2026, 10, 17, 17) }, week: week(40) } })
	];
	const out = html(UsageTable, { 'aria-label': 'Claude Code accounts on the build box', accounts, id: 'usage', class: 'mt-2' });
	const rows = out.split('<tbody')[1].split('<tr').slice(1);
	const row = (label: string) => rows.find((markup) => markup.includes(`<th scope="row">${label}</th>`))!;
	const attr = (tag: string, name: string) => tag.match(new RegExp(` ${name}="([^"]*)"`))?.[1];
	const tracks = (markup: string) => [...markup.matchAll(/<div[^>]*role="progressbar"[^>]*>/g)].map(([tag]) => [attr(tag, 'aria-label'), Number(attr(tag, 'aria-valuenow')), attr(tag, 'aria-valuetext')]);

	assert.match(out, /^<div id="usage" class="[^"]* mt-2"><table aria-label="Claude Code accounts on the build box"/, 'the rest and your class reach the table');
	assert.deepEqual([...out.matchAll(/<th scope="col"[^>]*>\s*([^<]*?)\s*<\/th>/g)].map(([, label]) => label), ['#', 'Account', '5-hour window', 'Week', 'Status']);
	assert.deepEqual(rows.map((markup) => markup.match(/<td[^>]*>(\d+)<\/td>/)![1]), ['1', '2', '3', '4', '5', '6', '7'], 'counted from 1 in the given order');

	// Read, both windows running: two named tracks and their captions, and Available on the success tint.
	assert.deepEqual(tracks(row('Personal')), [['Personal 5-hour window', 34, '66% left · 16:40'], ['Personal Week', 66, '34% left · Thu 20:00']]);
	assert.match(row('Personal'), /aria-hidden="true"[^>]*>66% left · 16:40<\/span>[\s\S]*aria-hidden="true"[^>]*>34% left · Thu 20:00<\/span>/);
	assert.match(row('Personal'), /bg-status-success-subtle[^"]*"[^>]*>\s*Available/);
	assert.equal(row('Personal').match(/rounded-full[^"]*bg-fg-light/g)?.length, 2, 'both fills neutral under the switch point');
	assert.match(row('Personal'), /class="[^"]*px-2\.5[^"]*"[^>]*>\s*Available/, 'the status is a large badge');

	// A full window: a full neutral track, when it resets, and when the account is back.
	assert.deepEqual(tracks(row('Work'))[0], ['Work 5-hour window', 100, 'Resets 18:20']);
	assert.doesNotMatch(row('Work'), /bg-status-info/);
	assert.match(row('Work').split('aria-label="Work Week"')[0], /rounded-full[^"]*bg-fg-light/);
	assert.match(row('Work'), /Out until Tue 18:20/);

	// Past the switch point: that window in info, the other empty with all of it left.
	assert.deepEqual(tracks(row('Spare')), [['Spare 5-hour window', 0, '100% left'], ['Spare Week', 98, '2% left · Thu 20:00']]);
	const [emptyWindow, pastWindow] = row('Spare').split('aria-label="Spare Week"');
	assert.doesNotMatch(emptyWindow, /bg-status-info[ "]/, 'the empty window is not info');
	assert.match(pastWindow, /bg-status-info[ "][\s\S]*aria-hidden="true" class="[^"]*var\(--ak-color-info\)[^"]*">2% left · Thu 20:00</);
	assert.match(row('Spare'), /bg-status-info-subtle[^"]*"[^>]*>\s*Past the 98% switch point/);

	// Never read and free: no track, a dash spoken as no reading, and a status not on the success tint.
	assert.doesNotMatch(row('New'), /role="progressbar"/);
	assert.equal(row('New').match(/<span aria-hidden="true"[^>]*>–<\/span><span class="sr-only">No reading<\/span>/g)?.length, 2);
	assert.match(row('New'), /class="[^"]*bg-canvas-secondary[^"]*"[^>]*>\s*Not read yet\s*</);
	assert.doesNotMatch(row('New'), /success/);
	assert.match(html(UsageTable, { 'aria-label': 'A', accounts: [accounts[3]], unreadLabel: 'Signed in' }), />\s*Signed in\s*</);

	// Off, in its own words or yours.
	assert.match(row('Old'), /class="[^"]*bg-canvas-secondary[^"]*"[^>]*>\s*Off\s*</);
	assert.match(html(UsageTable, { 'aria-label': 'A', accounts: [accounts[4]], offLabel: 'Paused' }), />\s*Paused\s*</);

	// Refused with an end and never read: when it is back, and no track.
	assert.doesNotMatch(row('Refused'), /role="progressbar"/);
	assert.match(row('Refused'), />\s*Out until Tue 14:36\s*</);

	// Low is a warning, in usageText's words.
	assert.match(row('Low'), /bg-status-warning-subtle[^"]*"[^>]*>\s*9% left · Tue 17:00/);

	// Every time moves with the time zone, and nothing says "no new runs".
	const berlin = html(UsageTable, { 'aria-label': 'A', accounts, timeZone: 'Europe/Berlin' });
	for (const text of ['66% left · 17:40', '34% left · Thu 21:00', 'Resets 19:20', 'Out until Tue 19:20', 'Out until Tue 15:36', '9% left · Tue 18:00']) assert.ok(berlin.includes(text), text);
	assert.doesNotMatch(out + berlin, /no new runs/i);
});
