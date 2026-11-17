---
'agents-kit-svelte': minor
---

`UsageWindow` takes `points`: the window's earlier readings, `{ at, used }` oldest first. `usageBurn` draws the line from the window's start through those after the start and before the reading, to the reading. The projection takes `TokenBurnChart`'s rate over the last 60 hours of points, so a week projects at its recent rate and a five-hour window still at its average since the start. Without points it draws as before.
