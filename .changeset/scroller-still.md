---
'agents-kit-svelte': patch
---

`MessageScroller` keeps the reader's place. At the end, it follows new output at once, where it caught up with a smooth scroll that carried whatever was in view along with it. `smooth` now animates only the reader's own presses: a rail tick, and "Jump to latest", which was always smooth. Scrolled up, what is in view stays where it is when something above it grows: the viewport no longer turns the browser's scroll anchoring off (Safari has it from 27; before that, it moves as before).
