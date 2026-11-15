/**
 * Map GitHub REST API responses onto the kit's GitHub card types.
 *
 * These are mappers, not a client: fetch with your own token and library (Octokit,
 * `fetch`, a server route), then pass the JSON in. Only the fields the cards use are read,
 * so the input types below are deliberately loose and accept full API responses.
 *
 * ```ts
 * const res = await octokit.rest.pulls.get({ owner, repo, pull_number });
 * const runs = await octokit.rest.checks.listForRef({ owner, repo, ref: res.data.head.sha });
 * const pr = fromGitHubRest.pullRequest(res.data, { checks: runs.data.check_runs });
 * ```
 */

import type {
	GitHubCheckItem,
	GitHubCommitData,
	GitHubIssueData,
	GitHubLabel,
	GitHubPullRequestData
} from '../../types';

// --- Input shapes (the subset of the REST payloads the mappers read) ---

export interface RestUser {
	login: string;
}

export type RestLabel = string | { name?: string | null; color?: string | null };

export interface RestIssue {
	number: number;
	title: string;
	state: string;
	html_url?: string;
	user?: RestUser | null;
	created_at: string;
	labels?: RestLabel[];
	body?: string | null;
	repository_url?: string;
	pull_request?: unknown;
}

export interface RestPullRequest {
	number: number;
	title: string;
	state: string;
	draft?: boolean;
	merged_at?: string | null;
	user?: RestUser | null;
	html_url?: string;
	head: { ref: string };
	base: { ref: string; repo?: { full_name: string } | null };
	additions?: number;
	deletions?: number;
	changed_files?: number;
	updated_at: string;
}

export interface RestCheckRun {
	id: number | string;
	name: string;
	status: string;
	conclusion?: string | null;
	started_at?: string | null;
	completed_at?: string | null;
	output?: { title?: string | null; summary?: string | null } | null;
	app?: { name?: string | null } | null;
}

export interface RestCommit {
	sha: string;
	commit: {
		message: string;
		author?: { name?: string | null; date?: string | null } | null;
		verification?: { verified?: boolean } | null;
	};
	author?: RestUser | null;
	html_url?: string;
	stats?: { additions?: number; deletions?: number };
	files?: { filename: string; status: string; additions?: number; deletions?: number }[];
}

// --- Options ---

export interface GitHubMapOptions {
	/** Turns an ISO timestamp into display text. Defaults to `formatRelativeTime`. */
	formatTime?: (iso: string) => string;
	/** Picks a tone for a label. Defaults to `labelTone`, a guess from the label name. */
	labelTone?: (label: { name: string; color?: string }) => GitHubLabel['tone'];
	/** `owner/name`, when the payload doesn't carry it (issues fetched outside a repo URL). */
	repo?: string;
}

// --- Helpers ---

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	['year', 365 * 24 * 3600],
	['month', 30 * 24 * 3600],
	['week', 7 * 24 * 3600],
	['day', 24 * 3600],
	['hour', 3600],
	['minute', 60]
];

const SHORT: Partial<Record<Intl.RelativeTimeFormatUnit, string>> = { minute: 'm', hour: 'h', day: 'd', week: 'w' };

/**
 * Formats a timestamp the way the cards show it: `just now`, `12m ago`, `3h ago`, `2d ago`,
 * `3w ago`, then a short date such as `Mar 4, 2026`.
 *
 * @param iso - ISO 8601 timestamp.
 * @param now - Reference time, for tests. Defaults to the current time.
 */
