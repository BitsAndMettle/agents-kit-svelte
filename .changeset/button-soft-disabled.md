---
'agents-kit-svelte': minor
---

`Button` gains `softDisabled`: the button looks disabled and reports `aria-disabled="true"` but keeps keyboard focus, and clicks are ignored. Use it for a wait such as a resend cooldown, where `disabled` would drop focus to the page.
