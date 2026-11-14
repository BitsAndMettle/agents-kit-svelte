---
'agents-kit-svelte': minor
---

**Board**, a new collection at `agents-kit-svelte/board`, for a board of work whose lanes and cards are yours:

- `StatusStrip`: the one line above a board. What is going on right now (with a tone), the numbers that matter (formatted like `MetricTiles` metrics) and your actions. In a narrow container the numbers wrap under the status.
- `BoardLanes`: lanes as data, cards as your snippet. Each lane shows its label and count, with its cards under group headings. As many lanes sit side by side as fit; the rest wrap, down to one column on a phone.
- `CardFace`: a card in a lane. A reference, the title, one status line with a tone, your badges and your actions. With `href` or `onSelect` the whole card opens through its title, the single tab stop, and the actions stay separately clickable.

**Notice**, a new primitive: a warning the person can always dismiss. It is an `Alert` whose dismiss button is not optional and is named after the notice.

**Alert**: `onDismiss` may return a promise. The alert waits for it, marked busy, and ignores a second press.

`STRETCHED`, a new style recipe: the one-tab-stop clickable surface that `Card` and `CardFace` share.
