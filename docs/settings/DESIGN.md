> **Controller amendments (binding, win over the text below):**
> - `routes.ts` / `createSettingsRoutes` is cut. Routing, legacy redirects and `?dialog=` parsing belong to the app; components only take `href`/`closeHref` strings.
> - Trailside product words never appear in components, defaults, demos or fixtures.
> - Groups never import another group's `.svelte` file; they import only `src/lib/settings/shared/` and existing Primitives/headless.

# Settings collection (agents-kit-svelte) — collection spec

## 1. Purpose

Generic, reusable settings containers and controls for Svelte 5 apps. They should be good enough that a real product settings area can delete its hand-built parts; Trailside is the reference adopter. The collection is organised around two ideas:

1. **The skeleton is the product.** Every settings page is composition:
   `SettingsLayout > SettingsPage > SettingsForm? > SettingsSection > SettingsRow{control}`.
   There is one DOM tree per component, and layout responds to container queries, never to duplicated desktop/tablet/phone markup.
2. **A setting changes in exactly one of four ways.** Each way lives in the shared layer, so no group invents its own:
   - **Instant**: `InstantSetting` applies the change optimistically, reverts on failure and offers one-level Undo with an ownership token.
   - **Staged**: `SettingsDraft` diffs a real `<form method="post">` against its server-rendered defaults (or takes a controlled change list). Save posts a revision; a stale revision returns a conflict; Discard is a native reset.
   - **Confirmed**: `ConsequenceDialog` reviews consequences, optionally requires a typed phrase or reassignments, and posts a form.
   - **Locked or managed**: `SettingLock`, whose kinds are permission, plan, managed, inherited, readonly, unsupported and awaiting-approval, gives a visible reason and an optional way forward.

Components render and report intent only. They never fetch, persist, generate secrets, hold snapshots or navigate on their own. No product nouns appear in components or defaults.

There are 22 components in 4 groups. Each group is one builder working in its own folder, `src/lib/settings/<group>/`, and depends only on the shared layer and existing primitives. No group imports another group's `.svelte` file.

| Group | Folder | Components |
|---|---|---|
| shell | `src/lib/settings/shell/` | SettingsLayout, SettingsNav, SettingsPage, SettingsSearch\*, AttentionList |
| rows | `src/lib/settings/rows/` | SettingsSection, SettingsRow, SettingsFacts, SettingsToggle, RequestedChange\*, LockReason\* |
| save | `src/lib/settings/save/` | SettingsForm (leave guard\*), SaveBar, ChangeNotice, ConflictResolver\*, ConsequenceList, ConsequenceDialog |
| controls | `src/lib/settings/controls/` | ChoiceCards, NotificationMatrix\*, SettingsItemList, UsageMeter, CopyValue |

\* = an idea Trailside does not have today:

- **SettingsSearch**: the canvas draws a Cmd-K box, but it is a stub.
- **LockReason**: Trailside shows locks as styling only, with no request-access path.
- **RequestedChange**: the requested-versus-effective state is drawn but static.
- **ConflictResolver**: canvas AppEditConflict was never built for settings.
- **NotificationMatrix**: today it is two separate lists, not a grid.
- **SettingsForm leave guard**: Settings has no beforeNavigate guard.

Partly new: UsageMeter thresholds, limits and role=meter (Trailside meters are decorative `<i>`), AttentionList dismissal, and CopyValue's show-once masked mode.

## 2. Shared layer (built by the controller before the groups fork)

The shared layer is plain `.ts` and `.svelte.ts` only, with no `.svelte` files, because of the 1-to-1 catalogue rule. The TypeScript sketch is in `sharedLayerSketch`. Contents:

1. **Promotions out of Auth (additive, with aliases kept):**
   - `FormSubmit`, `FormResult`, `FormSubmitHandler` and `FormSubmitContext` move to `src/lib/primitives/form/submit.svelte.ts`. `AuthSubmit` and `AuthResult` are re-exported as aliases, and the focus target gains `[data-form-error]` while keeping `[data-auth-error]`.
   - `readText`, `readCheck` and the new `readBoolean` go in `form-data.ts`.
   - `copyText` moves to `src/lib/ui/clipboard.ts`.
   - `isThenable` moves to `src/lib/core/promise.ts`.
2. **Field.** Add `describedBy?: string[]` to `FieldState`, joined by `fieldControlAttrs`, and export `createFieldState(opts)`. Rows can then provide Field context with the same id scheme without Field's stacked layout. Kit controls inside a row keep one label and are described by the row description, status and lock reason.
3. **Coarse-pointer hit areas.** Button, IconButton, Switch and Checkbox below md size get a `pointer-coarse:` pseudo-element extender, giving a 44px target with an unchanged face. No settings component re-implements this.
4. **`types.ts`.** All cross-group types: `SettingStatus`, `SettingLock`, `SettingsAction`, `SettingsLink`, `SettingsNavGroup`, `SettingsSearchEntry`, `SettingsFieldDescriptor`, `SettingsChange`, `SettingsConflict`, `ConflictField`, `SettingsResult`, `SettingsHandler`, `ConsequenceItem`, `ConsequenceGroup`, `ReassignSpec`, `AttentionItem`, `ChoiceOption`, `SettingsFact`, `SettingsItem`, `SettingsItemAction`, `MeterSegment`. Each component's `XLabels` type stays with the component.
5. **`staged.svelte.ts`.** `SettingsDraft`, the only staged model:
   - Dirty state comes from `diffForm` (current FormData against defaultValue/defaultChecked/defaultSelected) or from a controlled `changes` list.
   - Change text comes from field descriptors `{name, label, format}`.
   - It handles revision, result, conflict and status, records the last edited control, and runs `guard` (request, decide, beforeunload).
   - Pure helpers: `readDefaults`, `diffForm`, `describeChanges`.
6. **`instant.svelte.ts` + `undo.ts`.** `InstantSetting<T>`, the only instant model:
   - Optimistic `current`.
   - A generation counter so only the newest `set()` settles.
   - Revert to the last committed value on `{error}` or a rejection, showing the generic label and never the thrown text.
   - `saved` for 2s, then idle.
   - One `UndoSlot` token, invalidated by any later `set()`; undo does not create an undo point.
7. **`lock.ts`.** `pickLock` with a fixed precedence, `lockAttrs` (native `disabled` plus `aria-describedby` to the reason id), `LOCK_ICONS` and `DEFAULT_LOCK_LABELS`.
8. **`context.ts`.**
   - `SettingsScope {ready, lock}`, set by SettingsLayout, SettingsPage `scope` and SettingsSection `lock`.
   - `SettingsDraft` context, set by SettingsForm. Its presence switches controls to staged mode and suppresses nested mini-forms.
   - `SectionContext {depth, headingLevel, layout}` for nesting.
9. **`ready.svelte.ts`.** `ReadyGate` is false on the server and true after mount. Rule: only JS-only affordances (copy, reveal, matrix column toggle, instant controls with no `action`) wait for it. Controls with a native fallback are never disabled by it.
11. **`search.ts`.** `filterSettingsLinks`, `searchSettings` (rank: label prefix, then word, then keyword, then description; returns highlight ranges) and `toPaletteCommands`.
12. **`focus.ts`.** `rememberOpener`, `restoreFocus` (first connected, visible candidate via checkVisibility) and `nextFocusAfterRemoval`.
13. **`copy.svelte.ts`.** `CopyState` (idle/copied/failed) over `copyText`.
14. **`confirm.ts`.** `matchesPhrase` and `phrasePattern` (an escaped regex for native `pattern=`, so typed confirmation is gated without JS).
15. **`recipes.ts`.**
    - `SETTINGS_CONTAINER` (`@container/settings`, inline-size) and one `CQ` breakpoint set.
    - Class recipes `section`, `sectionHeader`, `sectionFooter`, `danger`, `row`, `rowStaged` (accent-subtle tint plus inset accent bar), `note` and `iconTile`, all on semantic tokens.
    - `actionButtonProps(action, reasonId)`, so every group renders a `SettingsAction` identically without a helper `.svelte`.
16. **Wiring:**
    - Per-group `index.ts` files, `src/lib/settings/index.ts`, `src/lib/entries/settings.ts`, the root export, the `package.json` `./settings` subpath, the smoke-install import, README rows, and one changeset per group.
    - Catalogue files `src/site/catalog/settings-<group>.ts` with the `Settings` CatalogCategory, demos `src/site/demos/settings-<group>.ts`, and the `Settings` chip in `src/routes/+page.svelte`.
    - Required test edits: the demo filter in `tests/svelte5-audit.test.ts` accepts `settings-`, and `src/lib/settings/` is added to `NO_DEMO_DEFAULTS`.
    - Neutral fixtures in `src/lib/fixtures/settings.ts`.
    - `docs/settings/CONVENTIONS.md`.
    - `tests/settings-shared.test.ts` (node:test, explicit `.ts` imports).

## 3. Conventions (docs/settings/CONVENTIONS.md; extends docs/primitives and docs/auth)

**Change models.** One per setting, chosen by the app.

- **Instant**:
  - Use for view preferences and reversible toggles.
  - A control with `onCommit` outside a SettingsForm runs `InstantSetting`.
  - Given `action`, it also renders a small `<form method="post">` with an Apply button that hides once ready. A switch posts a hidden `false` plus a checkbox `true`, and the server uses `readBoolean`.
- **Staged**:
  - Use for anything that changes policy, access or shared behaviour.
  - Controls sit inside SettingsForm and are uncontrolled (`defaultValue`/`defaultChecked`), so hydration never drops input. `onCommit` is ignored there, with a dev warning.
  - SaveBar owns Save (submit) and Discard (reset).
  - Never mix instant controls inside a SettingsForm.
