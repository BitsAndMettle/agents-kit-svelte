---
'agents-kit-svelte': minor
---

The Studio chrome: the bar and the chat at the Studio design's measure, each behind a prop. Nothing an existing app draws changes; every default and `chrome="quiet"` render as before.

- `AppShell` takes `chrome="studio"` (default `"soft"`, today's bar): a 56px bar on the card surface over a `card-border` hairline, the name at 16px bold from 640px, the places as flat 14px links 30px tall with an 8px radius, the one on screen filled (`bg-canvas-secondary`, semibold) and the rest muted, counts as solid badges, and 24px between the bar's groups from 1024px. Its inset is 20px, or the page's 24px with `maxWidth`. On a phone the places stay a row of their own with 40px links. `mark` is a snippet drawn before the name in either chrome, e.g. a 20px logo.
- `ChatWorkbench` takes `chrome="studio"`: quiet chrome at the design's measure. Rails of 260px and 300px; rows at 14px, 34px tall with a mouse (44px on touch and in the tab panel), 1px apart, muted until on screen; a 6px dot, with a neutral one on a row without a `mark` once any row has one; a 40px New conversation row. The title line is 15px medium, then `subtitle` muted at 13px, then `status` at the end of the line after its dot, then `headerActions`, and it wraps, so a long title puts the status under it. The log is 720px wide with 36px between turns over a 656px composer, and messages are `plain`.
- `ChatWorkbench` takes `newConversationLabel` (default "New conversation") and `searchLabel`: a search field over the list, in the sidebar and the phone's tab panel, named and captioned by it. Typing narrows the rows to the titles that hold it, and "No matches." says a miss. `messageFooter` is also given the kit's classes for a row of quiet text actions and a row of suggestion chips (`{ actions, action, chips, chip }`), 44px on touch. `ChatWorkbenchStatus.tone` takes `accent`.
- `Message` takes `plain`: no avatar, one muted 12px line "Name · time" over the text at a 1.7 line height, 12px between its parts. A user message is its bubble alone, at most 78% wide from 640px; its author and time stay for screen readers.
- `NativeSelect` takes `size="studio"` (36px, an 8px radius, 13px text) and `mono` (the monospace face, e.g. for repository names).
- `Progress` takes `size="xs"`: a 2px track in `card-border`, which shows on a tinted rail.
- `MessageScroller` merges `contentClass` through `cn()`, as every `class` is, so a utility you pass replaces the kit's instead of sitting beside it.
