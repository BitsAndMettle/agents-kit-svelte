---
"agents-kit-svelte": minor
---

Ship the kit's fonts in the package. A new opt-in `agents-kit-svelte/fonts.css` loads Inter and JetBrains Mono. Both are variable woff2 files, subset to latin and latin-ext, with `font-display: swap`. Your bundler serves them from your own origin, so pages render in the kit's fonts under a `font-src 'self'` policy and no request goes to a font CDN. The fonts are under the SIL Open Font License 1.1, and their licence texts ship in `dist/fonts/`. The `--ak-font-*` stacks are unchanged.

`AppShell` takes `maxWidth`, which lines the bar's content up with a page of that width while the bar still spans the window. `Progress` takes `segments`: parts side by side, each with its own tone, e.g. done, building and needs you. The value text names each part.
