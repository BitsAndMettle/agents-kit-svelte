---
'agents-kit-svelte': patch
---

Chat on phones: `PromptInput` writes at 16px on phones and touch screens so iOS no longer zooms in when the text field takes focus (15px stays on wide screens with a mouse). The send and stop buttons are 44px on phones, and tapping send keeps focus, and the keyboard, in the text field. `ChatWorkbench` loads its scripted demo only when `demo` is set, so apps that show their own data no longer download it; the demo now renders in the browser only.
