# Primitives conventions

One way to say each thing, across every primitive. When a prop names a concept below, it uses this name and this meaning. New primitives follow this file; a deviation needs a line here saying why.

## Names and labels

- **`label`** is always *visible* text that names the control (Checkbox, Switch, Radio options, Select, Combobox, Progress, Field). It is required unless a `Field` or `aria-labelledby` already names the control.
- **Text-entry and value controls are labelled by `Field`** (Input, Textarea, Slider, NativeSelect, RadioGroup, Select, Combobox). They do not each grow a `label` prop of their own; standalone use takes `aria-label` or `aria-labelledby`. Select and Combobox keep an optional `label` for convenience, used only when no Field is present.
- **`aria-label`** (the real attribute, passed through) is the name when nothing visible names the element: IconButton (required), ButtonGroup, ToggleGroup, Tabs, Pagination, Breadcrumb, ContextMenu regions. Never a camelCase `ariaLabel`.
- **`triggerLabel`** is the text on a button that opens something (DropdownMenu, CommandPalette).
- **`description`** is secondary help text everywhere (Field, Checkbox, Switch, options, commands). Not `hint`, not `subtitle`.
- **Item text** in item arrays is `label` (Tabs, Accordion, menu items, options, commands). Not `title`.

## Values and state

- Every value control: `value` (bindable), `defaultValue` (uncontrolled start and form-reset target), `onValueChange(value)`.
- Open state: `open` (bindable), `defaultOpen`, `onOpenChange(open, reason)`.
- Every form control: `name`, `required`, `disabled`, `invalid`; it submits and resets in a plain `<form>`, and `required` really blocks submit (never only `aria-required`), with focus going to the visible control.
- Every control inside a `Field` reads the Field context: name from the Field label, description from hint/error, `aria-invalid`, `aria-errormessage`, `required`. One label, never two.

## Look

- **`tone`** is colour meaning and always takes `UiTone` (`neutral | accent | success | warning | danger`). Menu items and AlertDialog use it too.
- **`variant`** is shape/emphasis (`solid | soft | outline | ghost`, and Button's own `primary | secondary | ghost | danger | accent`, kept because the kit's `buttonClass` recipe and common usage expect a destructive *variant*).
- **`size`** is `'sm' | 'md' | 'lg'`, default `'md'`, for every control that sits in a form row, so Input, NativeSelect, Select and Combobox line up. Icon-only sizes are separate (`icon-sm`, …). Display-only components may extend the scale (`xs`, `xl`) but keep `md` as default.
- **`placement`** accepts `OverlayPlacement` (`'bottom-start'` strings or a full `Placement`) everywhere, resolved with `toPlacement` from `src/lib/primitives/placement.ts`.

## Plumbing

- `...rest` lands on the element a user focuses or labels (the native control, the trigger), so `id`, `aria-*` and `data-*` from the user reach it. `class` goes on the outermost visual box.
- `ref` (bindable) exposes that same element.
- Every component exports `XProps` from its group's `index.ts`.
- No hard-coded user-facing words: every visible or announced string is a prop with an English default (`closeLabel`, `previousLabel`, `formatCount`, …).
