---
'agents-kit-svelte': minor
---

A calm card sheet: one colour for where a thing stands, each part behind a new prop. Nothing an existing app draws changes.

- `GitHubLifecycleTimeline` takes `status` and `tone`, the pair `CardFace` and `CardSheet` take. `status` is the badge's words, in place of the stage in hand's label or `doneLabel`. `tone` colours the badge, the bar and the stage in hand; left out it is the accent until the last stage and success after it, as before. The badge's dot breathes only in the accent before the last stage, so `danger` draws a stage that stopped and `warning` one that waits for a person, both still.
- `GitHubLifecycleTimeline` takes `quiet`: a stage that is done is a tick on the neutral tint, and one still ahead is muted where it was faded to 45%, so its label holds 4.5:1.
- `GitHubPullRequestCard` takes `quiet`: the state chip is neutral unless the pull request is merged, and the review line is a plain row with a check mark (tick, cross or dot) where it was a tinted banner.
- `CardSheet` takes `questionTone` (default `accent`), the tone of the question's block.
- `TONE_SOFT_CLASS` is exported beside `TONE_FILL_CLASS`: the subtle fill and its text per tone, as a badge wears them.
