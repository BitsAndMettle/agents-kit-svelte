---
'agents-kit-svelte': minor
---

Settings rows: `SettingsSection` (card with header, count, status, actions, footer, footnote, danger tone, section lock, aside, columns and nested sub-groups, a no-JavaScript empty state), `SettingsRow` (label, description and a control wired through Field context; staged "Unsaved"/"was X"/impact inside a SettingsForm, saving/saved/error states, locks with a visible reason, actions that collapse into a menu, narrow summary mode), `SettingsFacts` (read-only facts as a description list or tiles, with sources, compact values, local copy and one action), `SettingsToggle` (instant with revert, Retry and Undo; staged inside a SettingsForm; a no-JavaScript Apply form; "Always on" badges), `RequestedChange` (a change waiting for approval elsewhere, with Send again and Cancel request, never shown as saved) and `LockReason` (one visible reason per lock kind, a way forward and a request flow, describing any number of controls).
