---
'agents-kit-svelte': minor
---

Rails that read as rails: each palette sets `color-scheme`, so scrollbars and native controls follow dark. `ChatWorkbench`'s rails take the subtle canvas tint (`bg-canvas-secondary`). A conversation row is one line, its `date` at the end, and takes `group` (a label above each run of rows with the same group, e.g. `Today`) and `mark` (a dot coloured by that key, e.g. the repository's name, which is also its spoken name); `subtitle` is a second line on a row without a mark. The sidebar's head is one New conversation row, with "Conversations" kept as the rail's name. Changing the `active` conversation takes the messages to their end (`MessageScroller` gains `scrollKey`), and `headerMark={false}` leaves out the sparkle before the title.
