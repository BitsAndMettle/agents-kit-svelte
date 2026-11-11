---
'agents-kit-svelte': minor
---

Two cards for an operator agent talking to a person in a chat thread. `DeviceApprovalCard` lets someone approve a new device (such as a phone) to act with the same rights as this one: a large match code read digit by digit to screen readers, the abilities it will get, time left, an "the code on my phone is …" check that must be ticked before Approve turns on, one-press Deny, and a one-line outcome afterwards. `CitedAnswer` shows an agent's answer to a question with each source as a quote and a check badge (verified, not checked, or quote not found); a mismatch raises a banner and hides Send. Both are in the `chat` entry and the Intelligent UI registry as `device-approval` and `cited-answer`, with pure helpers (`groupCode`, `speakCode`, `timeLeft`, `formatRequestedAgo`, `summarizeSources`) and samples in `agents-kit-svelte/fixtures`.
