---
'agents-kit-svelte': minor
---

Settings shared layer and primitive additions.

- New entry point `agents-kit-svelte/settings` (also re-exported from the root) with the Settings collection's shared layer: `InstantSetting` and its rune-free `InstantCore`/`UndoSlot`, `SettingsDraft` with `readDefaults`, `diffForm` and `describeChanges`, locks (`pickLock`, `lockAttrs`, `lockReasonText`, `LOCK_ICONS`, `LOCK_LABELS`), `searchSettings`, `filterSettingsLinks`, `toPaletteCommands`, focus helpers, `CopyState`, `ReadyGate`, `matchesPhrase`/`phrasePattern`, the class recipes (`SETTINGS_CONTAINER`, `CQ`, `RECIPES`, `actionButtonProps`), the contexts and the shared types. Sample data is in `agents-kit-svelte/fixtures`.
- `FormSubmit`, `FormResult`, `FormSubmitHandler`, `FormSubmitContext` and `FormSubmitOptions` move from Auth to the Primitives (`agents-kit-svelte/primitives`). `AuthSubmit`, `AuthResult`, `AuthSubmitHandler`, `AuthSubmitContext` and `AuthSubmitOptions` stay as aliases and behave exactly as before. After a failed submit, focus goes to `[data-form-error]` as well as `[data-auth-error]`.
- `readText` and `readCheck` are also exported from the Primitives, with the new `readBoolean` (a hidden `false` plus a checkbox `true`; the last value wins).
- `Field`: `FieldState` gains `describedBy` (extra describing ids, joined by `fieldControlAttrs`), and `createFieldState` builds Field's state with Field's id scheme for custom layouts. `setFieldContext` and `joinIds` are exported. Field itself renders and behaves as before.
- `Button`, `IconButton`, `Switch` and `Checkbox` get a 44px touch target on coarse pointers (`TOUCH_TARGET_CLASS`, an invisible `::after`); their look and mouse layout do not change.
