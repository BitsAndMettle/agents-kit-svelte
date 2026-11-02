---
'agents-kit-svelte': minor
---

PR flow components for driving a pull request from the chat: `GitHubPrActionBar` (Create PR with a diff stat and per-file menu), `GitHubPullRequestGraph` (a PR card with its commit graph and merge status), `GitHubChecksWaterfall` (live CI bars on one time axis, the failing assertion inline, Fix and Merge buttons) and `AgentWorkTrace` (a collapsible trace of what the agent did). All four are registered in the Intelligent UI registry as `github-pr-action-bar`, `github-pr-graph`, `github-checks-waterfall` and `agent-work-trace`.
