---
'agents-kit-svelte': minor
---

**Settings**, a new collection at `agents-kit-svelte/settings`, for settings that are saved as they are changed:

- `SettingsForm`: a form generated from a list of settings. Each row gets the control its value calls for: a switch for a boolean, a number box for a number, a select or a text box for a string. There is nothing to submit: each change is reported at once.
- `TierMatrix`: one choice per tier, with presets. Every tier picks one of the same options; a preset sets several tiers in one press and stays pressed while they match. A locked tier shows its choice and cannot be changed.

Both show a change at once and wait for the promise your `onChange` returns. Once it settles they show the value you pass in again, so a change you refuse snaps back.

Two new primitives:

- `ListRow`: one row in a list. A title (a link with `href`), a quieter line under it, small facts after the title and your buttons at the end. It is a list item, for your `<ul>`.
- `CopyCommand`: a command shown in full, with one button that copies it exactly and announces the copy. A long command wraps between its words.

**ChatWorkbench**: `trailing`, a snippet drawn after the last message, for a decision that waits for the person.

`ROW`, a new style recipe: the row that `ListRow`, `SettingsForm` and `TierMatrix` share.