- **Confirmed**:
  - Use for irreversible or other-people-affecting actions.
  - Always a ConsequenceDialog route (`?dialog=`), opened by a link and closed by `closeHref`.
  - Typed confirmation only for unrecoverable data loss.
  - A single filled danger button, on the final step only. The footnote says whether the action can be undone.
- **Locked**:
  - Locks come from `lock` on a row, section or page scope; the strongest wins via `pickLock`.
  - A locked control is natively `disabled`, and its reason is always visible text (never tooltip-only) linked by `aria-describedby`.
  - A way forward is `lock.action` or LockReason `onRequest`.
  - "Managed elsewhere" values use SettingsFacts `source`, not a disabled input.

**No-JS first.**

- Navigation, filters (GET), search (GET), dialog open and close, attention and danger actions are `<a href>` or GET forms.
- Every mutation is a native post, cancelled only when a handler exists.
- Never nest forms: components detect SettingsDraft context and drop their own form.
- Pending submits are ignored, not queued.

**Callbacks.**

- `onSubmit(values, ctx)` is for a form's main submit, `onCommit(value)` for instant controls, and `onConfirm(ctx)` for confirmations. Everything else is `on<Intent>`: onUndo, onRequest, onCancelRequest, onResend, onDismiss, onCopy, onAction, onReviewConflict.
- A callback may return void, a `SettingsResult` or a promise of either. The owning button loads until the promise settles. `{error}` and `{errors}` are shown; a rejection shows the generic label.
- Status is announced politely through one sr-only `role=status` per row or bar. Form errors use `role=alert` and receive focus.

**Status vocabulary.**

- `idle | pending | saved | error | conflict` everywhere.
- A failure always says what happened to the value ("Changed back").
- Pending never shows success. Waiting for approval elsewhere is RequestedChange, never "saved".

**Words.**

- Composites take one `labels: Partial<XLabels>` with English defaults, using functions for counts and values (`count(n)`, `was(v)`, `typeToConfirm(p)`, `copyFor(label)`). Short components may use separate `*Label` props.
- `label` names a control or item, `description` is help text (never hint or subtitle), and `title` names a section or dialog.
- `tone: UiTone` carries meaning; `variant`/`layout` carry shape.
- `headingLevel` is a prop everywhere.
- No brand logos: take an `icon` component.

**Layout and accessibility.**

- Container queries only, via the shared `CQ` set. No viewport media queries and no twin DOM.
- Semantic tokens only, no hex values.
- Semantics:
  - Sections are `<section aria-labelledby>`.
  - Rows are `<li>` inside `<ul role="list">`.
  - Facts are `<dl>`.
  - Meters are `role="meter"`.
  - Results are `role="status"` and errors `role="alert"`.
  - Consequence tones carry sr-only prefixes, so meaning never rests on colour or icon alone.

**Structure.**

- One root element with `{...rest}` and `class` merged last via `cn()`. `ref` is on the focusable element.
- `export interface Props`, re-exported as `XProps`.
- No private helper `.svelte` files.
- Component names are Settings-prefixed or specific, and were checked against the kit's current flat exports: no collisions.

## 4. Components

### Group: shell (`src/lib/settings/shell/`)

#### 1. SettingsLayout
- **Purpose.** The whole settings area.
  - A wide container shows the rail plus the page.
  - A narrow container in index mode shows the grouped index (with an attention slot on top); in section mode it shows the page alone, with the page's back link.
  - Sets `SETTINGS_CONTAINER` and the `SettingsScope` (ready gate).
  - Renders SettingsNav once.
- **Props.**
  ```ts
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>,'class'|'children'> {
    groups: SettingsNavGroup[]; current?: string | null;  // null/undefined + narrow => index mode
    mode?: 'auto'|'section'|'index';
    children?: Snippet;            // the page (usually SettingsPage)
    navHeader?: Snippet; navFooter?: Snippet; attention?: Snippet;   // attention shown atop the index
    filter?: { name?: string; value?: string; action?: string } | false;
    railWidth?: 'sm'|'md'; ready?: boolean;
    labels?: Partial<SettingsLayoutLabels>; class?: string }
  ```
- **Reports.** Nothing. The app owns routing, lazy section loading (it passes the loaded component as `children`), and `<title>`. An extra page such as an audit log is rendered with `current` set to its parent section.
- **States.** Wide; narrow-index; narrow-section; filtered; empty filter; not-ready versus ready.
- **Built from.** The SettingsNav markup inside the same group, `SETTINGS_CONTAINER`/`CQ`, ReadyGate and `setSettingsScope`.
- **Replaces in Trailside.**
  - The SettingsView.svelte shell (template ~L336-420, styles L484-559: three breakpoint ladders and hard-coded `#E6EAF0`/`#F8FAFF`/`#FBFCFD`).
  - The SettingsIndex standalone page shell.
  - The audit-log `content`/`pageTitle` override.
  - CLIENT_READY_CONTEXT usage inside settings.
- **Demo.** A resizable frame at 360, 900 and 1300px showing index mode, section mode and the filter with no match.
- **Tests.**
  - Browser: no horizontal scroll at 360px; rail hidden and index shown at narrow width with `current` null; `aria-current` present.
  - Pure: `filterSettingsLinks` in the shared tests.

#### 2. SettingsNav
- **Purpose.** Grouped links with `aria-current`, an icon, a count badge, an unsaved dot, a lock mark, a disabled item with its reason, and a GET filter. It has `variant` `rail` (compact) or `index` (44px inset rows with icon tile, meta and chevron, two-up optional). It also covers the old SettingsIndex.
- **Props.**
  ```ts
  { groups: SettingsNavGroup[]; current?: string|null; variant?: 'rail'|'index'|'auto'; columns?: 1|2;
    title?: string; description?: string; filter?: {...}|false; onFilterChange?: (q: string)=>void;
    footer?: Snippet; top?: Snippet; headingLevel?: 2|3;
    labels?: Partial<SettingsNavLabels> /* nav, filter, clear, noMatch(q), unsaved, locked, badge(n) */ }
  ```
- **Reports.** Navigation only. The filter submits `?q=`; with JS, `onFilterChange` filters in place.
- **States.** Current (inset accent bar); hover/focus; badge; dirty dot with sr-only text; lock mark; disabled item rendered as non-focusable text plus reason; filtered; no match with a Clear link; rail versus index.
- **Built from.** Plain nav/ul/a, Badge, Input type=search inside a GET form, Button (Clear as href), `filterSettingsLinks`.
- **Replaces in Trailside.**
  - SettingsNav.svelte (reads stores, uses SECTION_ICONS string casts).
  - SettingsIndex.svelte (hard-coded two-up labels and a fixed group tuple).
  - The duplicated staged-count computation in both.
  - The `.lbk` footer.
- **Demo.** Rail and index side by side from the same `groups`, with dirty dots and a lock mark.
- **Tests.** Browser: the filter works with JS off (GET round trip); exactly one `aria-current`; disabled items are not focusable.

#### 3. SettingsPage
- **Purpose.** The page frame. It contains:
  - A back link, shown only in a narrow container.
  - A breadcrumb for sub-pages.
  - An icon tile, h1/h2, badges, a one-sentence lead and trailing actions.
  - An optional non-dismissible `scope` note (test mode, preview, read-only, sample) that can also lock the subtree.
  - A banner slot, a body with max-width and rhythm, and a footnote.
- **Props.**
  ```ts
  { title: string; lead?: string|Snippet; icon?: Component; badges?: Snippet; actions?: Snippet;
    backHref?: string; breadcrumb?: { label: string; href?: string }[];
    scope?: { label: string; description?: string|Snippet; tone?: 'neutral'|'accent'|'warning'; actions?: SettingsAction[] /* max 2 */; lock?: SettingLock };
    banner?: Snippet; footnote?: string|Snippet; footnoteIcon?: 'info'|'lock'|'none';
    width?: 'md'|'lg'|'full'; headingLevel?: 1|2; children: Snippet; labels?: Partial<SettingsPageLabels> }
  ```
- **Reports.** Nothing. Scope actions are links or posts. `scope.lock` sets the scope context, so every row inside is locked.
- **States.** With or without back link; sub-page with breadcrumb; scope inline, informational or locking; footnote.
- **Built from.** Breadcrumb, Badge, Button (href), Alert (scope note; no live region, no dismiss), `setSettingsScope`, RECIPES.note.
- **Replaces in Trailside.**
  - `.sv-head`/`.sv-title`/`.sv-lead`/`.sv-main` and the `.sv-sample-chip`.
  - SettingsSampleControls.svelte (three breakpoint copies, the `only` prop, the BAR_SECTIONS hack).
  - IntegrationFrame breadcrumb, back and header.
  - The five footnote classes (`.nt-foot`, `.sv-foot`, `.sharing-note`, `.sgs-foot`, `.about-note`).
- **Demo.** A plain page; a sub-page with breadcrumb; a page with a locking "Read-only for your role" scope and a "Request access" action.
- **Tests.** Browser: the back link is visible only at narrow width; a scope lock disables a nested Switch and links it to the reason via `aria-describedby`.

#### 4. SettingsSearch (new)
- **Purpose.** Search individual settings, not just sections. Results show the matched text in `<mark>`, the section each result lives in, and a deep link to the row anchor. Variants are `inline` (top of the rail or index) and `page` (a results page). The same index can feed CommandPalette for Cmd-K.
- **Props.**
  ```ts
  extends Omit<HTMLFormAttributes,'class'|'children'> { entries: SettingsSearchEntry[]; value?: string /*bindable*/; defaultValue?: string;
    name?: string /*'q'*/; action?: string; limit?: number; variant?: 'inline'|'page';
    onValueChange?: (q)=>void; onSelect?: (e: SettingsSearchEntry)=>void; ref?; labels?: Partial<SettingsSearchLabels> /* label, placeholder, results(n), none(q), inSection(s), shortcut keys */ }
  ```
