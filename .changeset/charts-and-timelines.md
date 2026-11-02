---
'agents-kit-svelte': minor
---

Add the Charts & Timelines collection (`agents-kit-svelte/charts`): `GenerativeChart` draws line, area and bar charts from a JSON spec an agent emits, with callouts; `AgentHandoffGantt` shows which agent held the work and what it handed on; `ModelPhaseStream` shows which model ran each phase, with escalation, fallback and swap markers. Every span, handoff, lane, phase, marker and point is clickable through your own handler (`onSelectSpan`, `onSelectHandoff`, `onSelectLane`, `onSelectPhase`, `onSelectEvent`, `onSelectPoint`), and handoffs carry a `kind` and a `data` payload so a click can open the diff, tests or file that was passed. All three are registered for `IntelligentUIRenderer`, share new `--ak-chart-1` to `--ak-chart-6` colour tokens, and come with scale and run-replay helpers and sample data in `agents-kit-svelte/fixtures`.
