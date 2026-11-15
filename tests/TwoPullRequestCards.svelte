<script lang="ts">
	// Two cards for one pull request on one page, for github-cards.test.ts.
	import GitHubPullRequestCard from '../src/lib/github/GitHubPullRequestCard.svelte';
	import type { GitHubPullRequestData } from '../src/lib/types';

	let { pr }: { pr: GitHubPullRequestData } = $props();
</script>

<GitHubPullRequestCard {pr} />
<GitHubPullRequestCard {pr} />