- **Reports.** `onSelect(entry)` with JS. Otherwise results are links and the form GETs `?q=`, and the server renders the same component with `value` set. The app builds entries from its registry plus one entry per row id; SettingsSection `id` is the anchor.
- **States.** Empty; typing; results with highlights; none; keyboard-highlighted result; page variant.
- **Built from.** Input type=search, Kbd, the headless ListNav for arrow navigation over result links, `searchSettings`, and `toPaletteCommands` for CommandPalette hosting.
- **Replaces in Trailside.** The "Search settings ⌘K" stub in `apps/web/src/routes/app/+layout.svelte` and the label-only `?q=` rail filter.
- **Demo.** Type "retention" and get a result in Data; Cmd-K palette built from the same entries.
- **Tests.**
  - Pure: ranking order, highlight ranges, case and diacritics, limit.
  - Browser: works with JS off; arrow keys move through results; Enter follows the link.

#### 5. AttentionList
- **Purpose.** A data-driven "needs attention" card: a count derived from the items, and per item a tone icon tile, a label, one line and an action. On wide containers it shows boxed cards; on narrow ones, whole-row links using the stretched-link overlay technique. Items can be dismissed.
- **Props.**
  ```ts
  { items: AttentionItem[]; title?: string; headingLevel?: 2|3; layout?: 'auto'|'cards'|'list';
    onDismiss?: (id: string)=>unknown; labels?: Partial<AttentionListLabels> /* title 'Needs attention', count(n), dismiss(label) */ }
  ```
- **Reports.** `action.href` or `onSelect`; `onDismiss(id)` (a promise puts the item in pending). The app decides what needs attention, for example from SettingsForm `onDirtyChange` across sections, RequestedChange statuses, or locks with requests.
- **States.** Root `hidden` at zero items; tones; cards versus list; dismissing; focus moves to the next item or the heading after a dismissal.
- **Built from.** RECIPES.section/sectionHeader, Badge (count), Button, IconButton, `nextFocusAfterRemoval`.
- **Replaces in Trailside.** `parts/NeedsYou.svelte` and the inline copy in SettingsIndex.svelte (`.wsx-*` versus `.cd`/`.nd`). This fixes the hard-coded `staged.length ? 2 : 1` count and the permanent "Connect GitHub" item.
- **Demo.** Three items at two widths; dismiss one.
- **Tests.** Browser: count equals `items.length`; whole row clickable without nested interactive elements (axe nested-interactive rule clean); focus after dismissal.

### Group: rows (`src/lib/settings/rows/`)

#### 6. SettingsSection
- **Purpose.** The base container: a card whose header carries a title, description, count pill, status badge and trailing actions. Its flush `<ul role=list>` body is owned by the rows. Also:
  - An optional footer strip (SaveBar footer, an add row) and a footnote below the card.
  - A danger tone, for a danger zone placed last on the page.
  - A `lock` that applies to the whole section.
  - An `aside` explainer that sits beside the card when wide and below it when narrow.
  - `layout='columns'`, which lays nested sections side by side.
  - Nested inside another section (detected via SectionContext), it renders as a sub-group `<li>` with a sub-header instead of a card.
- **Props.**
  ```ts
  extends Omit<HTMLAttributes<HTMLElement>,'class'|'children'|'title'> { title: string; description?: string|Snippet; id?: string;
    headingLevel?: 2|3|4; count?: string|number; status?: { label: string; tone?: UiTone; dot?: boolean };
    actions?: Snippet; tone?: 'default'|'danger'; lock?: SettingLock; layout?: 'rows'|'columns';
    children: Snippet; empty?: Snippet; footer?: Snippet; note?: string|Snippet; noteIcon?: 'info'|'lock'|'none';
    aside?: Snippet; asideTitle?: string; asideWidth?: 'sm'|'md'; class?: string }
  ```
- **Reports.** Nothing. With `lock`, it sets the scope lock and renders one LockReason-equivalent line in the header using the shared lock helpers.
- **States.** Default; danger; locked; empty; with count, status or actions; columns versus stacked; nested group; aside beside or below.
- **Built from.** RECIPES, Badge, `setSectionContext`, `setSettingsScope`, `lockReasonText`/`LOCK_ICONS`.
- **Replaces in Trailside.**
  - `.wsx-card`/`.wsx-h`/`.wsx-n`/`.wsx-2`/`.wsx-s`/`.wsx-life`, re-declared in about 11 section files.
  - `.e2-card`/`.t-cd`/`.p-cd`, `.cd`/`.cd-h`/`.ft`, the `.cmx-card` header and strip.
  - `.nt-two`/`.nt-col` and the `display: contents` hack.
  - `.sa-sub` invite sub-headers.
  - The danger zones `.apz-dz` and `.wsx-lr`.
  - The 240px asides with viewport breakpoints 1299.98/1199.98/767.98.
- **Demo.** A plain section; count plus header link; a danger zone; a locked section; two nested columns; a main card plus a "What the switch does" aside.
- **Tests.**
  - Browser: `aria-labelledby` resolves; a nested section renders an `<li>` with heading level plus one; the aside stacks at narrow width.
  - Axe: danger header contrast in both themes.

#### 7. SettingsRow
- **Purpose.** The deep row.
  - Label and description on the left; on the right, a control (any primitive, wired through Field context) or a read-only value; optional leading icon or avatar; trailing action(s).
  - Status: staged ("Unsaved", "was X", impact line), locked (reason plus optional fixed badge), pending, saved or error.
  - Inline on wide containers and stacked on narrow ones.
  - Optional narrow summary mode: show `summary` plus an Edit link instead of the control.
- **Props.**
  ```ts
  extends Omit<HTMLAttributes<HTMLLIElement>,'class'|'children'> { label: string|Snippet; description?: string|Snippet;
    name?: string;                         // inside SettingsForm: registers {label, format}; dirty/previous derived
    control?: Snippet<[FieldControlAttrs]>; value?: string|Snippet; mono?: boolean; leading?: Snippet;
    action?: SettingsAction|Snippet; actions?: SettingsAction[];     // >2 collapse to DropdownMenu
    status?: SettingStatus; error?: string; dirty?: boolean; previous?: string; impact?: string|Snippet;
    lock?: SettingLock; reasonId?: string; required?: boolean;
    format?: (raw: string|string[])=>string; layout?: 'auto'|'inline'|'stacked';
    summary?: Snippet; editHref?: string; labels?: Partial<SettingsRowLabels> /* unsaved, was(v), saving, saved, failed, edit */ }
  ```
- **Reports.** Nothing of its own. The control reports itself. Explicit `status`/`dirty` props win over context.
- **States.** Idle; staged (rowStaged tint, inset bar, tag, "was X", impact shown only while dirty); pending (Spinner, `aria-busy`); saved (polite); error (Field invalid); locked (`disabled` plus visible reason, optional badge replacing the control); read-only value; inline or stacked; summary mode.
- **Built from.** `createFieldState`/`setFieldContext`, Badge, Spinner, Button and DropdownMenu via `actionButtonProps`, `getSettingsDraft`, `pickLock`/`lockAttrs`.
- **Replaces in Trailside.** The six-plus row vocabularies:
  - `.wsx-r`/`.wsx-l`/`.wsx-v`/`.wsx-a` (including the inline-edit Name row; the "Edit" becomes a real input in a SettingsForm).
  - `.nt-r`/`.st-un`, `.ap-r`/`.ap-l`, `.sgs-q`, `.spe-r` with was→.
  - Retention select rows with "was 90 days" and the fixed audit row.
  - The Retention `.live`/`.summary` twin DOM.
  - Limits rows "was N".
  - Per-section staged tints `#F8FAFF`/`#93B4F5`.
  - The row half of `Unavailable.svelte`.
- **Demo.** Rows holding Switch, NativeSelect, Input with a suffix, a read-only mono value, a locked row with "Request access", a staged row with "was 90 days" and an impact line, and narrow summary mode.
- **Tests.** Browser:
  - A Switch inside has exactly one accessible name and is described by description, status and lock reason.
  - With JS off inside a SettingsForm the control posts.
  - The staged marker appears after editing.

#### 8. SettingsFacts
- **Purpose.** Read-only key/value facts as a `<dl>`. Each fact can carry:
  - a mono value, a tone dot and a detail line;
  - a "managed elsewhere" `source` caption ("Set by provider");
  - an inline copy action and one row action;
  - a `compactValue` for narrow containers.
  Layout is `rows` or a `grid` of 2-3 tiles.
- **Props.**
  ```ts
  { items: SettingsFact[]; layout?: 'auto'|'inline'|'stacked'|'grid'; onCopy?: (id, ok)=>void;
    labels?: Partial<SettingsFactsLabels> /* copy, copied, copyFailed, copyFor(label), managedIn(s) */ }
  ```
- **Reports.** `onCopy(id, ok)` after a local copy. Actions go through `href` or `onSelect`.
- **States.** Tone; mono; source; copied or failed (polite); unavailable action with reason; compact value; grid versus rows.
- **Built from.** CopyState, IconButton, Badge (dot), `actionButtonProps`.
- **Replaces in Trailside.**
  - `.wsx-r.kvr`; About `.e2-kv`/`.t-kv`/`.p-kv` (three trees from about-view).
  - SlackPage `.kvr` with phoneValue twins.
  - ComputerRows `.cmx-g` tiles with "Changed only in ..." footnotes.
  - ModelDialog read-only "Set by provider" fields.
  - About Copy-ID with ClipboardLike.
