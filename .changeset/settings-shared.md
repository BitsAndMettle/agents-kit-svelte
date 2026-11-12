---
'agents-kit-svelte': minor
---

Settings shared layer and primitive additions.

- New entry point `agents-kit-svelte/settings` (also re-exported from the root) with the Settings collection's shared layer: `InstantSetting` and its rune-free `InstantCore`/`UndoSlot`, `SettingsDraft` with `readDefaults`, `diffForm`, `describeChanges` and `undescribedChanges` (in development the draft warns once about a changed control no field describes), locks (`pickLock`, `lockAttrs`, `lockReasonText`, `LOCK_ICONS`, `LOCK_LABELS`), `searchSettings`, `filterSettingsLinks`, `toPaletteCommands`, focus helpers, `CopyState`, `ReadyGate`, `matchesPhrase`/`phrasePattern`, the class recipes (`SETTINGS_CONTAINER`, `CQ`, `RECIPES`, `actionButtonProps`), the contexts and the shared types. Sample data is in `agents-kit-svelte/fixtures`.
- `FormSubmit`, `FormResult`, `FormSubmitHandler`, `FormSubmitContext` and `FormSubmitOptions` move from Auth to the Primitives (`agents-kit-svelte/primitives`). `AuthSubmit`, `AuthResult`, `AuthSubmitHandler`, `AuthSubmitContext` and `AuthSubmitOptions` stay as aliases and behave exactly as before (`AuthResult` and `AuthSubmitContext` remain interfaces, so augmenting them still works). After a failed submit, focus goes to `[data-form-error]` as well as `[data-auth-error]`.
- `readText` and `readCheck` are also exported from the Primitives, with the new `readBoolean` (a hidden `false` plus a checkbox `true`; the last value wins).
- `Field`: `FieldState` gains `describedBy` (extra describing ids, joined by `fieldControlAttrs`), and `createFieldState` builds Field's state with Field's id scheme for custom layouts. `setFieldContext` and `joinIds` are exported. Field itself renders and behaves as before.
- `Button`, `IconButton`, `Switch` and `Checkbox` get a 44px touch target on coarse pointers (`TOUCH_TARGET_CLASS`, an invisible `::after`); a tap on a control's visible face always reaches that control, never a tight neighbour. Their look and mouse layout do not change.
