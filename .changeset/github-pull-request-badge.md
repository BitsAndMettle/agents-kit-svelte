---
'agents-kit-svelte': minor
---

**`GitHubPullRequestBadge`, and the GitHub cards say each status.**

- New `GitHubPullRequestBadge`: a pull request in a line, for a list row or a card face. It draws GitHub's icon for the state in the state's colour (with the state's word for screen readers), `#number` (a link with `href`) and a check mark with `checksStatus`. It takes `pr` (`number`, `state`, `href`, `checksStatus`) and has no heading or button of its own.
- A check's status is a glyph of its own in `GitHubPullRequestCard`: a tick for passed, a cross for failed, a dot for running and a dash for skipped, each with its word for screen readers. Failed and running no longer differ by colour alone.
- `GitHubPullRequestCard`'s state chip carries GitHub's icon for each state, and an open pull request reads "Open", not "Open PR". Its checks panel takes its id from `$props.id()`, so two cards for one pull request no longer share one.
- `GitHubCheckItem.workflow` and `duration` are optional. A run without them has no empty pill in `GitHubPullRequestCard` or `GitHubChecksPanel`, and `fromGitHubRest` leaves them out instead of filling in `''`.
- `GitHubIssueData.href` makes the issue's number a link, and `fromGitHubRest.issue` maps `html_url` to it.
- The light theme's `--ak-color-accent`, `--ak-color-warning` and `--ak-color-danger` are darker, so their text reads at 4.5:1 on their subtle backgrounds, as `--ak-color-success` does since 0.5.0. Merged, warning and Closed text measured 4.00:1, 3.29:1 and 4.18:1.