- **Demo.** A connection summary, a version block with a copyable ID, and device facts in a grid with sources.
- **Tests.** Browser: `<dl>` structure; copy announces; a failed copy shows fallback text; no secret in `data-*`.

#### 9. SettingsToggle
- **Purpose.** The most common setting: a boolean row.
  - **Instant by default.** Applies at once; shows pending, then saved or error; reverts on failure with Retry; offers Undo.
  - **Staged** when inside a SettingsForm.
  - **No-JS** via its own small post form with Apply when given `action`.
  - It can show a locked "Always on" pill in place of the switch.
- **Props.**
  ```ts
  extends Omit<HTMLInputAttributes,'class'|'children'|'type'|'checked'|'value'|'role'|'size'> { label: string; description?: string|Snippet;
    checked?: boolean /*bindable*/; defaultChecked?: boolean; name?: string;
    onCommit?: SettingsHandler<[boolean]>; onUndo?: SettingsHandler<[boolean]>; undoable?: boolean;
    action?: string; hidden?: Record<string,string>; stateText?: boolean|{ on: string; off: string };
    lock?: SettingLock; leading?: Snippet; ready?: boolean; ref?: HTMLInputElement|null;
    labels?: Partial<SettingsToggleLabels> /* on, off, apply, saving, saved, failed 'Couldn't save. Changed back.', retry, undo, undone */; class?: string }
  ```
  `...rest` goes on the input.
- **Reports.** `onCommit(checked)`, `onUndo(previous)` (default: `onCommit(previous)`). Staged: posts `name`. No-JS: posts `name=true|false`.
- **States.** On/off; pending (a second toggle is ignored); saved; error reverted with Retry; undo available until superseded; staged dirty; locked; always-on; not-ready (disabled only when it has no `action` and no form); no-JS Apply visible.
- **Built from.** Switch (labelFirst, role=switch), Button, Spinner, InstantSetting, UndoSlot, `getSettingsDraft`, `readBoolean` convention, the RECIPES.row layout. It composes SettingsRow from the same group.
- **Replaces in Trailside.**
  - `parts/SettingsSwitch.svelte` (hard-coded `#7B8490`).
  - ClickUpPage `.ig-tg`, phone `e-sw`, Notifications `.nt-dis` "Always on".
  - The DataSharing master toggle.
  - RepositoryRows "Agents can work here" (instant plus toast Undo).
  - The Appearance Motion row and its `:global(.st-sw)` hack.
  - Three switch implementations in all.
- **Demo.** Instant with a simulated 50% failure; inside a SettingsForm; JS-off Apply; Always on; locked by plan.
- **Tests.**
  - Pure (InstantSetting): a fast second toggle wins over a slow first; failure reverts; the undo token is superseded.
  - Browser: no nested form inside SettingsForm; JS-off post round trip.

#### 10. RequestedChange (new)
- **Purpose.** A change waiting for approval elsewhere: on a device, from an admin, or at a provider. It shows the effective value against the requested value, who it is waiting on, how long ago it was requested and optional instructions. It offers Cancel request and Send again. The outcomes are approved, declined and expired. It never shows success on click.
- **Props.**
  ```ts
  extends Omit<HTMLAttributes<HTMLLIElement>,'class'|'children'> { label: string; description?: string|Snippet;
    effective: string; requested: string; waitingOn?: string; requestedAt?: TimeInput; now?: TimeInput; formatTime?: (t: TimeInput, now: number)=>string;
    status: 'awaiting'|'approved'|'declined'|'expired'; instructions?: Snippet;
    onCancelRequest?: SettingsHandler<[]>; onResend?: SettingsHandler<[]>; action?: string /* no-JS intent=cancel|resend */;
    labels?: Partial<RequestedChangeLabels> }
  ```
- **Reports.** `onCancelRequest()` and `onResend()`. The status changes only when the app passes a new `status`.
- **States.** Awaiting (warning tone, "Now 2 · Requested 3"); cancelling or resending; approved; declined; expired; action failed (polite).
- **Built from.** RECIPES.row, Badge, Button, `core/time`.
- **Replaces in Trailside.**
  - The static computers/Limits requested-versus-effective footer ("Nothing changes until the device allows it").
  - The GitHubAppInstallDialog request-sent banner (Resend / Cancel request).
  - It satisfies the CP-01/IN-03 contract: "pending = show request state, no success on click".
- **Demo.** Awaiting with a command to run locally in `instructions`, plus approved and declined variants.
- **Tests.** Browser: clicking Resend never changes `status`; JS-off intent posts; the time is formatted with an injected `now`.

#### 11. LockReason (new: request access)
- **Purpose.** The one explanation of why something cannot be changed. It shows a kind icon, a default or custom sentence, an optional source ("by your organisation") and an optional way forward (Request access, Upgrade, Open the managing place). One element can describe many controls through a stable `id`.
- **Props.**
  ```ts
  extends Omit<HTMLAttributes<HTMLElement>,'class'|'children'|'id'> { lock: SettingLock; id?: string;
    variant?: 'inline'|'note'|'hidden'; onRequest?: SettingsHandler<[]>;
    labels?: Partial<LockReasonLabels> /* per-kind defaults, request, requesting, requested, requestFailed */ }
  ```
- **Reports.** `onRequest()`, or `lock.action` href. The component only moves through requesting, requested and failed.
- **States.** Each kind; with source; with action; requesting, requested or failed; inline, note or visually hidden (still describes controls).
- **Built from.** Button, `LOCK_ICONS`, `DEFAULT_LOCK_LABELS`, STATUS_TEXT_CLASS.
- **Replaces in Trailside.**
  - `lib/ui/Unavailable.svelte` note side and `RESULT_UNAVAILABLE_NOTE`.
  - Per-copy note ids (`incident-unavailable-phone`), `appearance-theme-note`.
  - "Needs GitHub connected first".
  - The style-only `.role.fixed`.
  - "Delete account disabled until ownership transferred".
- **Demo.** Each kind; one shared note describing three disabled rows; request flow.
- **Tests.** Browser: `aria-describedby` from three controls resolves to one id; the reason is visible text; the request button loads, then shows "requested".

### Group: save (`src/lib/settings/save/`)

#### 12. SettingsForm (leave guard is new)
- **Purpose.** The staged model's host: a real `<form method="post">` that creates a `SettingsDraft` and publishes it through context.
  - Dirty state comes from the DOM diff against native defaults, or from a controlled `changes` list (apps with cross-section drafts).
  - It posts a hidden revision and runs FormSubmit.
  - It shows field and form errors and exposes conflicts.
  - A built-in leave guard renders a small Dialog: Save and leave / Leave without saving / Keep editing, listing what would be lost. The app's router calls `controller.guard.request(proceed)` from beforeNavigate.
- **Props.**
  ```ts
  extends Omit<HTMLFormAttributes,'class'|'children'|'onsubmit'|'method'> { action?: string;
    fields?: SettingsFieldDescriptor[]; revision?: string|number; revisionName?: string; hidden?: Record<string,string>;
    onSubmit?: SettingsHandler<[Record<string, FormDataEntryValue|FormDataEntryValue[]>, SettingsSubmitContext]>;
    result?: SettingsResult; pending?: boolean; changes?: SettingsChange[];   // controlled source
    onDirtyChange?: (c: SettingsChange[])=>void; guardLeave?: boolean /* true */;
    controller?: SettingsDraft /* bindable out */; children: Snippet<[SettingsDraft]>; ref?;
    labels?: Partial<SettingsFormLabels> /* genericError, leaveTitle, leaveDescription(n), saveAndLeave, leave, stay, leaveFailed */ }
  ```
- **Reports.**
  - `onSubmit(values, {changes, revision})`. The app saves with optimistic concurrency and returns `{}`, `{errors}`, `{error}` or `{conflict}`.
  - Without a handler it posts natively, and the server re-renders with new defaults and `result`.
  - `onDirtyChange` feeds nav dirty dots and AttentionList.
  - Discard is a native reset, through SaveBar.
- **States.** Clean; dirty(n); pending (double submits ignored); saved notice; field errors (focus to the first invalid field); form error; conflict (draft kept); leave pending, saving or failed; controlled versus DOM-diff.
- **Built from.** FormSubmit, SettingsDraft, Dialog (leave guard), Alert, ConsequenceList-free plain list of changes, `setSettingsDraft`.
- **Replaces in Trailside.**
  - The UI side of model.ts `reduceSettings` edit/save/discard and the `stagedChanges` if-chain (it becomes a descriptor table).
  - The store.ts draft/saved/revision as consumed by sections.
  - SettingsView `saveWorkspaceEdit`.
  - Retention and StatusMapping draft logic, and the repo recipe draft.
  - It adds the missing beforeNavigate guard.
- **Demo.** Three rows (switch, select, text); edit, save, discard; a forced conflict; leave-guard prompt via a fake navigate button.
- **Tests.**
  - Pure: `diffForm` on a jsdom-free fixture shape; `describeChanges` formats with shared units.
  - Browser:
    - Edits made before hydration survive (slowed hydration).
    - Reset restores defaults.
    - JS-off post includes the revision.
    - The guard blocks a navigation while dirty.

#### 13. SaveBar
- **Purpose.** The face of the staged model:
  - "N unsaved changes", a from→to summary (max 3 then "+N more") and an optional impact line.
  - Discard (type=reset) and Save (type=submit).
  - Error, conflict with Review, and a saved notice.
  - Focus returns to the last edited control when the bar unmounts.
- **Props.**
  ```ts
  { layout?: 'footer'|'sticky'|'floating'; changes?: SettingsChange[]; impact?: string|Snippet; showIdle?: boolean;
    summaryMax?: number; form?: string; reviewHref?: string; onReviewConflict?: ()=>void;
    refocus?: ()=>HTMLElement|null; labels?: Partial<SaveBarLabels> }
  ```
  The floating offset comes from `--ak-settings-bar-offset`.
