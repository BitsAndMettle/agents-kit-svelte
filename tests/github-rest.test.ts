import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDuration, formatRelativeTime, fromGitHubRest, labelTone } from '../src/lib/core/github/rest.ts';

const NOW = new Date('2026-10-31T12:00:00Z');
const at = (minutesAgo: number) => new Date(NOW.getTime() - minutesAgo * 60_000).toISOString();
const formatTime = (iso: string) => formatRelativeTime(iso, NOW);

test('formatRelativeTime matches the card style', () => {
	assert.equal(formatRelativeTime(at(0.2), NOW), 'just now');
	assert.equal(formatRelativeTime(at(12), NOW), '12m ago');
	assert.equal(formatRelativeTime(at(180), NOW), '3h ago');
	assert.equal(formatRelativeTime(at(60 * 24 * 2), NOW), '2d ago');
	assert.equal(formatRelativeTime(at(60 * 24 * 15), NOW), '2w ago');
	assert.equal(formatRelativeTime('2026-03-04T10:00:00Z', NOW), 'Mar 4, 2026');
	assert.equal(formatRelativeTime('not a date', NOW), 'not a date');
});

test('formatDuration and labelTone', () => {
	assert.equal(formatDuration(48), '48s');
	assert.equal(formatDuration(134), '2m 14s');
	assert.equal(formatDuration(3900), '1h 05m');
	assert.equal(labelTone({ name: 'bug' }), 'danger');
	assert.equal(labelTone({ name: 'needs-triage' }), 'warning');
	assert.equal(labelTone({ name: 'enhancement' }), 'success');
	assert.equal(labelTone({ name: 'area:landing' }), 'accent');
	assert.equal(labelTone({ name: 'size:s' }), 'neutral');
});

test('issue mapper reads a REST issue', () => {
	const issue = fromGitHubRest.issue(
		{
			number: 42,
			title: 'Redirect loop on deep links',
			state: 'open',
			html_url: 'https://github.com/acme/web/issues/42',
			user: { login: 'mira' },
			created_at: at(28),
			labels: [{ name: 'bug', color: 'd73a4a' }, 'area:auth'],
			body: 'Deep links bounce to /login.\n\nSteps to reproduce...',
			repository_url: 'https://api.github.com/repos/acme/web'
		},
		{ formatTime }
	);
	assert.deepEqual(issue, {
		number: 42,
		title: 'Redirect loop on deep links',
		repo: 'acme/web',
		state: 'open',
		href: 'https://github.com/acme/web/issues/42',
		author: 'mira',
		createdAt: '28m ago',
		labels: [
			{ name: 'bug', tone: 'danger' },
			{ name: 'area:auth', tone: 'accent' }
		],
		summary: 'Deep links bounce to /login.'
	});
});

test('pull request mapper derives state and maps check runs', () => {
	const base = {
		number: 7,
		title: 'fix: keep the return path',
		state: 'open',
		user: { login: 'mira' },
		head: { ref: 'fix/return-path' },
		base: { ref: 'main', repo: { full_name: 'acme/web' } },
		additions: 12,
		deletions: 3,
		changed_files: 2,
		updated_at: at(5)
	};
	const pr = fromGitHubRest.pullRequest(base, {
		formatTime,
		checks: [
			{ id: 1, name: 'test', status: 'completed', conclusion: 'success', started_at: at(4), completed_at: at(2), app: { name: 'GitHub Actions' } },
			{ id: 2, name: 'lint', status: 'in_progress' },
			{ id: 3, name: 'e2e', status: 'completed', conclusion: 'failure', output: { title: '2 tests failed' } }
		]
	});
	assert.equal(pr.state, 'open');
	assert.equal(pr.repo, 'acme/web');
	assert.equal(pr.updatedAt, '5m ago');
	assert.equal(pr.riskTier, undefined);
	assert.deepEqual(
		pr.checks?.map((c) => [c.id, c.status, c.duration, c.workflow, c.summary]),
		[
			['1', 'passed', '2m 00s', 'GitHub Actions', undefined],
			['2', 'running', undefined, undefined, undefined],
			['3', 'failed', undefined, undefined, '2 tests failed']
		]
	);
	assert.equal(fromGitHubRest.pullRequest({ ...base, draft: true }).state, 'draft');
	assert.equal(fromGitHubRest.pullRequest({ ...base, state: 'closed', merged_at: at(1) }).state, 'merged');
	assert.equal(fromGitHubRest.pullRequest({ ...base, state: 'closed' }).state, 'closed');
	assert.equal(fromGitHubRest.pullRequest({ ...base, html_url: 'https://github.com/acme/web/pull/7' }).href, 'https://github.com/acme/web/pull/7');
	// The list endpoint has no counts, and runs are only what you pass: nothing is made up for them.
	const listed = fromGitHubRest.pullRequest({ ...base, user: null, additions: undefined, deletions: undefined, changed_files: undefined });
	assert.deepEqual([listed.author, listed.additions, listed.deletions, listed.changedFilesCount, listed.checks], [undefined, undefined, undefined, undefined, undefined]);
});

test('commit mapper shortens the sha and maps file statuses', () => {
	const commit = fromGitHubRest.commit(
		{
			sha: 'cdb5ea5f00ba4',
			commit: { message: 'fix(home): raise contrast\n\nLonger body', author: { name: 'Mira', date: at(12) }, verification: { verified: true } },
			author: { login: 'mira' },
			stats: { additions: 20, deletions: 4 },
			files: [
				{ filename: 'a.css', status: 'modified', additions: 10, deletions: 4 },
				{ filename: 'b.ts', status: 'added', additions: 10 },
				{ filename: 'c.ts', status: 'removed' },
				{ filename: 'd.ts', status: 'renamed' }
			]
		},
		{ formatTime, branch: 'fix/contrast' }
	);
	assert.equal(commit.sha, 'cdb5ea5');
	assert.equal(commit.message, 'fix(home): raise contrast');
	assert.equal(commit.timestamp, '12m ago');
	assert.equal(commit.branch, 'fix/contrast');
	assert.equal(commit.verified, true);
	assert.deepEqual(commit.files?.map((f) => f.status), ['modified', 'added', 'deleted', 'modified']);
	// A commit that says less maps to less: no author, time, branch, counts or files are made up.
	const bare = fromGitHubRest.commit({ sha: 'cdb5ea5f00ba4', commit: { message: 'fix' } });
	assert.deepEqual([bare.author, bare.timestamp, bare.branch, bare.additions, bare.deletions, bare.files], [undefined, undefined, undefined, undefined, undefined, undefined]);
	assert.equal(fromGitHubRest.commit({ sha: 'cdb5ea5f00ba4', html_url: 'https://github.com/acme/web/commit/cdb5ea5', commit: { message: 'fix' } }).href, 'https://github.com/acme/web/commit/cdb5ea5');
});
