---
'agents-kit-svelte': minor
---

Studio, a second colour palette, and `ThemeToggle`. Nothing an existing app draws changes.

- `data-palette="studio"` on `<html>` or any wrapper switches the colours to zinc greys with purple for work in progress (accent), orange for what needs you (warning), green for done (success) and blue for information (info). It follows the existing light and dark switch, each colour written once with `light-dark()` (Safari 17.5, Chrome 123, Firefox 120, or a build that lowers it, such as Vite's Lightning CSS pass). Every text pair holds 4.5:1 and every chart colour 3:1 in both themes.
- `ThemeToggle`: a 32px icon button named Theme with a Light, Dark and System menu. It reads `<html data-theme>` when drawn and writes it on a choice, clearing a `dark` class; with `cookie`, the choice is also kept in that cookie for a year. `themeOf` and `themeCookie` are exported as its pure halves.
- `.ak-shimmer-text` reads two optional tokens, `--ak-shimmer` and `--ak-shimmer-glint`; unset, the sweep is the same as before. Studio sets them to its purple.
- `AppShellItem.countTone` colours an item's count (default `accent`, as before).
