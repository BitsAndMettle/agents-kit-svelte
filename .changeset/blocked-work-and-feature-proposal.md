---
'agents-kit-svelte': minor
---

Add `BlockedWorkList` to Agents UI Orchestration and `FeatureProposalCard` to Charts & Timelines. `BlockedWorkList` answers "what is stuck, and what can I do about it?": items are grouped by why they are stuck, each shows only the actions you pass for it, an action with a `confirm` sentence asks inline before `onAction` fires, and `busyIds` (or `busy` on an item) shows a spinner. `FeatureProposalCard` shows a Feature an agent proposes with its child cards: the person can remove or rename cards and write a note before `onApprove`, `onRevise` or `onDecline`, dependencies show as "after #2" chips, and the card is read-only once approved. Both are registered for `IntelligentUIRenderer`, and `groupBlockedWork` and the proposal helpers are exported for custom views.
