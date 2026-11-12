# Settings conventions

The Settings collection draws settings areas: layout, navigation, search, sections, rows, saving, confirmations, locks and settings controls. **It renders and reports intent only.** A component never fetches, persists, generates a secret, holds a snapshot of app data, or navigates on its own; your app does. No product nouns appear in components, defaults, demos or fixtures: product words come in through `labels`.

Everything in `docs/primitives/CONVENTIONS.md` and `docs/auth/CONVENTIONS.md` applies too. Settings components are built from the Primitives and the headless layer, never from new hand-rolled controls. `docs/settings/DESIGN.md` describes each component; where it disagrees with this file, this file wins.

## Groups and the shared layer

- Four groups, one folder each: `shell`, `rows`, `save`, `controls` under `src/lib/settings/`. A group imports only `src/lib/settings/shared/`, the Primitives, the headless layer and `src/lib/ui`/`src/lib/core`. **A group never imports another group's `.svelte` file** (or anything else in another group's folder). `tests/settings-shared.test.ts` enforces this.
- The shared layer is `.ts` and `.svelte.ts` only, never `.svelte`. No private helper `.svelte` files anywhere: every `.svelte` file is a public component with one catalogue entry and one demo.
- A group owns its `index.ts`, `src/site/catalog/settings-<group>.ts`, `src/site/demos/settings-<group>.ts`, its demo components, its tests and its changeset. Nothing else is shared, so groups never touch the same file.
- Something two groups need goes in the shared layer, through the controller. Do not copy it.

### Where things live

