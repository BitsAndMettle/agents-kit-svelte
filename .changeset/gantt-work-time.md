---
'agents-kit-svelte': minor
---

AgentHandoffGantt folds time no one worked. `breaks?: TimeBreak[]` draws each stretch as one narrow hatched band labelled with its length (or its `label`), and `formatTime?: (t) => string` formats the axis and spoken times, as RunReplayScrubber's does (default `m:ss`). For work time pass `idleBreaks(spans, 3600, now)`; for calendar time pass none. New pure helpers in `agents-kit-svelte/charts`: `scaleBroken` (a linear scale that gives each break a fixed width and inverts; at width 0 it is work time itself, for a scrubber), `idleBreaks`, `timeTicks` and `foldedTime`, and the `TimeBreak` type.

What moves without the new props: the axis starts at the earliest span rather than at 0 (the same for a run that starts at 0); ticks fall on time steps (1:00, 2:00, … rather than 0:50, 1:40, …); live headroom and Elapsed count from the earliest span, on unfolded time; while live the domain end still only grows, unless the breaks change (Work time ↔ Calendar), when it fits again. Two fixes: a phase with no colour of its own keeps one colour on every bar, the tooltip and the legend (it changed from bar to bar), and a handoff within one lane arcs over the bars' top edge with its label at the top, where it ran down through both bars.
