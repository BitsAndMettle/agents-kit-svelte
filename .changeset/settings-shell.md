---
'agents-kit-svelte': minor
---

Settings shell: `SettingsLayout` (rail beside the page when wide; index or page alone when narrow, one DOM tree), `SettingsNav` (rail or phone-style index with badges, unsaved dots, lock marks, unavailable items with reasons and a GET filter), `SettingsPage` (back link, breadcrumb, header, a scope note that can lock everything below, footnote), `SettingsSearch` (row-level settings search as a GET form, with highlighted matches, arrow keys and a focus shortcut) and `AttentionList` (a dismissible "needs attention" list whose whole items follow their action).

With nothing current, `SettingsLayout` shows the index on its own at every width (attention on top), and its title can be an `h1`. `AttentionList` callback actions load while they run and show a returned `{ error }` or a rejection.
