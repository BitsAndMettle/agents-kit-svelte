---
'agents-kit-svelte': minor
---

FeatureLineage: `node`, a snippet that draws each node yourself, makes the graph a canvas. It opens on the whole graph fitted to its width (never under 0.7 of a node's size, then centred on the node that runs); a drag pans and opens nothing; the wheel zooms about the pointer and hands the page its scroll back at either end; two fingers pinch; −, Fit and + sit in the foot, and `+`, `−`, `0` and the arrows work with focus in the graph; keyboard focus pans a node into view. `nodeSize`, `direction` (`auto` stands upright under 40rem), `levels` (a label a level) and `legend` go with it, and a line that skips a level goes round the nodes between. A `LineageEdge` takes `met` (false is dashed) and `route` (`live` flows, `stopped`, `longest`), and its `rel` is optional. CardFace takes `density="compact"` (tighter, the title two lines at most) and `mark`, a mark of at most 16px at the end of the reference line. Without the new props both render as before.
