---
'agents-kit-svelte': minor
---

`UsageWindow` takes `points`: the window's earlier readings, `{ at, used }` oldest first. `usageBurn` draws the line from the window's start through those after the start and before the reading, to the reading, so the projection carries the recent rate instead of the average since the start. Without them it draws as before.
