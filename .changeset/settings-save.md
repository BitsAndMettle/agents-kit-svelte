---
'agents-kit-svelte': minor
---

Settings, save group: `SettingsForm` (the staged model's form, with a leave guard), `SaveBar`, `ChangeNotice` (token-owned Undo), `ConflictResolver`, `ConsequenceList` and `ConsequenceDialog` (route-addressable confirmation with reassignment and a typed phrase that gates without JavaScript).

Overlay primitives gain route mode, all optional and off by default: `Dialog` takes `closeHref` (the close button becomes a link; Escape and a backdrop press follow it), `ssrOpen` (server-rendered open, upgraded to a modal on mount), `returnFocus` and `narrow: 'sheet' | 'fullscreen'`; `Sheet` takes `closeHref`, `ssrOpen` and `returnFocus`; `AlertDialog` takes `closeHref`, `ssrOpen`, `returnFocus`, `narrow`, `confirmDisabled` and `confirmDescribedBy`.
