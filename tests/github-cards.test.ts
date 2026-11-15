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
	// A worktree without an agent is not "Unassigned".
	assert.equal(says({ worktreeBranch: 'fix/cart' }), 'Open ada/shop · #11 Checkout fix/cart Approve');

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

	// No nought for a count nobody gave, no arrow between branches, no byline, no checks and no button.
	const bare = drawn({});
	assert.equal(said(bare), 'Open PR PR #57');
	assert.match(bare, /^\s*<article aria-label="GitHub Pull Request 57" /);
	assert.doesNotMatch(bare, /<a |<h\d|<code|<button|<p |arrow-right/);

	// Every state has its word: a closed pull request is not an open one.
	const states: Record<GitHubPRState, string> = { open: 'Open PR', draft: 'Draft', merged: 'Merged', closed: 'Closed' };
	for (const [state, word] of Object.entries(states)) assert.equal(says({ state: state as GitHubPRState }), `${word} PR #57`);

	// The number is a link where the pull request has an address.
	assert.match(drawn({ href: 'https://github.com/ada/shop/pull/57' }), /<a href="https:\/\/github\.com\/ada\/shop\/pull\/57"[^>]*>PR #57<\/a>/);

	// Each fact stands alone. A nought that was given is drawn: it is what GitHub said.
	assert.equal(says({ additions: 0 }), 'Open PR PR #57 +0');
	assert.equal(says({ linkedIssueNumber: 41, deletions: 3, changedFilesCount: 2, riskTier: 'T2' }), 'Open PR PR #57 Fixes #41 −3 (2 files) T2');
	assert.equal(says({ headBranch: 'fix/cart' }), 'Open PR PR #57 fix/cart');
	// One branch alone points nowhere.
	for (const one of [{ headBranch: 'fix/cart' }, { baseBranch: 'main' }]) assert.doesNotMatch(drawn(one), /arrow-right/);
	assert.match(drawn({ headBranch: 'fix/cart', baseBranch: 'main' }), /fix\/cart\s*<\/code>\s*<svg[^>]*arrow-right[\s\S]*<code[^>]*>\s*main\s*<\/code>/);
	assert.equal(says({ author: 'mira' }), 'Open PR PR #57 by mira');
	assert.equal(says({ updatedAt: '5m ago' }), 'Open PR PR #57 5m ago');
	assert.equal(says({ author: 'mira', updatedAt: '5m ago' }), 'Open PR PR #57 by mira · 5m ago');

	// The title is a heading at the level its page gives it, and names the card.
	assert.match(drawn({ title: 'Fix the cart' }), /^\s*<article aria-label="GitHub Pull Request 57: Fix the cart" [\s\S]*<h3[^>]*>Fix the cart<\/h3>/);
	assert.match(drawn({ title: 'Fix the cart' }, { headingLevel: 4 }), /<h4[^>]*>Fix the cart<\/h4>/);
});

test('GitHubPullRequestCard: checks are a list that opens where the runs are held, and one line where only their summary is', async () => {
	const GitHubPullRequestCard = await load('/src/lib/github/GitHubPullRequestCard.svelte');
	const run = (id: string, status: GitHubCheckItem['status']): GitHubCheckItem => ({ id, name: `check ${id}`, workflow: 'CI', status, duration: '' });
	const drawn = (more: Partial<GitHubPullRequestData>) => html(GitHubPullRequestCard, { pr: { number: 57, state: 'open', ...more } });
	/** The colour of the mark beside the checks' one line or heading. */
	const mark = (markup: string) => /<span class="[^"]* (text-[a-z-]+)">(?:<svg[\s\S]*?<\/svg>|<span[^>]*><\/span>)<\/span>\s*<span>Checks /.exec(markup)?.[1];

	// A summary alone is one line in its colour: nothing opens, because nothing is held.
	for (const [status, colour] of [['passed', 'text-status-success'], ['failed', 'text-status-danger'], ['running', 'text-accent-primary']] as const) {
		const line = drawn({ checksStatus: status });
		assert.equal(said(line), `Open PR PR #57 Checks ${status}`);
		assert.equal(mark(line), colour);
		assert.doesNotMatch(line, /<button|<ul/);
	}
	// An empty list of runs is no checks at all.
	assert.equal(said(drawn({ checks: [] })), 'Open PR PR #57');

	// Runs are counted and listed, and their heading is marked by what they add up to: one failure fails them, and one still running keeps them running.
	const rollup = (...statuses: GitHubCheckItem['status'][]) => drawn({ checks: statuses.map((status, at) => run(String(at), status)) });
	assert.match(rollup('passed', 'failed', 'running'), /<button type="button" aria-expanded="true" aria-controls="gh-pr-checks-57"[\s\S]*Checks \(1\/3 passed\)[\s\S]*check 0[\s\S]*check 1[\s\S]*check 2/);
	assert.deepEqual([rollup('passed', 'failed', 'running'), rollup('passed', 'running'), rollup('passed', 'skipped')].map(mark), ['text-status-danger', 'text-accent-primary', 'text-status-success']);
	// A summary that was given is the one shown, beside the runs.
	assert.equal(mark(drawn({ checks: [run('0', 'passed')], checksStatus: 'running' })), 'text-accent-primary');
});

test('GitHubPullRequestCard: a button for each handler it is given, and no word of its own about what a press did', async () => {
	const GitHubPullRequestCard = await load('/src/lib/github/GitHubPullRequestCard.svelte');
	const buttons = (props: Record<string, unknown>) => [...html(GitHubPullRequestCard, { pr: { number: 57, state: 'open' }, ...props }).matchAll(/<button[^>]*>\s*([^<]*?)\s*<\/button>/g)].map(([, label]) => label);

	assert.deepEqual(buttons({}), []);
	assert.deepEqual(buttons({ onRequestChanges: () => {} }), ['Send back']);
	assert.deepEqual(buttons({ onApproveMerge: () => {} }), ['Approve &amp; Queue Merge']);
	assert.deepEqual(buttons({ onRequestChanges: () => {}, onApproveMerge: () => {} }), ['Send back', 'Approve &amp; Queue Merge']);
	// Whether a merge was queued or a pull request sent back is the caller's to know: the card says neither.
	assert.equal(said(html(GitHubPullRequestCard, { pr: { number: 57, state: 'open' }, onApproveMerge: () => {} })), 'Open PR PR #57 Approve &amp; Queue Merge');
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
	assert.doesNotMatch(drawn({ current: 0 }), /rounded-control bg-canvas-secondary px-3\.5/);
});
