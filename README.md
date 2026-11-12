# Agents Kit Svelte (`agents-kit-svelte`)

A **Svelte 5 Runes** component collection for AI agent interfaces—inspired by the look of [`agents-ui/agents-kit`](https://agents-ui.github.io/agents-kit/), built fresh for Svelte 5, with **`ChatWorkbench`**, **GitHub Cards & Reactive Kanban/Bento Layouts**, and a **Schema-Driven Intelligent UI Engine**.

---

## Highlights

- **182 Svelte 5 Runes Components** (`$props()`, `$state()`, `$derived()`, `$effect()`, `Spring`, `Tween`, `crossfade`, `flip`, `SvelteSet`, `SvelteMap`) across 12 collections:
  1. **beUI Agents (29)**: `ChatWorkbench` (your conversation, or the scripted `demo`), `Markdown` (model text rendered safely), `AgentActivity`, `TodoList`, `ToolApproval`, `ToolResult`, `FileDiff`, `CodeBlock`, `ApprovalCard`, `PromptInput`, `Message`, `MessageBubble`, `MessageScroller`, `StreamingResponse`, `Citations`, `ImageGeneration`, `AISidebar`, `ThinkingShimmer`, `AgentProgress`, `ReasoningText`, `AgentDisclosure`, `AgentWorkTrace`, `PresenceBanner` (whether the operator, or your phone's own link, is reachable, since when, with one action), `ActionReceipt` (one thing an agent did or refused on your behalf, with why and the run that proposed it), `LevelDial` (how much an agent may do on its own, with a confirm that names what changes when you raise it), `RiskToggle` (a setting that stays off until you tick that you understand the risk), `DeviceApprovalCard` (approve a new device once its code matches on both screens) and `CitedAnswer` (an answer given on your behalf with the quoted sources it rests on, each marked checked or not).
  2. **Beautiful UI (11)**: `ToolChips`, `RecommendationCard`, `InsightCards`, `ContextCards`, `Flowchart`, `FineTuneCard`, `SearchList`, `FilterTable`, `SelectionActions`, `RecordsTable`, `DiffTable`.
  3. **GitHub Cards & Layouts (18)**: `GitHubIssueCard`, `GitHubPullRequestCard`, `GitHubCommitCard`, `GitHubChecksPanel`, `GitHubReviewThreadCard`, `GitHubBentoLayout`, `GitHubKanbanBoard`, plus the dev lifecycle set: `GitHubLifecycleTimeline`, `GitHubIssueTriage`, `GitHubBranchCard`, `GitHubPullRequestReview`, `GitHubMergeQueue`, `GitHubDeploymentPipeline`, `GitHubReleaseCard`, `GitHubIncidentCard`, plus the in-chat PR flow: `GitHubPrActionBar` (Create PR with a diff stat), `GitHubPullRequestGraph` (a PR card with its commit graph) and `GitHubChecksWaterfall` (live CI bars with Fix and Merge). Watch an agent take a PR from diff to merged on the `/pr-flow` page.
  4. **Intelligent UI & Generative (3)**: `IntelligentUIRenderer`, `AgentGenerativeSurface`, `ResultActions`.
  5. **Agents UI Orchestration (13)**: `BlockedWorkList` (what is stuck, grouped by reason, with only the actions you allow and inline confirm), `FleetStatus` (the machines that run agent work: reachability, busy slots, what each is running and any missing safeguard), `AgentContextMeter`, `AgentThinkingIndicator`, `AgentTaskQueue`, `AgentCheckpoint`, `AgentToolPalette`, `AgentArtifact`, `AgentFormGenerator`, `AgentOrchestrator`, `AgentRoutingHub`, `AgentEvaluator`, `AgentSequentialWorkflow`, `AgentParallelProcessor`, `AgentOpsMonitor`.
  6. **AI Elements & Coding (13)**: `ChainOfThought`, `PlanCard`, `PromptSuggestions`, `WebPreview`, `FileTree`, `Terminal`, `TestResults`, `StackTrace`, `SchemaDisplay`, `EnvironmentVariables`, `PackageInfo`.
  7. **Agentic Skills (6)**: `SkillLibrary`, `SkillCard`, `SkillRouter`, `SkillInvocation`, `SkillEditor`, `SkillProposalCard`, plus `rankSkills`, `validateSkillManifest`, `serializeSkillManifest`, `parseSkillManifest` and `diffSkillLines` helpers. Try them together on the `/skills` studio page.
  8. **Charts & Timelines (10)**: `GenerativeChart` (line, area or bar charts an agent emits as a JSON spec, with callouts), `AgentHandoffGantt` (who held the work, when, and what they handed on), `ModelPhaseStream` (which model ran each phase, with escalations and fallbacks), `MetricTiles` (headline numbers with change, trend and capacity), `FeatureCard` (a Feature's criteria, cards by state, attempts, PRs and token budget), `FeatureProposalCard` (a proposed Feature whose cards you edit, then approve once), `FeatureLineage` (a Feature's cards, attempts, PRs, releases and incidents as a graph you can trace and fold), `FeatureTimeline` (planned vs actual per card, with a forecast ship date), `TokenBurnChart` (spend against budget with a burn-rate projection) and `RunReplayScrubber` (play, scrub and skip through a run), plus dependency-free scale and replay helpers. Every span, handoff, phase and point takes a click handler, so a click can open the diff or tests that were handed off. Replay a run on the `/charts` page, and explore a Feature on the `/features` page.
  9. **Voice & Effects (3)**: `Svelte5MotionLab`, `VoiceWaveVisualizer`, `BorderBeam`.
  10. **Primitives (38)**, the building blocks the rest is made of, built on the headless layer: `Button`, `IconButton`, `ButtonGroup`, `Toggle`, `ToggleGroup`; `Field`, `Input`, `Textarea`, `Checkbox`, `Switch`, `RadioGroup`, `NativeSelect`, `Slider`; `Badge`, `Avatar`, `AvatarGroup`, `Card`, `Separator`, `Kbd`, `Skeleton`, `Spinner`, `Progress`, `Alert`, `EmptyState`; `Tabs`, `Accordion`, `Breadcrumb`, `Pagination`; `Dialog`, `AlertDialog`, `Sheet`, `Popover`, `Tooltip`; `DropdownMenu`, `ContextMenu`, `Select`, `Combobox`, `CommandPalette` (⌘K). Every one works by keyboard, passes an axe scan in light and dark, and form controls submit and reset in a plain `<form>`.
  11. **Auth (16)**, sign-in, sign-up, recovery, two-factor and account screens that draw the UI and report intent, with no auth logic: `AuthCard`, `PasswordInput`, `OtpInput`, `ProviderButton`, `PasskeyButton`; `SignInCard`, `SignUpCard`, `MagicLinkSent`, `TwoFactorCard`; `ForgotPasswordCard`, `ResetPasswordCard`, `TwoFactorSetup`; `AccountMenu`, `SessionList`, `VerifyEmailBanner`, `BackupCodes`. Forms are real `<form method="post">` elements, so they post without JavaScript and take SvelteKit's `enhance`; field names and `autocomplete` tokens are fixed for password managers; the default wording never reveals whether an account exists; and every word can be replaced through `labels`. Your app calls the server, checks codes and keeps the tokens. No brand logos: providers take your icon.
  12. **Settings (22)**, generic settings containers and controls that render and report intent, never fetch or persist: `SettingsLayout`, `SettingsNav`, `SettingsPage`, `SettingsSearch`, `AttentionList`; `SettingsSection`, `SettingsRow`, `SettingsFacts`, `SettingsToggle`, `RequestedChange`, `LockReason`; `SettingsForm`, `SaveBar`, `ChangeNotice`, `ConflictResolver`, `ConsequenceList`, `ConsequenceDialog`; `ChoiceCards`, `NotificationMatrix`, `SettingsItemList`, `UsageMeter`, `CopyValue`. Four change models share one layer: instant (saves at once, with Undo), staged (a draft with a save bar, conflict review and a leave guard), confirmed (consequences and a typed phrase) and locked (one reason, the strongest lock wins). Every mutation is a real `<form method="post">` that works without JavaScript, layout follows the container rather than the viewport, and every word can be replaced through `labels`.
- **OKLCH Semantic Design Tokens**: Automatic Light & Dark theming via CSS custom properties (`bg-canvas-primary`, `bg-card-bg`, `text-fg-main`, `border-card-border`) with layered hairline elevation (`--shadow-card`, `--shadow-btn`).
- **Static GitHub Pages Ready**: Pre-configured with `@sveltejs/adapter-static`, `BASE_PATH` support, and `.github/workflows/deploy-pages.yml`.

---

## Install

```bash
pnpm add agents-kit-svelte   # or: npm install / yarn add / bun add
```

Requires **Svelte 5** and **Tailwind CSS v4** (SvelteKit or any Vite + Svelte app). In your main CSS file:

```css
@import "tailwindcss";
@import "agents-kit-svelte/theme.css";
@source "../node_modules/agents-kit-svelte/dist";
```

The theme provides the design tokens and light/dark palettes (toggle dark mode with a `dark` class or `data-theme="dark"` on `<html>`). The `@source` line lets Tailwind generate the utility classes the components use; adjust the relative path if your CSS file is not in `src/`.

```svelte
<script lang="ts">
	import { ThinkingShimmer, TodoList, type TodoItem } from 'agents-kit-svelte';

	const items: TodoItem[] = [
		{ id: '1', label: 'Install agents-kit-svelte', status: 'completed' },
		{ id: '2', label: 'Ship your agent UI', status: 'in-progress' }
	];
</script>

<ThinkingShimmer label="Planning the next step…" />
<TodoList title="Getting started" {items} />
```

A step-by-step guide with live output is on the showcase site under **Install**.

### Entry points

Import everything from `agents-kit-svelte`, or from one collection to keep editor auto-imports focused. Unused components are tree-shaken either way; a page that imports only `TodoList` builds to about 91 KB of JavaScript (Svelte runtime and `tailwind-merge` included).

| Import | Contains |
| --- | --- |
| `agents-kit-svelte/chat` | Messages, composer, activity, todos, tool approval and results, diffs, code, terminal, context meter, checkpoints, operator cards (`PresenceBanner`, `ActionReceipt`, `LevelDial`, `RiskToggle`, `DeviceApprovalCard`, `CitedAnswer`), `ChatWorkbench` |
| `agents-kit-svelte/github` | Issue, PR, commit, checks and review cards, Kanban and bento layouts, the dev-lifecycle set |
| `agents-kit-svelte/skills` | Skill library, card, router, invocation, editor, proposal card and their helpers |
| `agents-kit-svelte/workflows` | Orchestrator, routing hub, task queue, blocked-work list, fleet status, parallel and sequential workflows, evaluator, ops monitor |
| `agents-kit-svelte/generative` | `IntelligentUIRenderer`, `AgentGenerativeSurface`, `ResultActions` |
| `agents-kit-svelte/charts` | `GenerativeChart`, `AgentHandoffGantt`, `ModelPhaseStream`, `MetricTiles`, `FeatureCard`, `FeatureProposalCard`, `FeatureLineage`, `FeatureTimeline`, `TokenBurnChart`, `RunReplayScrubber`, lineage layout, scale helpers and run replay (`spansAt`, `handoffsAt`, ...) |
| `agents-kit-svelte/data` | Tables, insight and recommendation cards, flowchart, search list, tool chips |
| `agents-kit-svelte/effects` | `BorderBeam`, `Svelte5MotionLab` |
| `agents-kit-svelte/primitives` | The Primitives collection (`Button`, `Field`, `Input`, `Dialog`, `DropdownMenu`, `Select`, `Combobox`, `Tabs`, `Tooltip`, … 38 in all), plus the style recipes (`buttonClass`, `SURFACE`, ...), `cn()`, motion helpers, `AgentDisclosure`, `ThinkingShimmer` |
| `agents-kit-svelte/auth` | The Auth collection (`SignInCard`, `SignUpCard`, `OtpInput`, `PasswordInput`, `TwoFactorSetup`, `AccountMenu`, `SessionList`, … 16 in all), plus `AuthSubmit`, `Cooldown` and the shared types (`AuthResult`, `AuthProvider`, `AuthUser`, `AuthSession`) |
| `agents-kit-svelte/settings` | The Settings collection (layout, navigation, search, sections, rows, staged saving, confirmations, locks and settings controls; the catalogue lists every component), plus its shared layer: the instant and staged change models (`InstantSetting`, `SettingsDraft`), locks (`pickLock`, `lockAttrs`, `LOCK_LABELS`), settings search (`searchSettings`, `toPaletteCommands`), typed confirmation (`matchesPhrase`, `phrasePattern`), recipes and the shared types |
| `agents-kit-svelte/headless` | Accessible behaviour with no markup or styles: `Dialog`, `Popover`, `Menu`, `Select`, `Combobox`, `Listbox`, `Tooltip`, `Tabs`, `Accordion`, `RadioGroup`, `ToggleGroup`, and `ListNav` for your own composites |
| `agents-kit-svelte/core` | Types, diff parsing, skill ranking, agent events, `AgentSession` and the Claude adapters. No components, safe on a server. |
| `agents-kit-svelte/fixtures` | Sample data for demos and tests. Not exported from the root. |
| `agents-kit-svelte/theme.css` | `--ak-*` design tokens and light/dark palettes |

### Customising

**Your data, your markup.** Components render what you pass and nothing else. They have no built-in sample data, and their demo animations are off unless you set `live`. Sample data for prototypes and tests is in `agents-kit-svelte/fixtures`:

```svelte
<script lang="ts">
	import { GitHubIssueCard } from 'agents-kit-svelte/github';
	import { SAMPLE_ISSUE } from 'agents-kit-svelte/fixtures';
</script>

<GitHubIssueCard issue={SAMPLE_ISSUE} />
```

**Attributes and classes reach the root.** Every component forwards extra attributes (`id`, `aria-*`, `data-*`, `style`, event handlers) to its root element. Your `class` is merged last with [tailwind-merge](https://github.com/dcastil/tailwind-merge), so it replaces the matching kit utilities instead of fighting them:

```svelte
<TodoList {items} class="rounded-lg p-2 shadow-none" data-testid="plan" aria-label="Release plan" />
```

The same merge is exported as `cn()` from `agents-kit-svelte/primitives` for your own wrappers.

**Theme with tokens.** Every colour, radius, font and shadow is an `--ak-*` custom property. Set them on `:root` for the whole app, or on any wrapper to theme one area. They sit in an `agents-kit` cascade layer, so your CSS wins without `!important`:

```css
:root {
	--ak-color-accent: oklch(0.6 0.18 255);
	--ak-radius-card: 10px;
	--ak-font-sans: "Geist", system-ui, sans-serif;
}

.support-panel {
	--ak-color-surface: oklch(0.98 0.01 250);
}
```

The main tokens are `--ak-color-canvas`, `-canvas-subtle`, `-surface`, `-fg`, `-fg-muted`, `-fg-inverse`, `-border`, `-border-subtle`, `-accent`, `-accent-subtle`, `-success`, `-warning`, `-danger` and `-info` (each status with a `-subtle` pair), plus `--ak-radius-{chip,control,card,window,bubble,composer}`, `--ak-font-{sans,mono,display}` and `--ak-shadow-{card,btn,soft,soft-sm}`. The chat follows the main accent and canvas; set `--ak-chat-accent` or `--ak-chat-surface` to give it its own. Dark values apply under `.dark` or `[data-theme="dark"]`, or under `[data-theme="system"]` when the OS prefers dark. The Tailwind utility names (`bg-card-bg`, `text-fg-main`, ...) are unchanged.

Themes written for 0.1 against `--color-*-val` variables still work in this release and stop working in the next minor.

---

## Headless behaviour (`agents-kit-svelte/headless`)

The hard accessibility behaviours, as Svelte 5 classes you construct once and spread onto your own markup. No runtime dependencies; built on the platform: `<dialog>` for modals, the `popover` attribute and top layer for floating surfaces, CSS anchor positioning with a built-in fallback. Requires Svelte 5.29 or later.

```svelte
<script lang="ts">
	import { Menu } from 'agents-kit-svelte/headless';
	const id = $props.id();
	const menu = new Menu({ id });
</script>

<button {...menu.trigger}>Options</button>
<div {...menu.content}>
	<div {...menu.item({ value: 'copy', onSelect: copy })}>Copy</div>
	<div {...menu.item({ value: 'delete', onSelect: remove })}>Delete</div>
</div>
```

One document-wide layer stack owns which surface is on top, so Escape and outside presses close the topmost layer only (a menu inside a dialog closes first), focus returns to the trigger, and the page scroll locks under modals. Parts carry attributes and one attachment, never event handlers, so two parts compose on one element (`<button {...menu.trigger} {...tip.trigger}>`) and your own `onclick` is never overridden. Style with data attributes: `data-state`, `data-side`, `data-highlighted`, `data-selected`, `data-disabled`, and the `--ak-available-height` / `--ak-anchor-width` variables. The design and its reasoning are in [docs/headless/DESIGN.md](docs/headless/DESIGN.md).

## Connecting a real agent

The chat components take plain data, so you can feed them from any agent runtime. The kit ships a small data layer for that:

- **`AgentEvent`**: one event union for text and thinking deltas, tool calls and results, approvals, todos, usage and errors.
- **`AgentSession`**: a Svelte 5 runes class that folds events into reactive state (`messages`, `toolCalls`, `todos`, `usage`, `status`).
- **Selectors** that turn that state into component props: `toActivityItems`, `toApprovalParams`, `messageText`, `contextTokens`, `pendingApprovals`.
- **Adapters** for Claude: `fromClaudeAgentSdk` (Claude Agent SDK `query()` messages) and `fromMessagesStream` (Messages API streaming events). They are typed structurally, so the kit doesn't depend on either SDK.

```svelte
<script lang="ts">
  import {
    AgentActivity, TodoList, ToolApproval, AgentSession,
    fromClaudeAgentSdk, toActivityItems, toApprovalParams, pendingApprovals
  } from 'agents-kit-svelte';

  const session = new AgentSession();
  // Stream SDK messages from your server (e.g. as server-sent events), then:
  // await session.consume(fromClaudeAgentSdk(messages));
</script>

<AgentActivity items={toActivityItems(session.state)} />
<TodoList items={session.state.todos} />
{#each pendingApprovals(session.state) as call (call.id)}
  <ToolApproval
    tool={call.name}
    params={toApprovalParams(call.input)}
    onApprove={() => session.resolveApproval(call.id, true)}
    onDeny={() => session.resolveApproval(call.id, false)}
  />
{/each}
```

Approvals come from the Agent SDK's `canUseTool` callback rather than its message stream. When the SDK runs in the same process as the UI, `await session.requestApproval(toolUseID, { params })` inside that callback resolves once the user clicks. When it runs on a server, send an `approval.request` event to the browser alongside the messages, and post the user's answer back from `onApprove` / `onDeny`. For another runtime, write an adapter that yields `AgentEvent`s; see `src/lib/core/agent/adapters.ts` for the pattern.

### A whole chat: `ChatWorkbench`

`ChatWorkbench` draws a conversation you own: a header, the messages, past conversations and the composer. It fills its parent's height, so give the parent one. You keep the state; the workbench raises events and never replies on its own (`demo` plays the scripted session from the docs site instead).

```svelte
<script lang="ts">
  import { ChatWorkbench, type ChatWorkbenchMessage, type PromptAttachment } from 'agents-kit-svelte/chat';

  let messages = $state<ChatWorkbenchMessage[]>([]);
  let model = $state('sonnet');
  let effort = $state('medium');
  let card = $state<PromptAttachment[]>([{ id: 'card-212', label: '#212 · owner/repo' }]);

  async function send(text: string, attachments: PromptAttachment[]) {
    messages.push({ id: crypto.randomUUID(), role: 'user', text });
    // ...call your agent, then push { role: 'assistant', text, parts: [{ type: 'tool', tool: 'list_cards', status: 'success' }] }
  }
</script>

<div class="h-[100dvh]">
  <ChatWorkbench
    title="Referee"
    subtitle="devbox"
    status={{ text: 'Online', tone: 'success' }}
    assistantName="Referee"
    {messages}
    conversations={[{ id: 'c1', title: 'What is blocked?', date: 'Nov 12', active: true }]}
    onSelectConversation={(id) => load(id)}
    onNewConversation={() => (messages = [])}
    models={[{ id: 'sonnet', label: 'Sonnet' }, { id: 'opus', label: 'Opus' }]}
    efforts={[{ id: 'medium', label: 'Medium' }, { id: 'high', label: 'High' }]}
    bind:model
    bind:effort
    bind:attachments={card}
    placeholder="Message the Referee"
    onSend={send}
  >
    {#snippet headerActions({ button })}<button class={button}>Pause</button>{/snippet}
  </ChatWorkbench>
</div>
```

- **Messages**: `role`, Markdown `text`, and `parts` drawn in order (`text`, `tool` as `ToolResult`, `activity` as `AgentActivity`, `note`). `status: 'streaming'` shows a thinking line until text arrives; `'error'` shows `statusText` in red. `busy` adds a thinking line after the last message.
- **Layout**: with `conversations`, a sidebar from 1024px and Chat / Conversations tabs below it; `layout="panel"` keeps the tabs at any width, for a side panel. `view` is bindable. Without `conversations` there is no list.
- **Header**: `title` (an `h2`, or `headingLevel`), `subtitle`, `status` (`text` and a `tone`), `headerActions` (given the kit's pill classes), and a `presence` banner above the messages.
- **Snippets**: `empty` when there are no messages, `messageFooter(message)` after each one.
- **Composer**: `value` (bindable), `placeholder`, `disabled`, `busy` with `onStop`, `attachments` (bindable) with `onRemoveAttachment`, `models` and `efforts` with `onModelChange({ model, effort })`, and `onSend(text, attachments)`.

`Markdown` (also used by `Message` and `StreamingResponse` when you pass `text`) renders model text as elements and never as HTML: raw HTML stays text, links need an `http(s):` or `mailto:` address and open with `rel="noopener noreferrer nofollow"`, fenced code goes through `CodeBlock`, and parsing is linear in the input. The [`/workbench`](https://bitsandmettle.github.io/agents-kit-svelte/workbench/) page shows the workbench with app data.

---

## Showing GitHub data

The GitHub cards take plain objects. `fromGitHubRest` (from `agents-kit-svelte/core`) turns REST API responses into them, so you keep your own token and fetching:

```ts
import { fromGitHubRest } from 'agents-kit-svelte/core';

const { data } = await octokit.rest.pulls.get({ owner, repo, pull_number });
const runs = await octokit.rest.checks.listForRef({ owner, repo, ref: data.head.sha });
const pr = fromGitHubRest.pullRequest(data, { checks: runs.data.check_runs });
```

There are mappers for `issue`, `pullRequest`, `checkRun` and `commit`. Times come out as `12m ago` by default; pass `formatTime` to change that, and `labelTone` to choose label colours.

## Rendering model output with your own components

`IntelligentUIRenderer` turns a list of `{ id, component, props }` nodes into components. Add your own node types, or replace ours, with a registry:

```svelte
<script lang="ts">
	import { IntelligentUIRenderer, defineUIRegistry } from 'agents-kit-svelte/generative';
	import WeatherCard from './WeatherCard.svelte';

	const registry = defineUIRegistry({
		'weather-card': {
			component: WeatherCard,
			required: ['city'],
			// Optional: adapt props and wire callbacks to onIntent.
			props: (props, emit) => ({ ...props, onRefresh: () => emit('refresh', String(props.city)) })
		}
	});
</script>

<IntelligentUIRenderer {nodes} {registry} onIntent={(intent) => console.log(intent)} />
```

A node that lacks a `required` prop, or names an unregistered type, renders a short note instead of breaking the list. `defaultUIRegistry` lists the built-in types.

## Local Development

```bash
corepack enable
corepack pnpm install

# Start interactive showcase dev server
corepack pnpm dev

# Run Svelte 5 type & warning checks
corepack pnpm check

# Run unit & Svelte 5 compliance tests
corepack pnpm test

# Run Playwright browser E2E suite
corepack pnpm test:browser

# Build the npm package into ./dist (svelte-package + publint)
corepack pnpm package

# Pack the library, install it into a fresh Svelte + Tailwind app, type-check and build it
corepack pnpm test:install
```

Releases are managed with Changesets; see [RELEASING.md](RELEASING.md).

---

## Deploying to GitHub Pages (`github.io`)

1. Create a public GitHub repository (e.g. `agents-kit-svelte`):
   ```bash
   gh repo create agents-kit-svelte --public --source=. --remote=origin --push
   ```
2. Enable GitHub Pages via GitHub Actions:
   - In your repository on GitHub, open **Settings → Pages**.
   - Under **Build and deployment → Source**, select **GitHub Actions**.
3. Every push to `main` automatically runs [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml), sets `BASE_PATH=/<repo-name>`, builds the static site into `./build`, and publishes to:
   `https://<your-username-or-org>.github.io/agents-kit-svelte/`

---

## Credits & License

Agents Kit Svelte stands on other people's work, and we want that to stay visible.

- **Agents Kit for React.** This library is inspired by the look of [`agents-ui/agents-kit`](https://github.com/agents-ui/agents-kit) by Emiliano. It was built fresh, and no code was copied or translated from it. See [NOTICE](NOTICE).
- **Claude Code.** The warm, soft visual style is inspired by the look and feel of Claude Code by Anthropic. This is an independent project, not affiliated with or endorsed by Anthropic.
- **Lucide.** Icons come from [Lucide](https://lucide.dev) (ISC License).

### License

Licensed under the [Apache License 2.0](LICENSE). You can use, change and ship it, including commercially. If you redistribute the library or a work based on it, you must:

1. include a copy of the license,
2. keep the [NOTICE](NOTICE) file, which credits Agents Kit Svelte and the projects it builds on, and
3. say that you changed files, if you did.

A visible credit is appreciated too, for example: "UI components from [Agents Kit Svelte](https://github.com/BitsAndMettle/agents-kit-svelte), inspired by the look of Agents Kit."
