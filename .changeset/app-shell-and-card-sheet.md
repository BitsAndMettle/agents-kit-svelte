---
'agents-kit-svelte': minor
---

**AppShell**, a new primitive: the frame of an app. One bar with the app's name, the places to go and your controls, over the page.

- The item the current `path` is under is marked as the current page: `/board/42` is under `/board`.
- A `count` after a label shows a number, and `countLabel` says what it counts to a screen reader. Nothing shows for 0.
- The page scrolls with the document and the bar stays in view. A place marked `fill` gives its page exactly the space under the bar instead, for a page that does its own scrolling, such as a chat: that page takes `h-full`.
- On a phone the places are a row of their own under the name and the controls.

**CardSheet**, in `agents-kit-svelte/board`: one card in full, in a `Sheet`.

- The card's title names the sheet, with its `reference` and `status` under it.
- `facts` are what is known about the card, as a list of labelled values. A value can be a link and can carry a tone.
- A `question` shows its text as written and one button per option. Return a promise from `onAnswer` and the question waits for it, marked busy, and takes no other answer meanwhile.
- Your own content follows, and your `actions` are the foot of the sheet. They are given the function that closes it.
- Focus starts on what the sheet says, not on its first control, so a key pressed twice on a card answers nothing and presses nothing.
