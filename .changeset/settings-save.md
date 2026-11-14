---
'agents-kit-svelte': minor
---

Settings, save group: `SettingsForm` (the staged model's form, with a leave guard; Enter in a field saves whenever the bar's Save would), `SaveBar` (keeps scroll room so a focused field is never under a sticky or floating bar), `ChangeNotice` (token-owned Undo), `ConflictResolver`, `ConsequenceList` (`title` names it; `heading` stays as an alias) and `ConsequenceDialog` (route-addressable confirmation with reassignment, a typed phrase that gates without JavaScript, and `confirmUnavailable`). `ChangeNotice` and `ConsequenceDialog` honour a covering page or section lock; `ConsequenceDialog` also honours a locked `SettingsRow` around it.

Overlay primitives gain route mode, all optional and off by default: `Dialog` takes `closeHref` (the close button becomes a link; Escape and a backdrop press follow it), `ssrOpen` (server-rendered open, upgraded to a modal on mount), `returnFocus` and `narrow: 'sheet' | 'fullscreen'`; `Sheet` takes `closeHref`, `ssrOpen` and `returnFocus`; `AlertDialog` takes `closeHref`, `ssrOpen`, `returnFocus`, `narrow`, `confirmDisabled` and `confirmDescribedBy`.

A SettingsForm with no SaveBar shows a conflict (its message, else `labels.conflict`), from its handler or its `result`. ConsequenceDialog reads a `result` round trip the settings way, so a conflict shows; field errors from `onConfirm` or `result` show on the typed phrase and the reassign selects (`aria-invalid`, described by the error), and any other field's error joins the alert. A failure takes focus only while focus is still where Confirm left it. Without JavaScript inside a SettingsForm, Enter in the typed phrase submits the page's Save with no `intent`: act on the phrase only when `intent` says so. The leave dialog is medium-sized, and where its buttons wrap, "Save and leave" goes on the top line.

ChangeNotice's Dismiss prefers a control in its own page pane (a SettingsLayout page, else `main`) over a rail beside it. The leave dialog's actions sit on one line where they fit, else in a full-width stack, so they read in the order Tab moves through them.
