---
'agents-kit-svelte': minor
---

Add the Charts & Timelines collection (`agents-kit-svelte/charts`): `GenerativeChart` draws line, area and bar charts from a JSON spec an agent emits, with callouts and click-to-ask; `AgentHandoffGantt` shows which agent held the work and what it handed on; `ModelPhaseStream` shows which model ran each phase, with escalation, fallback and swap markers. All three are registered for `IntelligentUIRenderer`, share new `--ak-chart-1` to `--ak-chart-6` colour tokens, and come with scale and run-replay helpers and sample data in `agents-kit-svelte/fixtures`.
