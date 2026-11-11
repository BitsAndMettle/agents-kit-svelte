---
'agents-kit-svelte': minor
---

Add `FeatureTimeline`, `TokenBurnChart` and `RunReplayScrubber` to Charts & Timelines. `FeatureTimeline` plots a Feature's cards planned against actual, with a forecast for running work, milestones, a forecast ship date, and sorting by slip. `TokenBurnChart` shows spend against a budget with the burn rate, a projection to the end, and where the budget runs out. `RunReplayScrubber` is a play, scrub and skip-between-moments control whose bindable `now` drives your charts; the `/charts` page now uses it. Adds the `formatDay` and `projectBurn` helpers.
