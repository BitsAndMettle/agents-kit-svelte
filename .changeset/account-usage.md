---
'agents-kit-svelte': minor
---

Account usage, display only: `AccountUsage` is one shape for a subscription account (label, agent, `fiveHour` and `week` windows, switch point, status). `UsagePill` counts the accounts that can still work and opens on a row per account; `UsageRows` draws those rows (a slim `Progress` and a status `Badge`) and is the body of a `usage.read` step, since `ToolResult` now takes `children`; `usageBurn` turns one reading into `TokenBurnChart` props that project the average rate since the window began to the switch point. `TokenBurnChart` takes `formatValue`, `unit` and `budgetLabel`; `UiTone` gains `info`; `dayTime` formats "Thu 20:00".
