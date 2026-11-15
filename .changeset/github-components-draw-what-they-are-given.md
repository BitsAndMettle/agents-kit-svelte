---
'agents-kit-svelte': minor
---

**`GitHubIssueCard`, `GitHubPullRequestCard`, `GitHubCommitCard` and `GitHubLifecycleTimeline` draw only what they are given.** A field you leave out is not drawn, with no nought, empty pill or dangling separator in its place. A button appears only with its handler, and the card keeps no record of what a press did. No product sentence is built in. Each takes `headingLevel` for its title (default 3).

- `GitHubPullRequestData`: only `number` and `state` are required. `href` makes the number a link. `checksStatus` (`passed`, `failed` or `running`) is one line for checks whose runs you do not hold; where you pass runs, the heading's mark is what they add up to instead of always a green tick. A closed pull request reads "Closed", not "Open PR".
- `GitHubIssueData`: `author`, `createdAt` and `labels` are optional, and the footer is drawn only when it has something in it. A worktree without an `assignedAgent` no longer says "Unassigned".
- `GitHubCommitData`: only `sha` is required. `href` makes the short SHA a link. The file list opens from its count, and the message is the card's heading.
- `GitHubLifecycleStage`: `actor`, `detail` and `timestamp` are optional. A stage ahead shows no time instead of `--:--`.
- `GitHubLifecycleTimeline` takes `title`, `description` and `doneLabel` (the badge once every stage is done), with no defaults. In a container narrower than 28rem its stages are one row each.
- `fromGitHubRest` leaves out what the payload does not say (author, counts, runs, branch, time) instead of filling in `ghost`, `unknown`, `0` or `''`, and maps `html_url` to `href`.
- The light theme's `--ak-color-success` is darker, so success text reads at 4.5:1 on its subtle background; the Open chip measured 3.92:1.

**Breaking:**

- `GitHubPullRequestCard` draws "Send back" only with `onRequestChanges` and "Approve & Queue Merge" only with `onApproveMerge`. It no longer says "Ready for referee merge", "Merge Queued" or "Send-back recorded", and the checks heading reads "Checks", not "CI Checks & Verification Gates".
- `GitHubIssueCard` draws "Claim issue" only with `onClaimToggle`, "Dispatch Agent" only with `onDispatchRun`. "Claimed" follows `state: 'in-progress'`, and there is no "Run Dispatched". `footerActions` is now `actions`, as on `GitHubPullRequestCard`, and takes no argument.
- `GitHubCommitCard` draws "Checkout commit in worktree" only with `onRestore`, and never "Checked out in worktree".
- `GitHubLifecycleTimeline` has no default title, line or "Shipped" badge: pass `title`, `description` and `doneLabel` to keep them.