export function formatRelativeTime(iso: string, now: Date | number = Date.now()): string {
	const then = new Date(iso).getTime();
	if (Number.isNaN(then)) return iso;
	const seconds = Math.round((Number(now) - then) / 1000);
	if (seconds < 45) return 'just now';
	for (const [unit, size] of UNITS) {
		if (seconds >= size || unit === 'minute') {
			const value = Math.max(1, Math.floor(seconds / size));
			if (SHORT[unit]) return `${value}${SHORT[unit]} ago`;
			break;
		}
	}
	return new Date(then).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Guesses a tone from a label's name: bugs and blockers are danger, risks and questions are
 * warning, features and ready states are success, area and type labels are accent, the rest
 * neutral. Pass your own `labelTone` for anything this gets wrong.
 */
export function labelTone(label: { name: string }): GitHubLabel['tone'] {
	const name = label.name.toLowerCase();
	if (/bug|error|fail|security|critical|blocker|blocked|regression|incident/.test(name)) return 'danger';
	if (/risk|warn|question|needs|wip|in.?progress|investigat|breaking/.test(name)) return 'warning';
	if (/feat|enhance|ready|done|good.first|approved|release/.test(name)) return 'success';
	if (/^(area|type|kind|scope)[:/]/.test(name)) return 'accent';
	return 'neutral';
}

/** Formats a duration in whole seconds as `48s`, `2m 14s` or `1h 05m`. */
export function formatDuration(totalSeconds: number): string {
	const s = Math.max(0, Math.round(totalSeconds));
	if (s < 60) return `${s}s`;
	if (s < 3600) return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
	return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`;
}

function repoFromUrl(url: string | undefined): string | undefined {
	const match = url?.match(/\/repos\/([^/]+\/[^/]+)/);
	return match?.[1];
}

function toLabels(labels: RestLabel[] | undefined, options: GitHubMapOptions): GitHubLabel[] {
	const tone = options.labelTone ?? labelTone;
	return (labels ?? []).flatMap((label) => {
		const name = typeof label === 'string' ? label : label.name;
		if (!name) return [];
		const color = typeof label === 'string' ? undefined : (label.color ?? undefined);
		return [{ name, tone: tone({ name, color }) }];
	});
}

// --- Mappers ---

function issue(json: RestIssue, options: GitHubMapOptions = {}): GitHubIssueData {
	const format = options.formatTime ?? ((iso: string) => formatRelativeTime(iso));
	return {
		number: json.number,
		title: json.title,
		repo: options.repo ?? repoFromUrl(json.repository_url) ?? '',
		state: json.state === 'closed' ? 'closed' : 'open',
		href: json.html_url,
		author: json.user?.login,
		createdAt: format(json.created_at),
		labels: toLabels(json.labels, options),
		summary: json.body?.trim().split(/\n\s*\n/)[0] || undefined
	};
}

function checkRun(json: RestCheckRun, options: { workflow?: string } = {}): GitHubCheckItem {
	const conclusion = json.conclusion ?? '';
	const status: GitHubCheckItem['status'] =
		json.status !== 'completed'
			? 'running'
			: conclusion === 'success' || conclusion === 'neutral'
				? 'passed'
				: conclusion === 'skipped' || conclusion === 'cancelled' || conclusion === 'stale'
					? 'skipped'
					: 'failed';
	const start = json.started_at ? new Date(json.started_at).getTime() : NaN;
	const end = json.completed_at ? new Date(json.completed_at).getTime() : NaN;
	return {
		id: String(json.id),
		name: json.name,
		workflow: options.workflow ?? json.app?.name ?? undefined,
		status,
		duration: Number.isFinite(start) && Number.isFinite(end) ? formatDuration((end - start) / 1000) : undefined,
		summary: json.output?.title ?? undefined
	};
}

function pullRequest(
	json: RestPullRequest,
	options: GitHubMapOptions & { checks?: RestCheckRun[] } = {}
): GitHubPullRequestData {
	const format = options.formatTime ?? ((iso: string) => formatRelativeTime(iso));
	return {
		number: json.number,
		title: json.title,
		repo: options.repo ?? json.base.repo?.full_name ?? '',
		state: json.merged_at ? 'merged' : json.state === 'closed' ? 'closed' : json.draft ? 'draft' : 'open',
		author: json.user?.login,
		href: json.html_url,
		headBranch: json.head.ref,
		baseBranch: json.base.ref,
		additions: json.additions,
		deletions: json.deletions,
		changedFilesCount: json.changed_files,
		checks: options.checks?.map((run) => checkRun(run)),
		updatedAt: format(json.updated_at)
	};
}

function commit(json: RestCommit, options: GitHubMapOptions & { branch?: string } = {}): GitHubCommitData {
	const format = options.formatTime ?? ((iso: string) => formatRelativeTime(iso));
	const date = json.commit.author?.date;
	return {
		sha: json.sha.slice(0, 7),
		href: json.html_url,
		message: json.commit.message.split('\n')[0],
		author: json.author?.login ?? json.commit.author?.name ?? undefined,
		timestamp: date ? format(date) : undefined,
		branch: options.branch,
		verified: json.commit.verification?.verified ?? undefined,
		additions: json.stats?.additions,
		deletions: json.stats?.deletions,
		files: json.files?.map((file) => ({
			path: file.filename,
			status: file.status === 'added' ? 'added' : file.status === 'removed' ? 'deleted' : 'modified',
			additions: file.additions ?? 0,
			deletions: file.deletions ?? 0
		}))
	};
}

/** Mappers from GitHub REST payloads to the kit's card data. */
export const fromGitHubRest = { issue, pullRequest, checkRun, commit };
