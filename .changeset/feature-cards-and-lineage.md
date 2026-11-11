---
'agents-kit-svelte': minor
---

Add `FeatureCard` and `FeatureLineage` to the Charts & Timelines collection. `FeatureCard` summarises one Feature: acceptance criteria met with a progress sparkline, its cards split by state (click a segment to filter), attempts, PRs and tokens against budget. `FeatureLineage` lays out a Feature, its cards, agent attempts, PRs, releases and incidents as a graph: hover a node to trace its ancestry, fold a branch away, and click a node through `onSelectNode` to open what is behind it. Both are registered for `IntelligentUIRenderer`, and `layoutLineage` and `traceLineage` are exported for custom views.
