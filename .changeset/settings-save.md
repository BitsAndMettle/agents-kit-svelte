---
'agents-kit-svelte': minor
---

Settings, save group: `SettingsForm` (the staged model's form, with a leave guard; Enter in a field always saves), `SaveBar` (keeps scroll room so a focused field is never under a sticky or floating bar), `ChangeNotice` (token-owned Undo), `ConflictResolver`, `ConsequenceList` (`title` names it; `heading` stays as an alias) and `ConsequenceDialog` (route-addressable confirmation with reassignment, a typed phrase that gates without JavaScript, and `confirmUnavailable`). `ChangeNotice` and `ConsequenceDialog` honour a covering page or section lock.

Overlay primitives gain route mode, all optional and off by default: `Dialog` takes `closeHref` (the close button becomes a link; Escape and a backdrop press follow it), `ssrOpen` (server-rendered open, upgraded to a modal on mount), `returnFocus` and `narrow: 'sheet' | 'fullscreen'`; `Sheet` takes `closeHref`, `ssrOpen` and `returnFocus`; `AlertDialog` takes `closeHref`, `ssrOpen`, `returnFocus`, `narrow`, `confirmDisabled` and `confirmDescribedBy`.
