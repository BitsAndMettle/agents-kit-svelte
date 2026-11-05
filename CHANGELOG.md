# agents-kit-svelte

## 0.2.0

### Minor Changes

- 792ac53: Theming: every colour, radius, font and shadow is now a public `--ak-*` token, declared in an `agents-kit` cascade layer so host CSS wins without `!important`. Tokens can be set on `:root` or on any wrapper, and `[data-theme="system"]` follows the OS colour scheme. The chat accent now follows the main accent unless `--ak-chat-accent` is set.
  
  Each component merges your `class` last with tailwind-merge, so your utilities replace the kit's. The helper is exported as `cn()` from `agents-kit-svelte/primitives`.
  
  Deprecated: the `--color-*-val` variables still work as overrides in this release and are removed in the next minor.
- fe510c5: Add the Charts & Timelines collection (`agents-kit-svelte/charts`): `GenerativeChart` draws line, area and bar charts from a JSON spec an agent emits, with callouts; `AgentHandoffGantt` shows which agent held the work and what it handed on; `ModelPhaseStream` shows which model ran each phase, with escalation, fallback and swap markers. Every span, handoff, lane, phase, marker and point is clickable through your own handler (`onSelectSpan`, `onSelectHandoff`, `onSelectLane`, `onSelectPhase`, `onSelectEvent`, `onSelectPoint`), and handoffs carry a `kind` and a `data` payload so a click can open the diff, tests or file that was passed. All three are registered for `IntelligentUIRenderer`, share new `--ak-chart-1` to `--ak-chart-6` colour tokens, and come with scale and run-replay helpers and sample data in `agents-kit-svelte/fixtures`.
- 41b17f3: Rename `TrailsideClaudeChat` to `ChatWorkbench`. `TrailsideClaudeChat` still works as a deprecated alias and will be removed in the next major release; replace the import to move over:
  
  ```diff
  - import { TrailsideClaudeChat } from 'agents-kit-svelte/chat';
  + import { ChatWorkbench } from 'agents-kit-svelte/chat';
  ```
- 1d2da5d: Add collection entry points: `agents-kit-svelte/chat`, `/github`, `/skills`, `/workflows`, `/generative`, `/data`, `/effects`, `/primitives`, `/core` and `/fixtures`. The root import still exports every component and helper.
  
  Breaking: the site-only `CATALOG_ITEMS` catalogue and `validateSvelte5ComponentSource` audit are no longer part of the package, and the skill sample data (`SAMPLE_SKILLS` and friends) moved from the root to `agents-kit-svelte/fixtures`. `sideEffects` now lists only CSS.
- 792ac53: Components no longer fall back to demo data. Lists default to empty, the main label or record a component shows is required, and descriptions, timestamps and stats are hidden when not passed. Demo loops (`live`) are off by default. All the old samples are exported from `agents-kit-svelte/fixtures`.
  
  Every component now forwards extra attributes (`id`, `aria-*`, `data-*`, `style`, handlers) to its root element. `AgentToolPalette` builds its category tabs from the tools you pass (`ToolCategory` is now `string`), with `categoryLabels` and `defaultSelectedId`.
- 02e4cd5: Export the data types declared inside components (for example `AgentTask`, `SubAgent`, `ParallelLane`, `EvalIteration`, `InsightCard`, `FormField`) from `/chat`, `/data`, `/effects` and `/workflows`, as well as the package root, so you can type the data you pass in. The catalogue's usage examples now use the real props and types, and the install test type-checks every one of them.
- b9ec936: `IntelligentUIRenderer` takes a `registry` prop: map node types to your own components (or replace the built-in ones) with `defineUIRegistry()`. Built-in node types live in `defaultUIRegistry`. Nodes missing a required prop, or naming an unknown type, render a short note. The renderer no longer invents sample data for nodes that omit props, and it now passes every node prop through to the component.
  
  New in `agents-kit-svelte/core`: `fromGitHubRest.issue`, `.pullRequest`, `.checkRun` and `.commit` map GitHub REST responses to the card types, with `formatRelativeTime`, `formatDuration` and `labelTone` helpers.
  
  Types: `DynamicUINode.component` and `SupportedAgentId` accept any string. `GitHubPullRequestData.riskTier` and `refereeStatus` are optional, and `PlanCard` shows a risk badge only when `riskTier` is passed.