- **Reports.** Through the form (submit or reset) plus `onReviewConflict`/`reviewHref`.
- **States.** Idle (hidden, or footer idle text with Save disabled; always visible without JS); dirty; pending; error (`role=alert`); conflict (`role=alert` with review); saved (`role=status`); compact summary in narrow containers.
- **Built from.** Button, Alert, Badge dot, `getSettingsDraft`, `restoreFocus`.
- **Replaces in Trailside.**
  - `parts/StagedChanges.svelte` (bar/footer layouts, dirty/panel looks, `.nt-sv`/`.sgs-sv` hooks, ~70 lines of media CSS each, Sample copy).
  - Retention/StatusMapping `.gx-bar`, `.spe-bar`.
  - The phone fixed bar plus the `.st-gap` spacer.
- **Demo.** All three layouts against one form; conflict state with Review.
- **Tests.** Browser: after Save unmounts the bar, focus is on the last edited control; the reset button restores values with JS off.

#### 14. ChangeNotice
- **Purpose.** The inline result after an instant change or a completed action: a bold lead, a detail line, Undo protected by an ownership token (a stale notice cannot undo a newer change), an optional secondary action (Reset) and dismiss. It is never auto-hidden (WCAG timing).
- **Props.**
  ```ts
  { lead: string|Snippet; detail?: string; tone?: UiTone; undoToken?: string|number; currentToken?: string|number;
    onUndo?: SettingsHandler<[string|number|undefined]>; undoAction?: string; hidden?: Record<string,string>;
    secondary?: SettingsAction; onDismiss?: ()=>void; placement?: 'inline'|'sticky'; labels?: Partial<ChangeNoticeLabels> }
  ```
- **Reports.** `onUndo(token)`, or a native post (intent=undo, token); `onDismiss()`. The app owns snapshots, through the UndoSlot helper.
- **States.** Shown; undoing; undone; undo failed; superseded (Undo disabled with reason); dismissible; no-JS form.
- **Built from.** Alert (live polite, actions, onDismiss), Button, UndoSlot rules.
- **Replaces in Trailside.**
  - SettingsResultToast as used in settings, plus toast-state `ownedUndo`.
  - IntegrationFrame `.ig-result`.
  - `.gx-result`/`.gx-undo` in Retention, Export and Incident.
  - Models `.smd-toast`.
  - Drain/Limits/Storage/Worktrees `.computer-result`.
  - Five copies in all.
- **Demo.** Two rapid changes, so the first notice's Undo shows "superseded".
- **Tests.**
  - Pure: UndoSlot `take` returns null once superseded.
  - Browser: JS-off undo post.

#### 15. ConflictResolver (new)
- **Purpose.** The end of the staged conflict path. Per field it shows Yours against Latest and a Keep choice: Yours, Latest, or Both where allowed. When Both is not allowed, the reason is shown. An optional preview shows the merged result. Responds to `SettingsConflict.fields`.
- **Props.**
  ```ts
  extends Omit<HTMLFieldSetAttributes,'class'|'children'> { fields: ConflictField[];
    value?: Record<string,'mine'|'theirs'|'both'>; defaultValue?: Record<string,'mine'|'theirs'|'both'> /* theirs */;
    name?: string /* 'keep' -> keep.<field> */; changedBy?: { name: string; at: TimeInput };
    onValueChange?: (v)=>void; preview?: Snippet<[Record<string,'mine'|'theirs'|'both'>]>; labels?: Partial<ConflictResolverLabels> }
  ```
