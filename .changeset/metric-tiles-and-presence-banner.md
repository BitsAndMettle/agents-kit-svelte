---
'agents-kit-svelte': minor
---

Add `MetricTiles` to Charts & Timelines and `PresenceBanner` to the chat collection. `MetricTiles` shows a row of headline numbers (two across on a phone, four on a desktop): each tile can carry a unit or a duration or percent format, the change against the prior period coloured by which direction is better, a small trend line, or a "4 of 6" capacity bar, and becomes a button through `onSelect`. `PresenceBanner` is a slim `role="status"` banner for whether something you depend on is reachable (online, not responding, offline or reconnecting), with since-when as clock time and relative time from a `now` you pass in, an optional action such as Move or Retry, and an optional dismiss. Both are registered for `IntelligentUIRenderer`, and the `sparkline`, `metricDelta`, `describeMetric`, `relativeTime` and `clockTime` helpers are exported.
