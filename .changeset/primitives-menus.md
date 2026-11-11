---
'agents-kit-svelte': minor
---

Primitives: menus and pickers, styled over the headless layer and exported from `agents-kit-svelte/primitives`.

- `DropdownMenu`: a menu button whose rows are data (`MenuEntry`: items with icon, shortcut hint, `tone` (`UiTone`) and `onSelect`; checkboxes; radio groups; headed groups; separators; nested submenus). `triggerLabel` for the default button, or a `trigger` snippet whose part already carries your attributes and `ref`. `open`/`defaultOpen`/`onOpenChange`, `placement` (`'bottom-end'` or a full placement), `menuClass`.
- `ContextMenu`: the same rows on a region (`children`); right-click opens at the pointer, Shift+F10 or the ContextMenu key at the focused element. `menuLabel` names the menu.
- `Select`: one value or several (`multiple`, shown as chips or a `formatCount` summary), options with groups, descriptions and disabled states, `value`/`defaultValue`, `size`, and `name`/`required`/`disabled`/`invalid` so it works in a plain form. Reads a surrounding `Field`. Extra attributes and `ref` go to the trigger.
- `Combobox`: a filtering text input with a clear button (`clearLabel`), an empty state, a `filter` prop (or `false` for options you filter yourself), `bind:query`, a `loading` state (`aria-busy`), free text with `allowCustom`, and form props; `required` needs a chosen value, not just text. Reads a surrounding `Field`. Extra attributes and `ref` go to the input.
- `CommandPalette`: a modal search over grouped commands (`label`, `description`, icon, shortcut hint), a Recent section and an empty state, opened by a global shortcut (`mod+k` by default) while it is mounted. When several palettes share a shortcut, the most recently mounted one answers it.
