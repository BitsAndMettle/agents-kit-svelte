---
"agents-kit-svelte": minor
---

**ChatWorkbench renders your conversation.** It now takes `messages` (Markdown text and parts: tool results, activity, notes; `streaming` and `error` status), a header (`title`, `subtitle`, `status` with a tone, `headingLevel`, a `headerActions` snippet), a `presence` banner, `conversations` with `onSelectConversation` and `onNewConversation` (a sidebar from 1024px, Chat and Conversations tabs below it, or tabs at any width with `layout="panel"`), and a composer (`value`, `placeholder`, `disabled`, `busy`, `attachments`, `models`/`efforts` with `onModelChange`, `onSend(text, attachments)`, `onStop`). `empty` and `messageFooter` snippets fill in the rest. It fills its parent's height and has no `<main>` landmark. The scripted session moved behind `demo`.

**Markdown.** A new `Markdown` component (and `parseMarkdown`) renders model text as elements, never as HTML: raw HTML stays text, links need an http(s) or mailto address and open with `rel="noopener noreferrer nofollow"`, fenced code goes through `CodeBlock`, and parsing is linear in the input. `Message` and `StreamingResponse` take `text` and render it with it.

**PromptInput.** The picker takes options that are not agents (`detail`, or no second line at all), an `efforts` row with `selectedEffort` and `onEffortChange`, and a `pickerLabel`. Chips and the `+` menu are props (`attachments`, bindable, with `onRemoveAttachment`; `contextOptions`), there is a `disabled` prop, and Escape returns focus to the button that opened a menu.

### Breaking
- `<ChatWorkbench />` without props is now an empty workbench; pass `demo` for the scripted session.
- `PromptInput` no longer shows a demo worktree chip, a demo `+` menu or a `Backend v2` skill label: pass `attachments`, `contextOptions` and `activeSkill`. `onQuickContext` receives the attachment id. Its picker's accessible name is now `{pickerLabel}: {choice}` (default `Run with: …`), and the Stop button shows only with `onStop`.
