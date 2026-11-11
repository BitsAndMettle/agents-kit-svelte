---
'agents-kit-svelte': minor
---

Primitives: menus and pickers, styled over the headless layer and exported from `agents-kit-svelte/primitives`.

- `DropdownMenu`: a menu button whose rows are data (`MenuEntry`: items with icon, shortcut hint, `tone: 'danger'` and `onSelect`; checkboxes; radio groups; headed groups; separators; nested submenus). Pass a `trigger` snippet to render your own opener, or `label` for the default button. `bind:open`, `onOpenChange`, `placement`.
- `ContextMenu`: the same rows on a region (`children`); right-click opens at the pointer, Shift+F10 or the ContextMenu key at the focused element.
- `Select`: one value or several (`multiple`, shown as chips or "3 selected"), options with groups, descriptions and disabled states, `bind:value`, and `name`/`required`/`disabled` so it works in a plain form, including reset.
- `Combobox`: a filtering text input with a clear button, an empty state, a `filter` prop (or `false` for options you filter yourself), `bind:query`, a `loading` state (`aria-busy`), free text with `allowCustom`, and `name` for forms.
- `CommandPalette`: a modal search over grouped commands with icons, subtitles and shortcut hints, a Recent section and an empty state, opened by a global shortcut (`mod+k` by default) while it is mounted.
