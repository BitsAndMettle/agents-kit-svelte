import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { GitHubCheckItem, GitHubCommitData, GitHubIssueData, GitHubLifecycleStage, GitHubPRState, GitHubPullRequestData } from '../src/lib/types.ts';
import { ssr } from './ssr.ts';

const { load, html, snippet } = ssr();

/** What a card says: the text of its markup, on one line. */
const said = (markup: string) => markup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

test('GitHubIssueCard: an issue is its number, title, repository and state, and nothing is drawn for what is left out', async () => {
	const GitHubIssueCard = await load('/src/lib/github/GitHubIssueCard.svelte');
	const issue: GitHubIssueData = { number: 11, title: 'Checkout', repo: 'ada/shop', state: 'open' };
	const actions = snippet(() => '<button type="button">Approve</button>');
	const says = (more: Partial<GitHubIssueData>, props: Record<string, unknown> = {}) => said(html(GitHubIssueCard, { issue: { ...issue, ...more }, actions, ...props }));

	// No byline, no dot that waits for a date, no row for labels, and no footer with nothing in it.
	assert.equal(says({}), 'Open ada/shop · #11 Checkout Approve');
	assert.doesNotMatch(html(GitHubIssueCard, { issue: { ...issue, labels: [] }, actions }), /class="truncate"|class="mt-2\.5 /);
	assert.doesNotMatch(html(GitHubIssueCard, { issue }), /border-t|<button/);
	// A worktree without an agent is not "Unassigned", and has no dot for one.
	assert.equal(says({ worktreeBranch: 'fix/cart' }), 'Open ada/shop · #11 Checkout fix/cart Approve');
	assert.doesNotMatch(html(GitHubIssueCard, { issue: { ...issue, worktreeBranch: 'fix/cart' } }), /size-2 rounded-full bg-accent-primary/);

	// The number is a link only where the issue has an address, in either size.
	const href = 'https://github.com/ada/shop/issues/11';
	assert.doesNotMatch(html(GitHubIssueCard, { issue }), /<a /);
	assert.match(html(GitHubIssueCard, { issue: { ...issue, href } }), /<a href="https:\/\/github\.com\/ada\/shop\/issues\/11"[^>]*>\s*ada\/shop · #11\s*<\/a>/);
	assert.match(html(GitHubIssueCard, { issue: { ...issue, href }, compact: true }), /<a href="https:\/\/github\.com\/ada\/shop\/issues\/11"[^>]*>\s*#11\s*<\/a>/);

	// Who filed it and when are each said alone, and joined only where both are known.
	assert.equal(says({ author: 'mira' }), 'Open ada/shop · #11 Checkout Filed by mira Approve');
	assert.equal(says({ createdAt: '28m ago' }), 'Open ada/shop · #11 Checkout 28m ago Approve');
	assert.equal(says({ author: 'mira', createdAt: '28m ago' }), 'Open ada/shop · #11 Checkout Filed by mira · 28m ago Approve');
	assert.equal(says({ author: 'mira', createdAt: '28m ago' }, { compact: true }), 'Open #11 Checkout mira · 28m ago Approve');
	assert.equal(says({ labels: [{ name: 'bug', tone: 'danger' }, { name: 'area:auth', tone: 'accent' }] }), 'Open ada/shop · #11 Checkout bug area:auth Approve');

	// The title is a heading at the level its page gives it.
	assert.match(html(GitHubIssueCard, { issue }), /<h3[^>]*>Checkout<\/h3>/);
	assert.match(html(GitHubIssueCard, { issue, headingLevel: 2 }), /<h2[^>]*>Checkout<\/h2>/);
});

test('GitHubIssueCard: a button for each handler it is given, and a claim that is the issue\'s state', async () => {
	const GitHubIssueCard = await load('/src/lib/github/GitHubIssueCard.svelte');
	const issue: GitHubIssueData = { number: 11, title: 'Checkout', repo: 'ada/shop', state: 'open' };
	const buttons = (more: Partial<GitHubIssueData>, props: Record<string, unknown>) =>
		[...html(GitHubIssueCard, { issue: { ...issue, ...more }, ...props }).matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].map(([, inner]) => said(inner));
	const noop = () => {};

	assert.deepEqual(buttons({}, { onClaimToggle: noop }), ['Claim issue']);
	assert.deepEqual(buttons({ state: 'in-progress' }, { onClaimToggle: noop }), ['Claimed']);
	assert.deepEqual(buttons({}, { onDispatchRun: noop }), ['Dispatch Agent']);
	assert.deepEqual(buttons({}, { onOpenChat: noop }), ['Chat']);
	assert.deepEqual(buttons({}, { onClaimToggle: noop, onDispatchRun: noop, onOpenChat: noop, compact: true }), ['Claim', 'Dispatch', 'Chat']);
	// Your controls take the place of the card's buttons.
	assert.deepEqual(buttons({}, { onDispatchRun: noop, actions: snippet(() => '<button type="button">Approve</button>') }), ['Approve']);
});

test('GitHubPullRequestCard: a pull request is its number and state, and nothing is drawn for what is left out', async () => {
	const GitHubPullRequestCard = await load('/src/lib/github/GitHubPullRequestCard.svelte');
	const pr: GitHubPullRequestData = { number: 57, state: 'open' };
	const drawn = (more: Partial<GitHubPullRequestData>, props: Record<string, unknown> = {}) => html(GitHubPullRequestCard, { pr: { ...pr, ...more }, ...props });
	const says = (more: Partial<GitHubPullRequestData>) => said(drawn(more));

	// No nought for a count nobody gave, no arrow between branches, no byline, no checks, no button and no footer.
	const bare = drawn({});
	assert.equal(said(bare), 'Open PR #57');
	assert.match(bare, /^\s*<article aria-label="GitHub Pull Request 57" /);
	assert.doesNotMatch(bare, /<a |<h\d|<code|<button|<p |arrow-right|border-t/);

	// Every state has its word and GitHub's icon: a closed pull request is not an open one.
	const states: Record<GitHubPRState, string> = { open: 'Open', draft: 'Draft', merged: 'Merged', closed: 'Closed' };
	for (const [state, word] of Object.entries(states)) assert.equal(says({ state: state as GitHubPRState }), `${word} PR #57`);
	assert.deepEqual(Object.keys(states).map((state) => /lucide-(git-[a-z-]+)[ "]/.exec(drawn({ state: state as GitHubPRState }))?.[1]), ['git-pull-request', 'git-pull-request-draft', 'git-merge', 'git-pull-request-closed']);

	// The number is a link where the pull request has an address.
	assert.match(drawn({ href: 'https://github.com/ada/shop/pull/57' }), /<a href="https:\/\/github\.com\/ada\/shop\/pull\/57"[^>]*>PR #57<\/a>/);

	// Each fact stands alone. A nought that was given is drawn: it is what GitHub said.
	assert.equal(says({ additions: 0 }), 'Open PR #57 +0');
	assert.equal(says({ linkedIssueNumber: 41, deletions: 3, changedFilesCount: 2, riskTier: 'T2' }), 'Open PR #57 Fixes #41 −3 (2 files) T2');
	assert.equal(says({ headBranch: 'fix/cart' }), 'Open PR #57 fix/cart');
	// One branch alone points nowhere.
	for (const one of [{ headBranch: 'fix/cart' }, { baseBranch: 'main' }]) assert.doesNotMatch(drawn(one), /arrow-right/);
	assert.match(drawn({ headBranch: 'fix/cart', baseBranch: 'main' }), /fix\/cart\s*<\/code>\s*<svg[^>]*arrow-right[\s\S]*<code[^>]*>\s*main\s*<\/code>/);
	assert.equal(says({ author: 'mira' }), 'Open PR #57 by mira');
	assert.equal(says({ updatedAt: '5m ago' }), 'Open PR #57 5m ago');
	assert.equal(says({ author: 'mira', updatedAt: '5m ago' }), 'Open PR #57 by mira · 5m ago');

	// The title is a heading at the level its page gives it, and names the card.
	assert.match(drawn({ title: 'Fix the cart' }), /^\s*<article aria-label="GitHub Pull Request 57: Fix the cart" [\s\S]*<h3[^>]*>Fix the cart<\/h3>/);
	assert.match(drawn({ title: 'Fix the cart' }, { headingLevel: 4 }), /<h4[^>]*>Fix the cart<\/h4>/);
});

test('GitHubPullRequestCard: checks are a list that opens where the runs are held, and one line where only their summary is', async () => {
	const GitHubPullRequestCard = await load('/src/lib/github/GitHubPullRequestCard.svelte');
	const run = (id: string, status: GitHubCheckItem['status']): GitHubCheckItem => ({ id, name: `check ${id}`, status });
	const drawn = (more: Partial<GitHubPullRequestData>) => html(GitHubPullRequestCard, { pr: { number: 57, state: 'open', ...more } });
	/** The colour of the first check mark: the one beside the checks' one line or heading. */
	const mark = (markup: string) => /justify-center (text-[a-z-]+)"/.exec(markup)?.[1];

	// A summary alone is one line in its colour, its status said once: nothing opens, because nothing is held.
	for (const [status, colour] of [['passed', 'text-status-success'], ['failed', 'text-status-danger'], ['running', 'text-accent-primary']] as const) {
		const line = drawn({ checksStatus: status });
		assert.equal(said(line), `Open PR #57 Checks ${status}`);
		assert.equal(mark(line), colour);
		assert.doesNotMatch(line, /<button|<ul/);
	}
	// An empty list of runs is no checks at all.
	assert.equal(said(drawn({ checks: [] })), 'Open PR #57');

	// Runs are counted and listed, and their heading is marked by what they add up to: one failure fails them, and one still running keeps them running.
	const rollup = (...statuses: GitHubCheckItem['status'][]) => drawn({ checks: statuses.map((status, at) => run(String(at), status)) });
	assert.match(rollup('passed', 'failed', 'running'), /<button type="button" aria-expanded="true" aria-controls="[^"]+"[\s\S]*Checks \(1\/3 passed\)[\s\S]*check 0[\s\S]*check 1[\s\S]*check 2/);
	assert.deepEqual([rollup('passed', 'failed', 'running'), rollup('passed', 'running'), rollup('passed', 'skipped')].map(mark), ['text-status-danger', 'text-accent-primary', 'text-status-success']);
	// Each run and the heading say their status, which is not only a colour.
	assert.equal(said(rollup('failed', 'skipped')), 'Open PR #57 failed Checks (0/2 passed) failed check 0 skipped check 1');
	// A summary that was given is the one shown, beside the runs.
	assert.equal(mark(drawn({ checks: [run('0', 'passed')], checksStatus: 'running' })), 'text-accent-primary');

	// A run without its workflow or time has no empty pill or column for them.
	const PILL = /font-mono text-\[10px\]|tabular-nums text-fg-light/;
	assert.doesNotMatch(rollup('passed'), PILL);
	assert.match(drawn({ checks: [{ ...run('0', 'passed'), workflow: 'CI', duration: '14s' }] }), /font-mono text-\[10px\][^>]*>\s*CI\s*<[\s\S]*tabular-nums text-fg-light">14s</);
});

test('GitHubPullRequestCard: two cards for one pull request open two different panels', async () => {
	const TwoCards = await load('/tests/TwoPullRequestCards.svelte');
	const markup = html(TwoCards, { pr: { number: 57, state: 'open', checks: [{ id: '0', name: 'lint', status: 'passed' }] } });
	const ids = [...markup.matchAll(/aria-controls="([^"]+)"/g)].map(([, id]) => id);
	assert.equal(new Set(ids).size, 2);
	for (const id of ids) assert.match(markup, new RegExp(`id="${id}"`));
});

test('CheckMark: each status has a glyph of its own, and says its word unless told not to', async () => {
	const CheckMark = await load('/src/lib/github/CheckMark.svelte');
	const statuses: GitHubCheckItem['status'][] = ['passed', 'failed', 'running', 'skipped'];
	const glyphs = statuses.map((status) => {
		const markup = html(CheckMark, { status });
		assert.match(markup, new RegExp(`<span class="sr-only">${status}</span>`));
		assert.doesNotMatch(html(CheckMark, { status, spoken: false }), /sr-only/);
		// The mark without its colour or its word.
		return markup.replace(/^\s*<span [^>]*>/, '').replace(/<span class="sr-only">[^<]*<\/span>/, '');
	});
	assert.equal(new Set(glyphs).size, statuses.length);
});

test('GitHubChecksPanel: a run without its workflow or time has no empty pill for them', async () => {
	const GitHubChecksPanel = await load('/src/lib/github/GitHubChecksPanel.svelte');
	assert.doesNotMatch(html(GitHubChecksPanel, { checks: [{ id: '0', name: 'lint', status: 'passed' }] }), /font-mono text-\[10px\]|font-mono text-\[11px\] tabular-nums/);
});

test('GitHubPullRequestBadge: GitHub\'s icon for the state with its word, the number, and a mark only for checks it is given', async () => {
	const GitHubPullRequestBadge = await load('/src/lib/github/GitHubPullRequestBadge.svelte');
	const drawn = (more: Partial<GitHubPullRequestData>) => html(GitHubPullRequestBadge, { pr: { number: 57, state: 'open', ...more } });

	// No link without an address, no mark without checks, and nothing to press or head.
	const bare = drawn({});
	assert.equal(said(bare), 'Open #57');
	assert.doesNotMatch(bare, /<a |<button|<h\d|justify-center/);

	// Each state is its icon in its tone, and its word for screen readers.
	const states: Record<GitHubPRState, [string, string, string]> = {
		open: ['Open', 'git-pull-request', 'text-status-success'],
		draft: ['Draft', 'git-pull-request-draft', 'text-fg-light'],
		merged: ['Merged', 'git-merge', 'text-accent-primary'],
		closed: ['Closed', 'git-pull-request-closed', 'text-status-danger']
	};
	for (const [state, [word, icon, tone]] of Object.entries(states)) {
		const markup = drawn({ state: state as GitHubPRState });
		assert.match(markup, new RegExp(`<span class="[^"]*${tone}">\\s*<svg[^>]*lucide-${icon}[ "][\\s\\S]*?<span class="sr-only">${word}</span>`));
	}

	assert.match(drawn({ href: 'https://github.com/ada/shop/pull/57' }), /<a href="https:\/\/github\.com\/ada\/shop\/pull\/57"[^>]*>#57<\/a>/);
	assert.equal(said(drawn({ checksStatus: 'failed' })), 'Open #57 failed');
});

test('GitHubPullRequestCard: a button for each handler it is given, and no word of its own about what a press did', async () => {
	const GitHubPullRequestCard = await load('/src/lib/github/GitHubPullRequestCard.svelte');
	const buttons = (props: Record<string, unknown>) => [...html(GitHubPullRequestCard, { pr: { number: 57, state: 'open' }, ...props }).matchAll(/<button[^>]*>\s*([^<]*?)\s*<\/button>/g)].map(([, label]) => label);

	assert.deepEqual(buttons({}), []);
	assert.deepEqual(buttons({ onRequestChanges: () => {} }), ['Send back']);
	assert.deepEqual(buttons({ onApproveMerge: () => {} }), ['Approve &amp; Queue Merge']);
	assert.deepEqual(buttons({ onRequestChanges: () => {}, onApproveMerge: () => {} }), ['Send back', 'Approve &amp; Queue Merge']);
	// Whether a merge was queued or a pull request sent back is the caller's to know: the card says neither.
	assert.equal(said(html(GitHubPullRequestCard, { pr: { number: 57, state: 'open' }, onApproveMerge: () => {} })), 'Open PR #57 Approve &amp; Queue Merge');
	// Your controls take the place of the card's buttons.
	assert.deepEqual(buttons({ onApproveMerge: () => {}, actions: snippet(() => '<button type="button">Merge</button>') }), ['Merge']);
});

test('GitHubCommitCard: a commit is its SHA, and nothing is drawn for what is left out', async () => {
	const GitHubCommitCard = await load('/src/lib/github/GitHubCommitCard.svelte');
	const commit: GitHubCommitData = { sha: 'cdb5ea5f00ba4' };
	const drawn = (more: Partial<GitHubCommitData>, props: Record<string, unknown> = {}) => html(GitHubCommitCard, { commit: { ...commit, ...more }, ...props });
	const says = (more: Partial<GitHubCommitData>) => said(drawn(more));

	// The short SHA and its copy button, and nothing else: no "Authored by", no noughts, no list and no checkout.
	const bare = drawn({});
	assert.equal(said(bare), 'cdb5ea5');
	assert.deepEqual([...bare.matchAll(/<button[^>]*aria-label="([^"]*)"/g)].map(([, label]) => label), ['Copy commit SHA']);
	assert.doesNotMatch(bare, /<a |<ul|<code|Checkout/);

	// The SHA is a link where the commit has an address.
	assert.match(drawn({ href: 'https://github.com/ada/shop/commit/cdb5ea5' }), /<a href="https:\/\/github\.com\/ada\/shop\/commit\/cdb5ea5"[^>]*>cdb5ea5<\/a>/);

	// Each fact stands alone, and a separator only sits between two.
	assert.equal(says({ message: 'fix the cart' }), 'fix the cart cdb5ea5');
	assert.match(drawn({ message: 'fix the cart' }, { headingLevel: 4 }), /<h4[^>]*>fix the cart<\/h4>/);
	assert.equal(says({ author: 'mira' }), 'cdb5ea5 Authored by mira');
	assert.equal(says({ timestamp: '12m ago' }), 'cdb5ea5 12m ago');
	assert.equal(says({ author: 'mira', timestamp: '12m ago', branch: 'main' }), 'cdb5ea5 Authored by mira · 12m ago on main');
	assert.equal(says({ additions: 0 }), 'cdb5ea5 +0');

	// Files are a list that opens, counted on the button that opens it.
	const listed = drawn({ files: [{ path: 'a.ts', status: 'added', additions: 2, deletions: 0 }] });
	assert.match(listed, /<button type="button" aria-expanded="true"[^>]*>\s*1 file/);
	assert.match(listed, /<ul[\s\S]*a\.ts/);

	// Checkout only with its handler, and no word of its own about what it did.
	assert.match(drawn({}, { onRestore: () => {} }), /<button[^>]*>[\s\S]*?Checkout commit in worktree<\/button>/);
	assert.doesNotMatch(drawn({}, { onRestore: () => {} }), /Checked out/);
});

test('GitHubLifecycleTimeline: stages are drawn as given, under a header only of what it is given', async () => {
	const GitHubLifecycleTimeline = await load('/src/lib/github/GitHubLifecycleTimeline.svelte');
	const stages: GitHubLifecycleStage[] = [
		{ id: 'issue', label: 'Filed', timestamp: '09:02' },
		{ id: 'pull-request', label: 'In review', timestamp: '09:12', actor: 'mira', detail: 'PR 57' },
		{ id: 'merge', label: 'Merged', timestamp: '09:31' }
	];
	const drawn = (props: Record<string, unknown>) => html(GitHubLifecycleTimeline, { stages, ...props });

	// No title, line or closing word of its own: once every stage is done, the header has nothing to say.
	assert.doesNotMatch(drawn({}), /<header|<h\d|aria-label="[^"]*" class="@container|Shipped|From issue to release|hand-off/);
	assert.match(drawn({ doneLabel: 'Shipped' }), /<header[\s\S]*Shipped/);
	assert.match(drawn({ title: 'Card 57', description: 'Its stages', headingLevel: 2 }), /aria-label="Card 57"[\s\S]*<h2[^>]*>Card 57<\/h2>[\s\S]*Its stages/);

	// A stage still ahead has no time; one without a time has no placeholder.
	const midway = drawn({ current: 1 });
	assert.match(midway, /<header[\s\S]*In review[\s\S]*<\/header>/);
	assert.match(midway, /09:12/);
	assert.doesNotMatch(midway, /09:31|--:--/);
	assert.doesNotMatch(html(GitHubLifecycleTimeline, { stages: [{ id: 'issue', label: 'Filed' }] }), /--:--|font-mono text-\[10px\]/);

	// The stage in focus says who and what only where it is told.
	assert.match(midway, /In review<\/span>\s*<span class="text-fg-light">by <strong[^>]*>mira<\/strong><\/span>\s*<span[^>]*>PR 57<\/span>/);
	assert.doesNotMatch(html(GitHubLifecycleTimeline, { stages: [stages[0], { id: 'pull-request', label: 'In review', detail: 'PR 57' }], current: 1 }), />by </);
	assert.doesNotMatch(drawn({ current: 0 }), /rounded-control bg-canvas-secondary px-3\.5/);
});

test('GitHubLifecycleTimeline: without status, tone or quiet it draws as it always has', async () => {
	const GitHubLifecycleTimeline = await load('/src/lib/github/GitHubLifecycleTimeline.svelte');
	const stages: GitHubLifecycleStage[] = [{ id: 'issue', label: 'Filed' }, { id: 'pull-request', label: 'In review' }, { id: 'merge', label: 'Merged' }];
	const midway = html(GitHubLifecycleTimeline, { stages, current: 1 });

	assert.match(midway, /<header[\s\S]*bg-accent-subtle text-accent-primary">\s*<span aria-hidden="true" class="ak-breathe [^"]*"><\/span>\s*In review/);
	assert.match(midway, /bg-status-success-subtle text-status-success"><svg[^>]*lucide-circle-dot[ "]/);
	assert.match(midway, /aria-current="step"[^>]*>\s*<span class="[^"]* bg-accent-subtle text-accent-primary">/);
	assert.match(midway, /opacity-45/);
	assert.match(midway, /transition-\[width\][^"]* bg-accent-primary"/);
	assert.doesNotMatch(midway, /lucide-check[ "]/);
	assert.match(html(GitHubLifecycleTimeline, { stages, doneLabel: 'Shipped' }), /bg-status-success-subtle text-status-success">Shipped</);
});

test('GitHubLifecycleTimeline: a status says where the thing stands, and its tone colours the badge, the bar and the stage in hand', async () => {
	const GitHubLifecycleTimeline = await load('/src/lib/github/GitHubLifecycleTimeline.svelte');
	const stages: GitHubLifecycleStage[] = [{ id: 'issue', label: 'Filed' }, { id: 'pull-request', label: 'In review' }, { id: 'merge', label: 'Merged' }];
	const drawn = (props: Record<string, unknown>) => html(GitHubLifecycleTimeline, { stages, ...props });
	const header = (markup: string) => /<header[\s\S]*<\/header>/.exec(markup)?.[0] ?? '';
	const inHand = (markup: string) => /aria-current="step"[^>]*>\s*<span class="([^"]*)"/.exec(markup)?.[1] ?? '';
	const bar = (markup: string) => /transition-\[width\][^"]* (bg-[a-z-]+)"/.exec(markup)?.[1];

	// Nobody is at work on a stage that stopped, waits for a person or idles: its badge is still.
	const tones: Record<string, [badge: string, fill: string, mark: string]> = {
		danger: ['bg-status-danger-subtle text-status-danger', 'bg-status-danger', 'bg-status-danger-subtle text-status-danger'],
		warning: ['bg-status-warning-subtle text-status-warning', 'bg-status-warning', 'bg-status-warning-subtle text-status-warning'],
		// The neutral stage in hand keeps its glyph in ink, where a stage ahead is muted.
		neutral: ['bg-canvas-secondary text-fg-light', 'bg-fg-light', 'bg-canvas-secondary text-fg-main']
	};
	for (const [tone, [badge, fill, mark]] of Object.entries(tones)) {
		const out = drawn({ current: 1, status: 'Stopped: tests failed', tone });
		assert.match(header(out), new RegExp(`${badge}">\\s*Stopped: tests failed\\s*</span>`), tone);
		assert.doesNotMatch(header(out), /In review/);
		assert.equal(bar(out), fill, tone);
		assert.ok(inHand(out).endsWith(mark), tone);
		assert.doesNotMatch(out, /ak-breathe/, tone);
		// A stage that stopped is still the one in hand.
		assert.match(out, /aria-current="step"[^>]*>[\s\S]*?In review/);
	}

	// Work under way breathes; a thing that is done does not, and its status wins over doneLabel.
	assert.match(drawn({ current: 1, status: 'Implementing', tone: 'accent' }), /ak-breathe[^>]*><\/span>\s*Implementing/);
	const merged = drawn({ status: 'Merged', tone: 'accent', doneLabel: 'Shipped' });
	assert.match(header(merged), /bg-accent-subtle text-accent-primary">Merged<\/span>/);
	assert.equal(bar(merged), 'bg-accent-primary');
	assert.doesNotMatch(merged, /ak-breathe|Shipped/);
});

test('GitHubLifecycleTimeline: quiet stages are a tick once done and muted while ahead, so only the stage in hand is in colour', async () => {
	const GitHubLifecycleTimeline = await load('/src/lib/github/GitHubLifecycleTimeline.svelte');
	const stages: GitHubLifecycleStage[] = [{ id: 'issue', label: 'Filed' }, { id: 'branch', label: 'Branch' }, { id: 'pull-request', label: 'In review' }, { id: 'merge', label: 'Merged' }];
	const ticks = (markup: string) => markup.match(/lucide-check[ "]/g)?.length ?? 0;

	const midway = html(GitHubLifecycleTimeline, { stages, current: 2, quiet: true });
	assert.equal(ticks(midway), 2);
	assert.doesNotMatch(midway, /bg-status-success-subtle|opacity-45|lucide-circle-dot|lucide-git-branch/);
	assert.match(midway, /lucide-git-pull-request[ "]/);
	assert.match(midway, /<span class="text-xs font-medium text-fg-light">Merged<\/span>/);
	assert.match(midway, /<span class="text-xs font-medium text-fg-main">In review<\/span>/);

	const done = html(GitHubLifecycleTimeline, { stages, quiet: true });
	assert.equal(ticks(done), stages.length);
	assert.doesNotMatch(done, /lucide-(circle-dot|git-branch|git-pull-request|git-merge)[ "]/);
});

test('GitHubPullRequestCard: quiet, its chip is neutral unless merged and the review is a plain row with a check mark', async () => {
	const GitHubPullRequestCard = await load('/src/lib/github/GitHubPullRequestCard.svelte');
	const drawn = (more: Partial<GitHubPullRequestData>, quiet = true) => html(GitHubPullRequestCard, { pr: { number: 57, state: 'open', ...more }, quiet });
	const chip = (markup: string) => /rounded-chip [^"]*font-medium ([^"]*)"/.exec(markup)?.[1];

	// Each state keeps GitHub's icon and its word; only a merged one keeps its colour.
	const states: Record<GitHubPRState, [word: string, icon: string, tone: string]> = {
		open: ['Open', 'git-pull-request', 'bg-canvas-secondary text-fg-light'],
		draft: ['Draft', 'git-pull-request-draft', 'bg-canvas-secondary text-fg-light'],
		merged: ['Merged', 'git-merge', 'bg-accent-subtle text-accent-primary'],
		closed: ['Closed', 'git-pull-request-closed', 'bg-canvas-secondary text-fg-light']
	};
	for (const [state, [word, icon, tone]] of Object.entries(states)) {
		const markup = drawn({ state: state as GitHubPRState });
		assert.equal(chip(markup), tone, state);
		assert.match(markup, new RegExp(`lucide-${icon}[ "]`));
		assert.equal(said(markup), `${word} PR #57`);
	}

	// Without quiet the review is the tinted banner it was.
	const banner = drawn({ refereeStatus: 'pass', refereeSummary: 'Review by codex: Pass' }, false);
	assert.match(banner, /bg-status-success-subtle text-status-success"><svg[^>]*lucide-shield-check[ "]/);
	assert.equal(chip(banner), 'bg-status-success-subtle text-status-success');

	// Quiet, the verdict is a tick, a cross or a dot in its colour, and the words beside it say it.
	const marks: [GitHubPullRequestData['refereeStatus'], string, string][] = [
		['pass', 'text-status-success', 'lucide-check[ "]'],
		['send-back', 'text-status-danger', 'lucide-x[ "]'],
		['pending', 'text-accent-primary', 'size-2 rounded-full bg-current'],
		[undefined, 'text-accent-primary', 'size-2 rounded-full bg-current']
	];
	for (const [refereeStatus, colour, glyph] of marks) {
		const row = drawn({ refereeStatus, refereeSummary: 'Review by codex: Pass' });
		assert.match(row, new RegExp(`<p class="mt-3 flex items-start [^"]*bg-canvas-secondary/30[^"]*text-fg-main"><span class="[^"]*${colour}[^"]*">[\\s\\S]*?${glyph}`), String(refereeStatus));
		assert.doesNotMatch(row, /-subtle text-status|lucide-shield-check|sr-only/);
		assert.equal(said(row), 'Open PR #57 Review by codex: Pass');
	}
});