- **Reports.** `onValueChange` plus native `keep.<field>` fields. It lives inside a SettingsForm (or the app's dialog form), and the app merges.
- **States.** Per-field choice; Both disabled with reason; chosen side highlighted; a table when wide; stacked per-field segmented radios when narrow (unique names, so there is no collision).
- **Built from.** Native radios with segmentClass/SEGMENT_GROUP_CLASS, `<table>` with `th scope=row`, Badge.
- **Replaces in Trailside.** RepoSyncConflictDialog `.ra-cmp`/`.ra-seg` (with separate phone radio names); the bare "Review current settings revision" link; it builds canvas AppEditConflict.
- **Demo.** A SaveBar conflict, then a Dialog containing the resolver, then resubmit.
- **Tests.** Browser: one radiogroup per field with an accessible name; JS-off posts `keep.*`; the Both-disabled reason is linked.

#### 16. ConsequenceList
- **Purpose.** A list of effects where tone is spoken, not only coloured:
  - `ok`, `no`, `warn`, `info`, each with an icon plus an sr-only prefix.
  - An optional `aside` fact on the right.
  - A single list, or groups shown side by side when wide (What changes / What stays, Can / Can't, Shared / Never shared).
- **Props.**
  ```ts
  { items?: ConsequenceItem[]; groups?: ConsequenceGroup[]; heading?: string; headingLevel?: 3|4|5;
    columns?: 'auto'|1|2; size?: 'sm'|'md'; labels?: Partial<ConsequenceListLabels> /* ok 'Yes:', no 'No:', warn 'Caution:', info 'Note:' */ }
  ```
- **Reports.** Nothing.
- **States.** List or grouped; each tone; with description or aside.
- **Built from.** `ul`/`li`, lucide Check/X/AlertTriangle/Info, STATUS_TEXT_CLASS.
- **Replaces in Trailside.**
  - `dialogs.css` `.fx-list`/`.fx-li`/`.dx-li`.
  - DataSharing `.sgs-two`/`.sgs-y`/`.sgs-n`, ClickUp `.asks`, Export "Never included".
  - SessionRevoke effects, AccessPreview Can/Can't.
  - SupportedAgents capabilities, where allowed is decided by array index today.
  - Drain checklist.
- **Demo.** Can / Can't columns; What happens / What stays.
- **Tests.** Browser: the sr-only prefix is present per tone; axe clean.

#### 17. ConsequenceDialog
- **Purpose.** The confirmed model: a route-addressable consequence review inside a real `<form method=post>`. It has three tiers:
  1. **Consequences**: a lead sentence, an identity line, grouped ConsequenceList-style effects and a warning.
  2. **Plus fields**: `reassign` rows (a NativeSelect per dependent, with defaults and a live summary) or any extra fields passed as children (successor ChoiceCards).
  3. **Plus typed phrase**: native `required` plus `pattern`, so the gate works with JS off; JS also disables the button.

  A single danger submit; Cancel is a link to `closeHref`; a footnote states reversibility; it becomes a sheet when narrow.
- **Props.**
  ```ts
  extends Omit<HTMLAttributes<HTMLDialogElement>,'class'|'children'|'title'> { title: string; description?: string|Snippet; icon?: Component; identity?: Snippet;
    open?: boolean /*bindable*/; closeHref?: string; ssrOpen?: boolean; trigger?: Snippet<[Part<HTMLButtonElement>]>;
    consequences?: ConsequenceItem[] | ConsequenceGroup[]; warning?: string|Snippet; reassign?: ReassignSpec;
    confirmPhrase?: string; phraseOptions?: { caseSensitive?: boolean; trim?: boolean };
    confirmLabel: string; tone?: 'danger'|'accent'; action?: string; intent?: string; hidden?: Record<string,string>;
    onConfirm?: SettingsHandler<[{ typed?: string; reassign: Record<string,string>; data: FormData }]>;
    result?: SettingsResult; pending?: boolean; reversible?: boolean; footnote?: string|Snippet; size?: 'sm'|'md'|'lg';
    children?: Snippet; labels?: Partial<ConsequenceDialogLabels> /* cancel, pending, typeToConfirm(p), failed, irreversible, reversible, replacementFor(l), whatHappens, whatStays */ }
  ```
- **Reports.** `onConfirm({typed, reassign, data})`, or a native post with intent, `confirm`, `reassign.<id>` and `hidden`. Errors stay inside the dialog (`role=alert`). On success the app navigates to `closeHref`. The server must re-check the phrase (documented).
- **States.** Open via URL or bound; phrase unmatched (submit blocked and described); confirmable; reassign defaults or changed; pending (double-submit guard, Cancel disabled); error; sheet when narrow; focus returns to the opener.
- **Built from.**
  - Dialog with the new `closeHref`/`ssrOpen`/`returnFocus`/`narrow` props.
  - FormSubmit, Alert, Input (`autocomplete=off`, `spellcheck=false`, `autocapitalize=off`), NativeSelect, Button tone danger.
  - `matchesPhrase`/`phrasePattern`, `rememberOpener`/`restoreFocus`.
  - Consequence markup shared with ConsequenceList (same group).
- **Replaces in Trailside.**
  - DeleteWorkspaceDialog (four inline SVGs, duplicated footnote), DeleteHistoryDialog, TransferDialog.
  - MemberRemove (handoff selects hard-coded to two ids), the ModelDialog model-remove reassign.
  - Disconnect/Reset/Leave/SessionRevoke dialogs, the `dx-*`/`mad-*`/`dwz-*`/`dw-*` vocabularies, the `:global` WorkspaceDialog overrides, and five copies of the try/finally pending guard.
- **Demo.** Disconnect (consequences only); remove with reassignment; delete with a typed name; route mode via a `?dialog=` link in the demo URL.
- **Tests.**
  - Pure: `matchesPhrase`/`phrasePattern` (escaping, trim).
  - Browser:
    - SSR-open renders before hydration.
    - JS-off typed gate blocks submit.
    - Escape follows `closeHref`.
    - Focus returns to the opener.

### Group: controls (`src/lib/settings/controls/`)

#### 18. ChoiceCards
- **Purpose.** A Field-aware single choice with looks `cards` (radio dot, label, description, icon, badge, a preview snippet, and a Current or Changed caption), `rows` or `segmented`. `auto` turns cards into a segmented control in a narrow container. It uses native radios, so it posts and keyboards natively. Instant via `onCommit`; staged inside SettingsForm.
- **Props.**
  ```ts
  extends Omit<HTMLAttributes<HTMLDivElement>,'class'|'children'> { options: ChoiceOption[]; name: string;
    value?: string|null; defaultValue?: string|null; savedValue?: string; onValueChange?: (v: string)=>void;
    onCommit?: SettingsHandler<[string]>; action?: string; variant?: 'cards'|'rows'|'segmented'|'auto'; columns?: 2|3|4;
    preview?: Snippet<[ChoiceOption, { checked: boolean }]>; option?: Snippet<[ChoiceOption, { checked: boolean }]>;
    readout?: Snippet<[string|null]>; required?: boolean; disabled?: boolean; invalid?: boolean; lock?: SettingLock;
    'aria-label'?: string; labels?: Partial<ChoiceCardsLabels> /* current, changed, apply, saving, saved, failed, undo */ }
  ```
- **Reports.** `onValueChange`; `onCommit(value)` (InstantSetting rules); native `name=value`.
- **States.** Selected; changed versus saved caption; option disabled or locked with a visible reason; group locked; invalid; pending, saved or error; cards, rows or segmented; `:has(:checked)` styling before hydration.
- **Built from.** Native radios in labels, Field group context (fieldset/legend), segmentClass recipes, Badge, InstantSetting, `getSettingsDraft`.
- **Replaces in Trailside.**
  - Appearance theme and density cards (`.ap-opts`/`.ap-o`/`.ap-pv`/`.ap-den`, written three times, plus the nth-child segmented morph).
  - `.fx-role`, `.dx-opt`, `.ra-opt`, `.mad-pick`.
  - The TransferDialog person picker (via the `option` snippet with Avatar).
  - The aria-pressed segmented `.ig-seg`/`.rt-seg`/`.seg`/`.mad-seg`, now real radios.
  - RepoRecipe Automatic/Ask.
- **Demo.** Theme cards with swatch previews; density segmented; role cards with a readout line; an option locked by plan.
- **Tests.** Browser: arrow keys move selection; JS-off posts; changed caption against `savedValue`; disabled reason linked.

#### 19. NotificationMatrix (new)
- **Purpose.** An events × channels preference grid of native checkboxes.
  - Locked cells (Always on/off with reason).
  - Unavailable channels with a reason.
  - Permission-gated channels (browser asks first, or denied).
  - An optional column toggle (indeterminate).
  - On a narrow container, one fieldset per event.
- **Props.**
  ```ts
  { events: { id: string; label: string; description?: string; group?: string }[];
    channels: { id: string; label: string; description?: string; icon?: Component; unavailable?: string; permission?: 'granted'|'prompt'|'denied' }[];
    value?: string[] /* `${event}:${channel}` */; defaultValue?: string[]; name?: string /* 'notify' */;
    locked?: Record<string, { checked: boolean; reason: string }>; onValueChange?: (v: string[])=>void;
    onCellCommit?: SettingsHandler<[string, string, boolean]>; onRequestPermission?: (channel: string)=>unknown;
    columnToggle?: boolean; layout?: 'auto'|'grid'|'list'; disabled?: boolean; lock?: SettingLock; labels?: Partial<NotificationMatrixLabels> }
  ```
- **Reports.** `onValueChange`; `onCellCommit(event, channel, on)` for instant use (per-cell InstantSetting); `onRequestPermission(channel)`. Natively, each checked cell posts `notify=<event>:<channel>`, and locked cells post through hidden inputs.
- **States.** On/off; locked; channel unavailable; permission prompt or denied; per-cell pending or error; staged dirty cells; grid versus list; column indeterminate.
- **Built from.** Checkbox, `<table>` with `th scope=col/row`, Field group per event in list layout, Badge, Button, InstantSetting.
- **Replaces in Trailside.** NotificationsSection's two separate lists ("Tell me when" / "Where" in `.nt-two`/`.nt-col`) with disabled channel switches and the "Always on" pill. Beta's desktop, email and in-app channels become columns, enabling per-event channel choice.
- **Demo.** 5 events × 3 channels; one locked cell; one channel unavailable; push permission prompt.
- **Tests.**
  - Browser: each cell's accessible name is "event by channel"; JS-off posts the full set including locked cells; list layout at narrow width.
  - Axe in both themes.

#### 20. SettingsItemList
- **Purpose.** A managed list of things: members, invites, devices, repositories, agents, destinations, keys. Each row has a leading icon or avatar, a label, badges, meta, a status, a `trailing` control snippet (Switch, a NativeSelect pill for roles, a Button) and row actions. Also:
  - Confirm-first destructive actions (AlertDialog) or links to a ConsequenceDialog route.
  - Status sub-groups (members / invited).
  - An optional filter, and an empty state.
  - An add footer with a visible prerequisite reason.
  - Opt-in multi-select with locked rows and a summary ("3 selected · frees 2.9 GB").
  - Focus moves sensibly after a row is removed.
- **Props.**
  ```ts
  <T extends SettingsItem> extends Omit<HTMLAttributes<HTMLElement>,'class'|'children'|'title'> {
    items: T[]; title?: string; description?: string; count?: string|number; headingLevel?: 2|3|4;
    groups?: { id: string; label: string; description?: string }[]; trailing?: Snippet<[T]>;
    actions?: (item: T)=>SettingsItemAction[]; onAction?: (actionId: string, item: T)=>unknown; formAction?: string;
    headerActions?: Snippet; footer?: Snippet; addAction?: SettingsAction; empty?: { title: string; description?: string; action?: SettingsAction };
    filter?: { value?: string; name?: string } | false; onFilterChange?: (q: string)=>void;
    selectable?: boolean; value?: string[]; defaultValue?: string[]; name?: string; onValueChange?: (ids: string[])=>void;
    selectionSummary?: (ids: string[])=>string; bulkActions?: SettingsItemAction[];
    labels?: Partial<SettingsItemListLabels> /* current 'This device', actionsFor(l), failed(l), selected(n), noMatch(q), isNew 'New', cancel */ }
  ```
- **Reports.**
  - `onAction(actionId, item)` after any `confirm`. A promise gives per-row loading; a rejection gives a generic per-row failure.
  - Without JS, row buttons submit `name={action.id} value={item.id}` to `formAction`.
  - Selection goes through `onValueChange` or native posts.
  - The parent removes items.
- **States.** Empty; filtered or no match; per-row pending or failed; current; new (tint); locked (reason, not selectable); grouped; selected plus summary footer; add unavailable with reason; more than 2 actions collapse into an overflow menu.
- **Built from.** RECIPES.section/row, Avatar, Badge, Button, IconButton, DropdownMenu, AlertDialog, Checkbox, Input search, EmptyState, `isThenable`, `nextFocusAfterRemoval`, and the NativeSelect pill (this group's primitive change).
- **Replaces in Trailside.**
  - PeopleSection plus PeopleRows (two divergent implementations, `.st-role` re-declared).
  - RepositoryRows with the "Not added yet" catalogue and `.srp-add`.
  - The ComputerRows list.
  - The Storage and Worktrees selectable lists (`.e2-row`/`.wt`, `.e2-cb`/`.gx-cb`), where the reducers stay app-side.
  - RepoAddDialog picker; the Models/SupportedAgents rows and phone copies; the Slack destination allow-list.
  - In the kit it generalises SessionList, which can later be rebuilt on it.
- **Demo.** Members with a role pill select and an invited sub-group; repositories with a per-row switch and an add footer reason; a cleanup list with locked rows and a size summary.
- **Tests.** Browser: focus after removal (next, then previous, then heading); confirm then action; JS-off row action post; selection survives filtering; per-row failure announced politely.

#### 21. UsageMeter
- **Purpose.** Usage against a limit, rendered as `role="meter"`.
  - Tone is derived from thresholds (default warning at 0.8, danger at 1) and never conveyed by colour alone ("Near the limit", "Over the limit").
  - Supports unlimited, a reset period, a marker (pause floor), a projected value, and segmented stacked mode with a legend.
  - Variant `row` shares one scale across a table of meters.
- **Props.**
  ```ts
  { label: string; value?: number; limit?: number|null; max?: number; unit?: string; format?: (n: number)=>string;
    description?: string|Snippet; thresholds?: { warning?: number; danger?: number }; tone?: UiTone;
    period?: { label?: string; resetsAt?: TimeInput }; now?: TimeInput; segments?: MeterSegment[];
    marker?: { value: number; label: string }; projected?: { value: number; label: string };
    valueText?: string | ((v: number, l: number|null)=>string); action?: SettingsAction; variant?: 'bar'|'row'|'compact'; size?: 'sm'|'md'|'lg';
    labels?: Partial<UsageMeterLabels> /* of(v,l), unlimited, resets(t), near, over, remaining(r), none */ }
  ```
- **Reports.** Nothing, apart from the optional action.
- **States.** Under; near; at or over; unlimited; no data (em dash); segmented with legend; marker; projected; row, bar or compact.
- **Built from.** progressFillClass/TONE_FILL_CLASS recipes, Badge, `actionButtonProps`, `core/time`.
- **Replaces in Trailside.**
  - Usage `.sgu-table` meters (decorative `<i>`, max parsed with `parseInt('12h')`).
  - Storage stacked bar, legend and "free after" (and the hex values in storage-view.ts).
  - The Diagnostics disk tile.
  - Retention "1.4 GB in use".
- **Demo.** Seats 42 of 50 (warning); storage segments with a pause marker and projected free space; a table of row meters on a shared scale.
- **Tests.**
  - Pure: the tone-from-thresholds function (exported from the component's `.ts` sibling or shared).
  - Browser: role=meter with aria-valuenow, min, max and valuetext; the over-limit text is present.

#### 22. CopyValue
- **Purpose.** A copyable read-only value (ID, URL, command, token) with an optional `$` prompt. Optional masking with Reveal/Hide. A show-once mode adds the warning "You won't see this again", Download as a file and an optional acknowledgement before Done. Feedback is polite.
- **Props.**
  ```ts
  { value: string; label: string; mono?: boolean; prompt?: string; masked?: boolean; showOnce?: boolean;
    filename?: string; requireAcknowledge?: boolean; expiresAt?: TimeInput; now?: TimeInput; size?: 'sm'|'md';
    onCopy?: (ok: boolean)=>void; onReveal?: (shown: boolean)=>void; onDownload?: ()=>void; onDone?: ()=>unknown;
    labels?: Partial<CopyValueLabels> /* copy, copied, copyFailed, copyFor(l), reveal, hide, download, warning, acknowledge, done, expired */ }
  ```
- **Reports.** `onCopy`, `onReveal`, `onDownload` and `onDone` are notifications only; copy and download happen locally. The value is never placed in `data-*`, the URL, the console or storage.
- **States.** Idle; copied; failed (selects the text as a fallback); masked or revealed (resets to masked on unmount); show-once warning; acknowledged; expired (value removed); before mount (value in a readonly selectable input, buttons softDisabled).
- **Built from.** CopyState, IconButton, Button, Checkbox, Alert, Input readonly, ReadyGate.
- **Replaces in Trailside.**
  - Diagnostics "Copy report", Repair command chips, ModelDialog `.mad-cmd`/`.mad-copy`.
  - The `.pk-code` pairing code.
  - The `computer-feedback` copy line.
  - (About Copy-ID goes through SettingsFacts.)
- **Demo.** A command with `$`; a masked token; a show-once secret with acknowledgement.
- **Tests.** Browser: the value is absent from `data-*` and the URL; the copy failure path; selectable before hydration; masked again after remount.

## 5. Additive primitive changes

All of these are backwards compatible.

| Owner | Change |
|---|---|
| Controller (shared PR) | `FormSubmit` promotion with aliases, `readBoolean`, `copyText` move, `isThenable` move, `Field.describedBy` + `createFieldState`, coarse-pointer 44px hit areas on Button, IconButton, Switch, Checkbox |
| save group | Dialog/Sheet: `closeHref` (close and Cancel render as links; Escape and backdrop follow the link), `ssrOpen` (open attribute during SSR, upgraded to showModal on mount), `returnFocus`, `narrow?: 'sheet'\|'fullscreen'`. AlertDialog: the same route props plus `confirmDisabled` and `confirmDescribedBy` |
| controls group | NativeSelect `variant?: 'default' \| 'pill'` (compact face with the native select overlaid) |

Test harness, done by the controller: the demo filter accepts `settings-`, `NO_DEMO_DEFAULTS` includes `src/lib/settings/`, and the a11y ratchet must stay clean for every new entry in light and dark.

**Deliberately not changed:**

- softDisabled on form controls. Locks use native `disabled` plus visible reason text, which avoids the NativeSelect aria-disabled hole.
- Progress `role=meter`. UsageMeter renders its own.
- RadioGroup appearance. ChoiceCards uses native radios.
- Toaster. ChangeNotice is inline on purpose.
- A link-based NavList primitive. Promote SettingsNav later if a second collection needs it.

## 6. Deliberately left out of this wave

- **Folded or cut:**
  - SettingsIndex is a SettingsNav variant.
  - SettingsGroup is a nested SettingsSection.
  - SettingsSplit is the SettingsSection `aside`.
  - DangerZone is a SettingsSection `tone='danger'` placed last, with rows whose actions route to a ConsequenceDialog (a documented recipe).
  - ScopeBanner is SettingsPage `scope`.
  - LeaveGuardDialog is built into SettingsForm.
  - InlineEditSetting and ChoiceSetting are SettingsRow + Input/ChoiceCards in a SettingsForm.
  - SettingValue is SettingsFacts.
  - ReassignList is ConsequenceDialog `reassign`.
  - UndoNotice is ChangeNotice.
  - MemberList is SettingsItemList + the NativeSelect pill (demo recipe).
  - ConnectionCard is a composition of Section, Facts and ConsequenceList (demo recipe).
- **Deferred to later waves:**
  - InheritedSetting (no multi-scope need yet; the lock kind `inherited` exists).
  - TagInput/InviteForm.
  - AuditLog, filterAuditEvents and the CSV guard, plus DataExport/restore drop zone: a data-collection wave.
  - ApiKeyList and WebhookEndpoints (Trailside forbids webhooks before M2).
  - NumberStepper, TerminalPreview/CommandBlock, MappingTable, StepGuide.
  - A global Toaster.
- **Never in the kit:** product words (workspace-specific nouns are passed through labels), sample/provenance copy, brand logos, persistence and fetch.

## 7. Risks and adoption notes

1. **Hydration and dirty tracking.** The DOM diff depends on uncontrolled controls keeping pre-hydration input. Group save must browser-test with slowed hydration (Trailside's ssr-interaction-readiness rule).
2. **Cross-section drafts.** Trailside keeps drafts across sections, so it adopts SettingsForm through the controlled `changes` path and feeds `SettingsLink.dirty`. That path is first-class and documented.
3. **Nested forms.** Instant controls drop their mini-form under a SettingsDraft context. Test JS-off posting inside and outside a form.
4. **Optimistic races** are covered by InstantSetting unit tests. Backends that are not last-write-wins still need server ordering.
5. **Dialog route mode** touches a shared primitive. Group save reviews it as its own PR; focus return across navigation needs browser tests.
6. **Catalogue traps:** the 1-to-1 `.svelte` rule (no private helper components), the demo filter edit, and flat root export names (checked; none collide today).
7. **Trailside adoption needs an owner decision, probably an ENG ADR.** AGENTS.md requires canvas-converted screens with canvas class names. Kit components change markup, so adoption needs a token bridge from Trailside tokens to `--ak-*` and canvas-parity checks. Record the Apache-2.0 licence check (ENG-0054 note). Trailside's sample boundary words stay in Trailside, passed through `labels` and SettingsPage `scope`.

## Appendix: shared layer sketch

```ts
// ===== Controller PR (lands before any group forks). No .svelte files. =====

// --- primitives / core promotions (additive; Auth re-exports the old names) ---
// src/lib/primitives/form/submit.svelte.ts   (moved from auth/shared/submit.svelte.ts)
export type FormResult<F extends string = string> = { error?: string; errors?: Partial<Record<F, string>> };
export interface FormSubmitContext { data: FormData; event: SubmitEvent }
export type FormSubmitHandler<V, F extends string = string> =
  (values: V, ctx: FormSubmitContext) => void | FormResult<F> | Promise<void | FormResult<F>>;
export declare class FormSubmit<V, F extends string = string> { /* = old AuthSubmit; focus target [data-form-error] (keeps [data-auth-error]) */ }
// src/lib/primitives/form/form-data.ts : readText, readCheck, + readBoolean(data, name) // hidden 'false' + checkbox 'true', last wins
// src/lib/primitives/form/field.ts : FieldState gains describedBy?: string[]; export createFieldState(opts): FieldState
// src/lib/ui/clipboard.ts : export copyText(text: string): Promise<boolean>   (auth/recovery/clipboard.ts re-exports)
// src/lib/core/promise.ts : export isThenable(v: unknown): v is PromiseLike<unknown>

// --- src/lib/settings/shared/types.ts ---
import type { Component } from 'svelte';
import type { UiTone } from '../../ui/styles';
import type { TimeInput } from '../../core/time';
import type { FormResult } from '../../primitives/form/submit.svelte';

export type SettingStatus = 'idle' | 'pending' | 'saved' | 'error' | 'conflict';
export type LockKind = 'permission' | 'plan' | 'managed' | 'inherited' | 'readonly' | 'unsupported' | 'awaiting-approval';

export interface SettingsAction {
  label: string; ariaLabel?: string;
  href?: string; onSelect?: () => unknown;        // promise => owning button loads
  intent?: string;                                // inside a form: posts name="intent" value=intent
  tone?: 'default' | 'accent' | 'danger'; external?: boolean;
  unavailable?: string;                           // visible reason; renders softDisabled Button, never a dead <a>
}
export interface SettingLock { kind: LockKind; reason: string; source?: string; badge?: string /* 'Always on' */; action?: SettingsAction }

export interface SettingsLink {
  id: string; label: string; href: string; icon?: Component; group?: string;
  description?: string; meta?: string; keywords?: string[];
  badge?: string | number; badgeTone?: UiTone; dirty?: boolean; lock?: LockKind; disabled?: string;
}
export interface SettingsNavGroup { id: string; label?: string; description?: string; items: SettingsLink[] }
export interface SettingsSearchEntry { id: string; label: string; section: string; href: string; description?: string; keywords?: string[]; icon?: Component }

export interface SettingsFieldDescriptor { name: string; label: string; format?: (raw: string | string[]) => string }
export interface SettingsChange { name: string; label: string; from?: string; to: string }
export interface ConflictField { name: string; label: string; mine: string; theirs: string; allowBoth?: boolean; bothReason?: string }
export interface SettingsConflict { message?: string; reviewHref?: string; revision?: string | number; fields?: ConflictField[]; changedBy?: { name: string; at: TimeInput } }
export type SettingsResult<F extends string = string> = FormResult<F> & { conflict?: SettingsConflict; notice?: string; undoToken?: string | number };
export type SettingsHandler<A extends unknown[], F extends string = string> =
  (...args: A) => void | SettingsResult<F> | Promise<void | SettingsResult<F>>;

export interface ConsequenceItem { id?: string; tone: 'ok' | 'no' | 'warn' | 'info'; label: string; description?: string; aside?: string }
export interface ConsequenceGroup { label: string; items: ConsequenceItem[] }
export interface ReassignSpec { label: string; description?: string; name?: string /* 'reassign' */;
  dependents: { id: string; label: string; description?: string; tag?: string }[];
  options: { value: string; label: string; disabled?: boolean }[] | ((id: string) => { value: string; label: string; disabled?: boolean }[]);
  defaultFor?: (id: string) => string; summary?: (v: Record<string, string>) => string }
export interface AttentionItem { id: string; tone: 'warning' | 'accent' | 'danger' | 'neutral'; icon?: Component; label: string; description?: string; action: { label: string; href?: string; onSelect?: () => unknown }; dismissible?: boolean }
export interface ChoiceOption { value: string; label: string; description?: string; icon?: Component; badge?: string; disabled?: boolean; lock?: SettingLock }
export interface SettingsFact { id: string; label: string; value: string; compactValue?: string; mono?: boolean; tone?: UiTone; detail?: string; source?: string; copy?: boolean | string; action?: SettingsAction }
export interface SettingsItem { id: string; label: string; description?: string; meta?: string[]; icon?: Component; avatar?: { name: string; src?: string };
  badges?: { label: string; tone?: UiTone }[]; status?: { label: string; tone?: UiTone }; current?: boolean; group?: string; href?: string; mono?: boolean; isNew?: boolean; lock?: SettingLock }
export interface SettingsItemAction { id: string; label: string; ariaLabel?: string; tone?: 'default' | 'danger'; href?: string; unavailable?: string; confirm?: { title: string; description: string; confirmLabel?: string } }
export interface MeterSegment { id: string; label: string; value: number; tone?: UiTone | 'muted' }

// --- src/lib/settings/shared/staged.svelte.ts : THE staged model (one per SettingsForm) ---
export function readDefaults(form: HTMLFormElement): Record<string, string | string[]>;          // defaultValue/defaultChecked/defaultSelected
export function diffForm(form: HTMLFormElement, fields: SettingsFieldDescriptor[]): SettingsChange[]; // current FormData vs defaults, option/label text, format()
export function describeChanges<V extends Record<string, unknown>>(fields: SettingsFieldDescriptor[], saved: V, draft: V): SettingsChange[]; // controlled apps
export interface SettingsSubmitContext { changes: SettingsChange[]; revision?: string | number; data: FormData; event: SubmitEvent }
export interface SettingsDraftOptions {
  fields: () => SettingsFieldDescriptor[];               // plus rows' register()
  changes: () => SettingsChange[] | undefined;           // controlled source; undefined => DOM diff
  revision: () => string | number | undefined;
  submit: () => SettingsHandler<[Record<string, FormDataEntryValue | FormDataEntryValue[]>, SettingsSubmitContext]> | undefined;
  result: () => SettingsResult | undefined;              // native post round trip / form action
  pending: () => boolean | undefined;
  onDirtyChange: () => ((changes: SettingsChange[]) => void) | undefined;
  genericError: () => string;
}
export declare class SettingsDraft {
  constructor(opts: SettingsDraftOptions);
  readonly changes: SettingsChange[]; readonly dirtyCount: number;
  readonly status: SettingStatus; readonly error?: string; readonly notice?: string; readonly conflict?: SettingsConflict;
  isDirty(name: string): boolean; previous(name: string): string | undefined; fieldError(name: string): string | undefined;
  register(field: SettingsFieldDescriptor): () => void;
  readonly attach: import('svelte/attachments').Attachment<HTMLFormElement>; // input/change/reset listeners, lastEdited tracking
  onsubmit(e: SubmitEvent): void;                         // cancels native submit only when submit() exists
  discard(): void;                                        // form.reset()
  lastEdited(): HTMLElement | null;
  readonly guard: {
    readonly shouldBlock: boolean; readonly pendingLeave: boolean;
    request(proceed: () => void): boolean;               // app calls from beforeNavigate; false = not dirty, go
    decide(d: 'save' | 'leave' | 'stay'): Promise<void>;
    readonly beforeunload: import('svelte/attachments').Attachment<Window>; // active only while dirty
  };
}

// --- src/lib/settings/shared/instant.svelte.ts : THE instant model ---
export interface InstantOptions<T> {
  value: () => T; commit: () => SettingsHandler<[T]> | undefined; undo?: () => SettingsHandler<[T]> | undefined;
  equals?: (a: T, b: T) => boolean; savedForMs?: () => number /* 2000 */; undoable?: () => boolean;
}
export declare class InstantSetting<T> {
  constructor(opts: InstantOptions<T>);
  readonly current: T;            // optimistic
  readonly status: SettingStatus; readonly error?: string; readonly canUndo: boolean; readonly undoToken?: number;
  set(v: T): void;                // generation counter: only newest settles; failure reverts to last committed
  retry(): void; undo(): void; dismissError(): void;
}
// --- undo.ts ---
export declare class UndoSlot<S> { remember(snapshot: S): number; take(token: number): S | null; isCurrent(token: number): boolean; forget(): void }

// --- lock.ts ---
export const LOCK_PRECEDENCE: LockKind[]; // readonly > permission > managed > inherited > plan > awaiting-approval > unsupported
export function pickLock(...locks: (SettingLock | undefined)[]): SettingLock | undefined;
export function lockAttrs(lock: SettingLock | undefined, reasonId: string): { disabled?: true; 'aria-describedby'?: string; 'data-locked'?: LockKind };
export const LOCK_ICONS: Record<LockKind, Component>;
export const DEFAULT_LOCK_LABELS: Record<LockKind, string>;

// --- context.ts ---
export interface SettingsScope { ready: () => boolean; lock?: { lock: SettingLock; reasonId: string } }
export function setSettingsScope(s: SettingsScope): void; export function getSettingsScope(): SettingsScope | undefined;
export function setSettingsDraft(d: SettingsDraft): void; export function getSettingsDraft(): SettingsDraft | undefined; // presence => staged mode, no nested forms
export interface SectionContext { depth: number; headingLevel: 2 | 3 | 4 | 5; layout: 'rows' | 'columns' }
export function setSectionContext(c: SectionContext): void; export function getSectionContext(): SectionContext | undefined;

// --- ready.svelte.ts ---
export declare class ReadyGate { readonly current: boolean; constructor(override?: () => boolean | undefined) } // false on server, true after first $effect

// --- routes.ts ---
export interface SettingsRoutesConfig<S extends string, D extends string> {
  base: string; sections: readonly { id: S; legacy?: readonly string[] }[];
  dialogs: Record<D, readonly S[] | '*'>; params?: Record<string, readonly string[] | ((v: string) => boolean)>;
  returnParam?: string; isSafeReturn?: (path: string) => boolean; maxQuery?: number /* 4096 */;
}
export interface SettingsIntent<S, D> { section: S; dialog?: D; params: Record<string, string>; returnTo?: string }
export function createSettingsRoutes<S extends string, D extends string>(c: SettingsRoutesConfig<S, D>): {
  href(section: S, o?: { dialog?: D; params?: Record<string, string>; returnTo?: string }): string;
  read(url: URL): SettingsIntent<S, D> | null; closeHref(intent: SettingsIntent<S, D>): string;
  legacyRedirect(pathname: string): string | null; isSettingsPath(path: string): boolean;
};

// --- search.ts ---
export function filterSettingsLinks(groups: SettingsNavGroup[], query: string): SettingsNavGroup[];
export function searchSettings(entries: SettingsSearchEntry[], query: string, limit?: number): { entry: SettingsSearchEntry; ranges: [number, number][] }[];
export function toPaletteCommands(entries: SettingsSearchEntry[], navigate: (href: string) => void): import('../../primitives/menus/types').PaletteCommand[];

// --- focus.ts / copy.svelte.ts / confirm.ts / recipes.ts ---
export function rememberOpener(key: string): import('svelte/attachments').Attachment<HTMLElement>;
export function restoreFocus(...candidates: (HTMLElement | string | null | undefined)[]): boolean; // first connected+visible (checkVisibility)
export function nextFocusAfterRemoval(list: HTMLElement, index: number, fallback?: HTMLElement | null): HTMLElement | null;
export declare class CopyState { readonly status: 'idle' | 'copied' | 'failed'; copy(text: string): Promise<boolean>; resetAfterMs: number }
export function matchesPhrase(typed: string, phrase: string, o?: { caseSensitive?: boolean; trim?: boolean }): boolean;
export function phrasePattern(phrase: string): string; // escaped regex for native pattern= (no-JS gate)
export const SETTINGS_CONTAINER: string;  // '@container/settings' + container-type
export const CQ: { narrow: string; wide: string }; // one breakpoint set for all groups
export const RECIPES: { section: string; sectionHeader: string; sectionFooter: string; danger: string; row: string; rowStaged: string; note: string; iconTile: string };
export function actionButtonProps(a: SettingsAction, reasonId?: string): Record<string, unknown>; // href | softDisabled + aria-describedby | tone

// --- wiring (controller) ---
// src/lib/settings/{shell,rows,save,controls,shared}/index.ts, src/lib/settings/index.ts, src/lib/entries/settings.ts,
// root index export, package.json './settings', smoke-install import, README, catalog-registry 'Settings' category,
// +page.svelte CATEGORIES chip, tests/svelte5-audit.test.ts demo filter += 'settings-', NO_DEMO_DEFAULTS += 'src/lib/settings/',
// src/lib/fixtures/settings.ts (neutral fictional data), docs/settings/CONVENTIONS.md, tests/settings-shared.test.ts.
```