| Need | Use | File |
|---|---|---|
| Cross-group types (`SettingLock`, `SettingsAction`, `SettingsResult`, `SettingsHandler`, `SettingsChange`, ...) | import the type | `shared/types.ts` |
| Instant model | `InstantSetting` (runes); rules in `InstantCore`, `UndoSlot` | `shared/instant.svelte.ts`, `shared/undo.ts` |
| Reading a callback's result | `readResult` (the only reader: `{error}`, `{errors}` and any `{conflict}` fail); `SettingsHandlerRun` for one button's callback; `toFormResult` for a callback submitted through `FormSubmit`. `tests/settings-shared.test.ts` fails a component that runs a callback without one of them | `shared/undo.ts`, `shared/run.svelte.ts` |
| Staged model | `SettingsDraft`; pure `readDefaults`, `diffForm`, `describeChanges`, `adoptCurrentAsDefaults` | `shared/staged.svelte.ts`, `shared/diff.ts` |
| Locks | `pickLock`, `lockAttrs`, `lockReasonText`, `LOCK_PRECEDENCE`, `LOCK_LABELS`; `LOCK_ICONS` | `shared/lock.ts`, `shared/lock-icons.ts` |
| Contexts | `set/getSettingsScope`, `set/getSettingsDraft`, `set/getSectionContext` | `shared/context.ts` |
| Not-yet-hydrated gate | `ReadyGate` | `shared/ready.svelte.ts` |
| Search | `searchSettings`, `filterSettingsLinks`, `toPaletteCommands`, `highlightSegments` | `shared/search.ts` |
| Focus | `rememberOpener`, `openerFor`, `restoreFocus`, `nextFocusAfterRemoval`, `focusIndexAfterRemoval`, `firstInvalidControl` | `shared/focus.ts` |
| Dev-only warnings | `isDev()` (esm-env's `DEV`; never `import.meta.env`) | `shared/env.ts` |
| Copy | `CopyState` (over `copyText` in `src/lib/ui/clipboard.ts`) | `shared/copy.svelte.ts` |
| Typed confirmation | `matchesPhrase`, `phrasePattern` | `shared/confirm.ts` |
| Layout and look | `SETTINGS_CONTAINER`, `CQ`, `RECIPES`, `actionButtonProps` | `shared/recipes.ts` |
| Form submit (non-staged forms) | `FormSubmit`, `readText`, `readCheck`, `readBoolean` | `src/lib/primitives/form/submit.svelte.ts`, `form-data.ts` |
| Field wiring without Field's layout | `createFieldState`, `setFieldContext`, `fieldControlAttrs` | `src/lib/primitives/form/field.ts` |
| Promise check | `isThenable` | `src/lib/core/promise.ts` |
| Touch targets | built into `Button`, `IconButton`, `Switch`, `Checkbox` (`TOUCH_TARGET_CLASS`) | `src/lib/ui/styles.ts` |

Routing is the app's: there is no route helper. Components take `href` and `closeHref` strings; legacy redirects and `?dialog=` parsing stay in the app.

## Change models

Each setting uses exactly one, chosen by the app.

- **Instant**, for view preferences and reversible toggles.
  - A control with `onCommit` outside a SettingsForm runs `InstantSetting`. Show `instant.current`; mirror `instant.committed` (never `current`) into a bindable prop.
  - Only the newest change settles. A failure reverts and shows `instant.error ?? labels.failed` ("Couldn't save. Changed back."), never thrown text. `saved` shows for 2s. One Undo, superseded by any later change; undo makes no new undo point. A second change while pending is allowed (newest wins), not queued.
  - Given `action`, the control also renders a small `<form method="post">` with an Apply button that hides once ready. A switch posts a hidden `false` plus a checkbox `true`; the server reads it with `readBoolean`.
- **Staged**, for anything that changes policy, access or shared behaviour.
  - Controls sit inside SettingsForm and are uncontrolled (`defaultValue`, `defaultChecked`), so input typed before hydration is kept. `onCommit` is ignored there, with a dev warning.
  - `getSettingsDraft()` being defined means staged mode: drop your own mini-form and Apply button, never call `InstantSetting`. Never mix instant controls inside a SettingsForm.
  - A row with `name` calls `draft.register({ name, label, format })` and unregisters on destroy; dirty state and "was X" come from `draft.isDirty(name)` and `draft.previous(name)`.
  - SaveBar owns Save (submit) and Discard (`type="reset"`). Success makes the current values the new defaults; a conflict keeps the draft.
- **Confirmed**, for irreversible actions or ones that affect other people.
  - Always a ConsequenceDialog route (`?dialog=`), opened by a link and closed by `closeHref`. Typed confirmation (`phrasePattern` on the input, `matchesPhrase` in code) only for unrecoverable data loss; the server checks the phrase again.
  - One filled danger button, on the final step only. The footnote says whether the action can be undone.
- **Locked or managed.**
  - A lock comes from `lock` on a row, a section or the page scope; the strongest wins: `pickLock(row.lock, scope?.lock?.lock)`, nearest first. A row passes the lock that applies to it on to its control as the settings scope, so a control inside reads it the same way.
  - A locked control is natively `disabled` and described (`aria-describedby`) by its reason, which is always visible text (never a tooltip only). Use `lockReasonText(lock, labels)` for the sentence and `LOCK_ICONS[lock.kind]` for the icon.
  - A way forward is `lock.action` or LockReason `onRequest`. "Managed elsewhere" values use SettingsFacts `source`, not a disabled input.
  - Never use `softDisabled` on a form control for a lock. `softDisabled` is for buttons whose action is unavailable (`actionButtonProps` sets it).

## No JavaScript first

- Navigation, filters, search, dialog open and close, attention and danger actions are `<a href>` or GET forms.
- Every mutation is a native post, cancelled only when a handler exists.
- Never nest forms: components detect the SettingsDraft context and drop their own form.
- Pending submits are ignored, not queued.
- `ReadyGate` (or `getSettingsScope()?.ready()`) holds back only JS-only affordances: copy, reveal, a matrix column toggle, an instant control with no `action`, and an action that only calls back (`onSelect` with no `href` or form `intent`: pass `{ ready }` to `actionButtonProps`, which soft-disables it until then). A control with a native fallback is never disabled by it.

## Callbacks

- `onSubmit(values, ctx)` for a form's main submit, `onCommit(value)` for instant controls, `onConfirm(ctx)` for confirmations. Everything else is `on<Intent>`: `onUndo`, `onRequest`, `onCancelRequest`, `onResend`, `onDismiss`, `onCopy`, `onAction`, `onReviewConflict`.
- A callback may return nothing, a `SettingsResult`, or a promise of either (type it `SettingsHandler<[...]>`). The owning button shows `loading` until the promise settles (`isThenable`). Read the result with `readResult`, never by hand: `{error}`, `{errors}` and `{conflict}` (with or without a message) are failures and their text is shown; a rejection shows the generic label.
- `InstantSetting.undo()` resolves false when it could not undo (nothing current, or the undo failed). An `onUndo` built on it passes that on as a failure (`{ error }`), so ChangeNotice never says "Undone" for an undo that failed.
- Status is announced politely through one sr-only `role="status"` per row or bar. Form errors use `role="alert"`, carry `data-form-error` and `tabindex="-1"`, and receive focus.

## Status words

- `idle | pending | saved | error | conflict` (`SettingStatus`) everywhere.
- A failure always says what happened to the value ("Changed back").
- Pending never shows success. Waiting for approval elsewhere is RequestedChange, never "saved".

## Words

- Composites take one `labels: Partial<XLabels>` with English defaults; values and counts are functions (`count(n)`, `was(v)`, `typeToConfirm(p)`, `copyFor(label)`). Short components may use separate `*Label` props. `XLabels` stays with its component and is exported.
- `label` names a control or item, `description` is help text (never hint or subtitle), `title` names a section or dialog.
- `tone: UiTone` carries meaning; `variant` and `layout` carry shape. `headingLevel` is a prop everywhere a heading is drawn.
- No brand logos: take an `icon` component (`SettingsIcon`).
- Do not name a constant `DEFAULT_*` in a `.svelte` file: `tests/component-contract.test.ts` treats that as demo data. Name word defaults by what they are (`LOCK_LABELS`).

## Layout and accessibility

- Container queries only, against the `settings` container (`SETTINGS_CONTAINER` on SettingsLayout's root). Use only the `CQ` breakpoints, written out literally so Tailwind finds them: `@lg/settings:` (rows inline) and `@3xl/settings:` (wide), or their `@max-` forms. No viewport breakpoints (`md:`), no `@media` width queries, no twin DOM. The shared tests enforce this.
- Semantic tokens only, never hex values. Build on `RECIPES` (`section`, `sectionHeader`, `sectionFooter`, `danger`, `list`, `row`, `rowStaged`, `note`, `iconTile`) instead of restating them.
- Render a `SettingsAction` with `<Button {...actionButtonProps(action, reasonId, { ready })}>`, and show `action.unavailable` as visible text at `reasonId`. Pass `inForm: false` when you know no form will post an `intent`.
- Semantics: sections are `<section aria-labelledby>`; rows are `<li>` in `<ul role="list">`; facts are `<dl>`; meters are `role="meter"`; results are `role="status"` and errors `role="alert"`; consequence tones carry sr-only prefixes, so meaning never rests on colour or icon alone.
- A kit control inside a row keeps one label and is described by the row's description, status and lock reason: provide Field context with `createFieldState({ id, describedBy: () => [statusId, reasonId] })`.
- Touch targets come from the primitives. Do not add your own hit-area padding.
- Insets: a row (`RECIPES.row`) brings its own `px-4`. Everything placed in a `list={false}` SettingsSection (SettingsFacts, UsageMeter, CopyValue, NotificationMatrix, ConsequenceList, LockReason) brings none: the caller wraps the block in one padded box (`px-4 py-3`), so labels line up with the header and with each other.
- Focus: after a removal, `nextFocusAfterRemoval` (next, previous, then the heading). A route dialog marks its opener with `rememberOpener(key)` and returns focus with `restoreFocus(openerFor(key), fallback)`.

## Structure

- One root element with `{...rest}`; `class` merged last via `cn()`; `ref` on the focusable element.
- `export interface Props`, re-exported from the group's `index.ts` as `XProps`.
- Component names are Settings-prefixed or specific, and must not collide with the kit's flat root exports.

## Tests, catalogue and demos

- Pure logic goes in a leaf `.ts` file (type-only imports, no runes, no extensionless imports of other `src/lib` files) so `node --test` can import it with an explicit `.ts` path. Relative imports inside `src/lib` never carry a `.ts` extension.
- Each component gets one catalogue entry (category `'Settings'`, usage snippet of at least 6 lines that type-checks against the package) and one demo keyed by its slug, in the group's own files.
- Demos and tests use `src/lib/fixtures/settings.ts` (neutral, fictional data) or their own neutral data. Components never import fixtures.
- Browser tests run against the production build; every new catalogue entry must be clean in the a11y ratchet in light and dark.
