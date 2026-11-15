import { GitMerge, GitPullRequest, GitPullRequestClosed, GitPullRequestDraft } from '@lucide/svelte';
import type { Component } from 'svelte';
import type { GitHubPRState } from '../types';

/** How each pull request state is drawn, wherever one is: its word, GitHub's icon for it, and its tone. */
export const PR_STATES: Record<GitHubPRState, { label: string; icon: Component<{ class?: string; 'aria-hidden'?: 'true' }>; class: string }> = {
	open: { label: 'Open', icon: GitPullRequest, class: 'bg-status-success-subtle text-status-success' },
	draft: { label: 'Draft', icon: GitPullRequestDraft, class: 'bg-canvas-secondary text-fg-light' },
	merged: { label: 'Merged', icon: GitMerge, class: 'bg-accent-subtle text-accent-primary' },
	closed: { label: 'Closed', icon: GitPullRequestClosed, class: 'bg-status-danger-subtle text-status-danger' }
};
