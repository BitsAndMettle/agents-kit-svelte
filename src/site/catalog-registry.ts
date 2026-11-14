import { AUTH_FIELDS } from './catalog/auth-fields.ts';
import { AUTH_ACCOUNT } from './catalog/auth-account.ts';
import { AUTH_SIGNIN } from './catalog/auth-signin.ts';
import { AUTH_RECOVERY } from './catalog/auth-recovery.ts';
import { SETTINGS_SHELL } from './catalog/settings-shell.ts';
import { SETTINGS_ROWS } from './catalog/settings-rows.ts';
import { SETTINGS_SAVE } from './catalog/settings-save.ts';
import { SETTINGS_CONTROLS } from './catalog/settings-controls.ts';
import { PRIMITIVES_ACTIONS } from './catalog/primitives-actions.ts';
import { PRIMITIVES_FORM } from './catalog/primitives-form.ts';
import { PRIMITIVES_DISPLAY } from './catalog/primitives-display.ts';
import { PRIMITIVES_NAVIGATION } from './catalog/primitives-navigation.ts';
import { PRIMITIVES_OVERLAYS } from './catalog/primitives-overlays.ts';
import { PRIMITIVES_MENUS } from './catalog/primitives-menus.ts';
import { BOARD } from './catalog/board.ts';

export type CatalogCategory =
	| 'beUI Agents'
	| 'Beautiful UI'
	| 'GitHub Cards & Layouts'
	| 'Board'
	| 'Intelligent UI & Generative'
	| 'Agents UI Orchestration'
	| 'AI Elements & Coding'
	| 'Agentic Skills'
	| 'Charts & Timelines'
	| 'Voice & Effects'
	| 'Primitives'
	| 'Auth'
	| 'Settings';

export interface CatalogItemMeta {
	slug: string;
	name: string;
	category: CatalogCategory;
	sveltePath: string;
	upstreamSource: string;
	description: string;
	usageSnippet: string;
}

const COLLECTION_ITEMS: CatalogItemMeta[] = [
	// 1. beUI Agents (22 components)
	// 1. beUI Agents (23 components)
	{
		slug: 'chat-workbench',
		name: 'ChatWorkbench',
		category: 'beUI Agents',
		sveltePath: 'src/lib/workbench/ChatWorkbench.svelte',
		upstreamSource: 'AK-S Dynamic Agentic Workbench · components/beui/components/agents/*',
		description:
			'A whole chat from your data: messages with safe Markdown and tool results, a header with status and actions, past conversations (sidebar or tabs) and a composer with a model and effort picker. `demo` plays the scripted session shown here.',
		usageSnippet: `<script lang="ts">
  import { ChatWorkbench, type ChatWorkbenchMessage } from 'agents-kit-svelte';

  let messages = $state<ChatWorkbenchMessage[]>([
    { id: '1', role: 'assistant', text: 'Two cards are **blocked**.' }
  ]);
</script>

<div class="h-[720px] overflow-hidden rounded-[14px] border border-card-border">
  <ChatWorkbench
    title="Referee"
    status={{ text: 'Online', tone: 'success' }}
    {messages}
    onSend={(text) => messages.push({ id: crypto.randomUUID(), role: 'user', text })}
  />
</div>`
	},
	{
		slug: 'chat-workbench-demo',
		name: 'ChatWorkbench demo',
		category: 'beUI Agents',
		sveltePath: 'src/lib/workbench/ChatWorkbenchDemo.svelte',
		upstreamSource: 'AK-S Dynamic Agentic Workbench · components/beui/components/agents/*',
		description:
			'The scripted session behind `<ChatWorkbench demo />`: AgentActivity, TodoList, FileDiff, ToolApproval, ApprovalCard, StreamingResponse, AgentContextMeter and PromptInput playing one coding run.',
		usageSnippet: `<script lang="ts">
  import { ChatWorkbench } from 'agents-kit-svelte';

  let darkTheme = $state(false);
</script>

<div class="h-[720px] overflow-hidden rounded-[14px] border border-card-border">
  <ChatWorkbench demo initialDark={darkTheme} />
</div>`
	},
	{
		slug: 'markdown',
		name: 'Markdown',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/Markdown.svelte',
		upstreamSource: 'agents-kit-svelte · safe Markdown for model replies',
		description:
			'Model text as elements, never HTML: paragraphs, headings, lists, quotes, inline code, bold, italic, http(s) and mailto links, and fenced code through CodeBlock. Linear-time parsing.',
		usageSnippet: `<script lang="ts">
  import { Markdown, Message } from 'agents-kit-svelte';

  const reply = 'Two cards are **blocked**:\\n\\n- one\\n- two\\n\\nSee [the Board](https://example.com).';
</script>

<Message role="assistant" author="Referee">
  <Markdown text={reply} />
</Message>`
	},
	{
		slug: 'agent-activity',
		name: 'AgentActivity',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/AgentActivity.svelte',
		upstreamSource: 'beUI · components/beui/components/agents/agent-activity',
		description:
			'Collapsible agent reasoning, tool, search, and file edit trace with +additions/-deletions counts.',
		usageSnippet: `<script lang="ts">
  import { AgentActivity, type ActivityItem } from 'agents-kit-svelte';

  const items: ActivityItem[] = [
    {
      id: 'act-1',
      type: 'text',
      label: 'Auditing SSR hydration readiness across interactive surfaces',
      status: 'complete'
    },
    {
      id: 'act-2',
      type: 'tool',
      label: 'Read',
      target: 'apps/web/src/routes/w/[workspaceSlug]/board/+page.svelte',
      status: 'complete'
    },
    {
      id: 'act-3',
      type: 'tool',
      label: 'Edit',
      target: 'apps/web/src/lib/components/CardRunDrawer.svelte',
      additions: 18,
      deletions: 4,
      status: 'complete'
    }
  ];
</script>

<AgentActivity
  {items}
  status="complete"
  durationSeconds={6}
  defaultOpen={true}
/>`
	},
	{
		slug: 'agent-disclosure',
		name: 'AgentDisclosure',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/AgentDisclosure.svelte',
		upstreamSource: 'beUI · components/beui/components/agents/agent-disclosure.tsx',
		description:
			'Svelte 5 slide + fade collapsible disclosure primitive with inert hidden state and reduced-motion support.',
		usageSnippet: `<script lang="ts">
  import { AgentDisclosure } from 'agents-kit-svelte';

  let open = $state(true);
</script>

<div class="space-y-2">
  <button
    type="button"
    onclick={() => (open = !open)}
    class="rounded-lg border border-card-border bg-canvas-secondary px-3 py-1.5 font-mono text-xs text-fg-main"
  >
    {open ? '▼ Collapse Disclosure' : '▶ Expand Disclosure'}
  </button>

  <AgentDisclosure {open}>
    <div class="rounded-xl border border-card-border bg-canvas-secondary p-3 font-mono text-xs text-fg-main">
      Accessible Svelte 5 slide+fade disclosure panel with inert hidden state.
    </div>
  </AgentDisclosure>
</div>`
	},
	{
		slug: 'todo-list',
		name: 'TodoList',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/TodoList.svelte',
		upstreamSource: 'beUI · components/beui/components/agents/todo-list.tsx',
		description:
			'Streaming task plan checklist with Svelte 5 Tween progress bar, animate:flip items, and completion counter.',
		usageSnippet: `<script lang="ts">
  import { TodoList, type TodoItem } from 'agents-kit-svelte';

  let items = $state<TodoItem[]>([
    { id: 't-1', label: 'Port beUI Agents & Beautiful UI to Svelte 5 Runes', status: 'completed' },
    { id: 't-2', label: 'Build GitHub Issue, PR, Commit, Checks & Kanban cards', status: 'completed' },
    { id: 't-3', label: 'Verify dynamic IntelligentUIRenderer schema engine', status: 'in-progress' },
    { id: 't-4', label: 'Run Playwright browser showcase verification', status: 'pending' }
  ]);
</script>

<TodoList
  title="Svelte 5 Port & Verification Plan"
  {items}
  defaultOpen={true}
/>`
	},
	{
		slug: 'tool-approval',
		name: 'ToolApproval',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/ToolApproval.svelte',
		upstreamSource: 'beUI · components/beui/components/agents/tool-approval.tsx',
		description:
			'Expandable tool permission prompt with Allow once, Always allow, Deny, and structured <dl> parameters.',
		usageSnippet: `<script lang="ts">
  import { ToolApproval, type ToolApprovalParam, type ToolApprovalStatus } from 'agents-kit-svelte';

  let status = $state<ToolApprovalStatus>('pending');

  const params: ToolApprovalParam[] = [
    { label: 'cwd', value: '/Users/gregory.winkler/agents-kit-svelte', code: true },
    { label: 'timeoutMs', value: '10000', code: true }
  ];
</script>

<ToolApproval
  tool="Bash"
  summary="corepack pnpm check && corepack pnpm test"
  {params}
  {status}
  onApprove={() => (status = 'approved')}
  onAlwaysApprove={() => (status = 'approved')}
  onDeny={() => (status = 'denied')}
/>`
	},
	{
		slug: 'tool-result',
		name: 'ToolResult',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/ToolResult.svelte',
		upstreamSource: 'beUI · components/beui/components/agents/tool-result.tsx',
		description:
			'Collapsible terminal & tool output stream with duration metadata, copy, and retry callbacks.',
		usageSnippet: `<script lang="ts">
  import { ToolResult } from 'agents-kit-svelte';

  const output = [
    '$ corepack pnpm check && corepack pnpm test',
    'svelte-check found 0 errors and 0 warnings',
    '✔ all 76 Svelte components in src/ comply with Svelte 5 Runes'
  ].join('\\n');
</script>

<ToolResult
  tool="Bash"
  summary="corepack pnpm test"
  status="success"
  meta="96ms · 9 passed"
  {output}
  defaultOpen={true}
/>`
	},
	{
		slug: 'file-diff',
		name: 'FileDiff',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/FileDiff.svelte',
		upstreamSource: 'beUI · components/beui/components/agents/file-diff.tsx',
		description:
			'Unified diff viewer with dual old/new line numbers, +additions/-deletions badges, and copy button.',
		usageSnippet: `<script lang="ts">
  import { FileDiff } from 'agents-kit-svelte';

  const patch = \`@@ -14,4 +14,5 @@
-  let open = false;
+  let { defaultOpen = false }: Props = $props();
+  let open = $state(false);\`;
</script>

<FileDiff
  filename="src/lib/agents/AgentActivity.svelte"
  {patch}
  defaultOpen={true}
/>`
	},
	{
		slug: 'code-block',
		name: 'CodeBlock',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/CodeBlock.svelte',
		upstreamSource: 'beUI · components/beui/components/agents/code-block.tsx',
		description:
			'Syntax-aware code block with line numbers, highlighted lines, copy action, and streaming/ready states.',
		usageSnippet: `<script lang="ts">
  import { CodeBlock } from 'agents-kit-svelte';

  const code = \`export function computeContextMeter(used: number, max: number) {
  const ratio = Math.min(1, used / Math.max(1, max));
  return { percent: Math.round(ratio * 100) };
}\`;
</script>

<CodeBlock
  filename="src/lib/state/chat-helpers.ts"
  language="typescript"
  {code}
  highlightLines={[2]}
/>`
	},
	{
		slug: 'approval-card',
		name: 'ApprovalCard',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/ApprovalCard.svelte',
		upstreamSource: 'beUI · components/beui/components/agents/approval-card',
		description:
			'Multi-step interactive clarifying question card with radio, checkbox, and custom write-in input.',
		usageSnippet: `<script lang="ts">
  import { ApprovalCard, type ApprovalQuestion, type ApprovalCardAnswers } from 'agents-kit-svelte';

  let recorded = $state<ApprovalCardAnswers | null>(null);

  const questions: ApprovalQuestion[] = [
    {
      id: 'q-scope',
      question: 'Which validation suites should run before opening the PR?',
      options: [
        {
          id: 'all',
          label: '(Recommended) Unit + SvelteCheck + Playwright Browser',
          description: 'Full end-to-end verification across Light and Dark themes.'
        },
        {
          id: 'fast',
          label: 'Unit + SvelteCheck only',
          description: 'Fast static and unit verification.'
        }
      ],
      allowCustom: true
    }
  ];
</script>

<ApprovalCard
  title="Confirm verification scope before creating PR"
  {questions}
  onSubmit={(answers) => (recorded = answers)}
/>`
	},
	{
		slug: 'level-dial',
		name: 'LevelDial',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/LevelDial.svelte',
		upstreamSource: 'Agents Kit Svelte · beUI Agents',
		description:
			'Choose how much an agent may do on its own from ordered levels. Selecting previews the level and what it does or still asks; moving up needs a confirm that names what changes, moving down applies in one press.',
		usageSnippet: `<script lang="ts">
  import { LevelDial, type AutonomyLevel } from 'agents-kit-svelte';

  const levels: AutonomyLevel[] = [
    { id: 'careful', label: 'Careful', summary: 'Asks before anything leaves its branch.', allows: ['Commit to its own branch'], asks: ['Open a pull request', 'Merge'] },
    { id: 'balanced', label: 'Balanced', summary: 'Opens pull requests itself.', allows: ['Commit to its own branch', 'Open a pull request'], asks: ['Merge'] }
  ];
  let value = $state('careful');
</script>

<LevelDial title="Autonomy" {levels} {value} onChange={(id) => (value = id)} />`
	},
	{
		slug: 'risk-toggle',
		name: 'RiskToggle',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/RiskToggle.svelte',
		upstreamSource: 'Agents Kit Svelte · beUI Agents',
		description:
			'A switch for a setting that carries risk. Turning it the risky way opens the risk points and a checkbox; the confirm button stays disabled until the person ticks it. The safe direction applies at once.',
		usageSnippet: `<script lang="ts">
  import { RiskToggle } from 'agents-kit-svelte';

  let checked = $state(false);
</script>

<RiskToggle
  label="Merge protected changes without asking"
  {checked}
  scope="devbox"
  risk={{
    title: 'Protected files guard releases and secrets',
    points: ['A bad merge can break every build.', 'Changes go live without a person reading them.'],
    acknowledge: 'I understand agents can merge protected changes without asking me.'
  }}
  onChange={(next) => (checked = next)}
/>`
	},
	{
		slug: 'prompt-input',
		name: 'PromptInput',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/PromptInput.svelte',
		upstreamSource: 'beUI · components/beui/components/agents/prompt-input.tsx',
		description:
			'IME-safe composer with @worktree/@skill context pills and Supported Agent switcher.',
		usageSnippet: `<script lang="ts">
  import { PromptInput, type SupportedAgentId, type SupportedAgentOption } from 'agents-kit-svelte';

  let value = $state('');
  let selectedAgentId = $state<SupportedAgentId>('claude-code');
  let lastSubmitted = $state('');

  const agents: SupportedAgentOption[] = [
    { id: 'claude-code', label: 'AK-S Agent', version: 'v0.3.0', signedIn: true },
    { id: 'codex', label: 'Codex CLI', version: 'v0.29.0', signedIn: true }
  ];
</script>

<PromptInput
  bind:value
  {agents}
  {selectedAgentId}
  onAgentChange={(id) => (selectedAgentId = id)}
  onSubmit={(text) => (lastSubmitted = text)}
/>`
	},
	{
		slug: 'message',
		name: 'Message',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/Message.svelte',
		upstreamSource: 'beUI · components/beui/components/agents/message.tsx',
		description:
			'Turn-level conversation container with role avatar, badge, timestamp, and Svelte 5 Snippet children.',
		usageSnippet: `<script lang="ts">
  import { Message } from 'agents-kit-svelte';
</script>

<Message
  role="assistant"
  author="AK-S Agent"
  badge="Connected Computer"
  timestamp="21:18"
>
  <p class="text-sm text-fg-main">
    Verified worktree <code class="rounded bg-canvas-secondary px-1.5 py-0.5 font-mono text-xs">trailside/2151-drawer-hydration</code> with zero TypeScript diagnostics.
  </p>
</Message>`
	},
	{
		slug: 'message-bubble',
		name: 'MessageBubble',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/MessageBubble.svelte',
		upstreamSource: 'beUI · components/beui/components/agents/message-bubble.tsx',
		description:
			'Composable message bubble with tint/soft/solid/dash variants, delivery status, and show-more disclosure.',
		usageSnippet: `<script lang="ts">
  import { MessageBubble } from 'agents-kit-svelte';
</script>

<div class="space-y-2">
  <MessageBubble
    variant="tint"
    align="end"
    author="gregory.winkler"
    timestamp="21:15"
    status="delivered"
    text="Port the entire agents-kit suite to Svelte 5 Runes and include GitHub card layouts."
  />
  <MessageBubble
    variant="soft"
    align="start"
    author="AK-S Agent"
    timestamp="21:16"
    collapsible={true}
    text="All 76 Svelte 5 components are live with strict TypeScript Props, OKLCH dark/light tokens, and interactive showcases."
  />
</div>`
	},
	{
		slug: 'message-scroller',
		name: 'MessageScroller',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/MessageScroller.svelte',
		upstreamSource: 'beUI · components/beui/components/agents/message-scroller.tsx',
		description:
			'Auto-pinned conversation scroll container with interactive PreviewRail hover cards, container-scoped jump navigation, and floating Jump to latest pill.',
		usageSnippet: `<script lang="ts">
  import { MessageScroller, MessageBubble } from 'agents-kit-svelte';

  const turns = [
    { id: 'scope-q', from: 'user' as const, author: 'You', content: 'What should the first field study include?' },
    { id: 'scope-a', from: 'assistant' as const, author: 'AK-S Agent', content: 'Start with eight rider interviews and two station walkthroughs.' },
    { id: 'states-q', from: 'user' as const, author: 'You', content: 'Include wheelchair users and people traveling with luggage.' },
    { id: 'states-a', from: 'assistant' as const, author: 'AK-S Agent', content: 'Yes. Both groups encounter the same lift bottlenecks and wayfinding gaps.' }
  ];
</script>

<MessageScroller
  navigation="rail"
  followOutput={true}
  class="h-[420px] rounded-xl border border-card-border bg-card-bg"
>
  {#each turns as turn (turn.id)}
    <MessageBubble
      id={turn.id}
      variant={turn.from === 'user' ? 'solid' : 'soft'}
      align={turn.from === 'user' ? 'end' : 'start'}
      author={turn.author}
      collapsible={false}
      text={turn.content}
    />
  {/each}
</MessageScroller>`
	},
	{
		slug: 'streaming-response',
		name: 'StreamingResponse',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/StreamingResponse.svelte',
		upstreamSource: 'beUI · components/beui/components/agents/streaming-response.tsx',
		description:
			'Streaming response wrapper with copy action, thumbs up/down feedback, and grounded source citations.',
		usageSnippet: `<script lang="ts">
  import { StreamingResponse, type CitationItem } from 'agents-kit-svelte';

  const sources: CitationItem[] = [
    {
      id: 'cit-1',
      title: 'Svelte 5 Runes Migration & Reactivity Contract',
      url: 'https://svelte.dev/docs/svelte/what-are-runes',
      domain: 'svelte.dev'
    }
  ];
</script>

<StreamingResponse
  status="complete"
  copyText="All 76 Svelte 5 components verified with 0 errors and 0 warnings."
  {sources}
>
  <p class="text-sm text-fg-main">
    All 76 Svelte 5 components verified with <code class="font-mono text-xs">svelte-check</code> (0 errors, 0 warnings).
  </p>
</StreamingResponse>`
	},
	{
		slug: 'citations',
		name: 'Citations',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/Citations.svelte',
		upstreamSource: 'beUI · components/beui/components/agents/citations.tsx',
		description:
			'Collapsible grounded source citations list with domain badges and index markers.',
		usageSnippet: `<script lang="ts">
  import { Citations, type CitationItem } from 'agents-kit-svelte';

  const citations: CitationItem[] = [
    {
      id: 'cit-1',
      title: 'Svelte 5 Runes Migration & Reactivity Contract',
      url: 'https://svelte.dev/docs/svelte/what-are-runes',
      domain: 'svelte.dev'
    },
    {
      id: 'cit-2',
      title: 'Trailside Browser Read Contract (G0 Revision 3)',
      url: 'https://trailside.io/docs/specs/g0-browser-read-contract',
      domain: 'trailside.io'
    }
  ];
</script>

<Citations {citations} defaultOpen={true} />`
	},
	{
		slug: 'image-generation',
		name: 'ImageGeneration',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/ImageGeneration.svelte',
		upstreamSource: 'beUI · components/beui/components/agents/image-generation.tsx',
		description:
			'Media generation surface stepping through queued, generating, refining, complete, and error states.',
		usageSnippet: `<script lang="ts">
  import { ImageGeneration, type ImageGenerationStatus } from 'agents-kit-svelte';

  let status: ImageGenerationStatus = $state('generating');
  let progress = $state(45);
</script>

<ImageGeneration
  {status}
  {progress}
  prompt="A lighthouse at dusk, watercolour"
  resolution="1024 × 1024"
  aspectRatio="1:1"
  onRegenerate={() => ((status = 'queued'), (progress = 0))}
/>`
	},
	{
		slug: 'ai-sidebar',
		name: 'AISidebar',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/AISidebar.svelte',
		upstreamSource: 'beUI · components/beui/components/agents/ai-sidebar.tsx',
		description:
			'Collapsible workspace conversation sidebar with search filter, pinned threads, and inline rename.',
		usageSnippet: `<script lang="ts">
  import { AISidebar, type SidebarResource } from 'agents-kit-svelte';

  const items: SidebarResource[] = [
    {
      id: 'app',
      label: 'my-app',
      kind: 'project',
      children: [
        { id: 'src', label: 'src', kind: 'folder', children: [{ id: 'page', label: '+page.svelte', kind: 'file' }] },
        { id: 'wt', label: 'fix/login', kind: 'worktree', badge: 'PR' }
      ]
    }
  ];
  let activeId = $state<string | null>('page');
</script>

<AISidebar
  {items}
  {activeId}
  defaultExpandedIds={['app', 'src']}
  searchable
  onSelect={(id) => (activeId = id)}
/>`
	},
	{
		slug: 'thinking-shimmer',
		name: 'ThinkingShimmer',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/ThinkingShimmer.svelte',
		upstreamSource: 'beUI · components/beui/components/agents/loading-states/thinking-shimmer.tsx',
		description: 'OKLCH gradient text shimmer indicator with reduced-motion fallback.',
		usageSnippet: `<script lang="ts">
  import { ThinkingShimmer } from 'agents-kit-svelte';

  let label = $state('Analyzing repository structure...');
</script>

<div class="flex items-center gap-3">
  <ThinkingShimmer {label} />
</div>`
	},
	{
		slug: 'agent-progress',
		name: 'AgentProgress',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/AgentProgress.svelte',
		upstreamSource: 'beUI · components/beui/components/agents/loading-states/agent-progress.tsx',
		description: 'Animated 3x3 matrix activity indicator with live elapsed timer.',
		usageSnippet: `<script lang="ts">
  import { AgentProgress } from 'agents-kit-svelte';

  let elapsedSeconds = $state(14);
</script>

<AgentProgress
  label="Running Playwright suite"
  {elapsedSeconds}
/>`
	},
	{
		slug: 'reasoning-text',
		name: 'ReasoningText',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/ReasoningText.svelte',
		upstreamSource: 'beUI · components/beui/components/agents/loading-states/reasoning-text.tsx',
		description: 'Cycling status phrase indicator for long-running agent reasoning turns.',
		usageSnippet: `<script lang="ts">
  import { ReasoningText } from 'agents-kit-svelte';

  const phrases = ['Reading files', 'Planning the change', 'Writing code', 'Running tests'];
</script>

<p class="text-sm">
  <ReasoningText {phrases} interval={1800} />
</p>`
	},
	{
		slug: 'agent-work-trace',
		name: 'AgentWorkTrace',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/AgentWorkTrace.svelte',
		upstreamSource: 'Agents Kit Svelte · PR Flow',
		description:
			'A collapsible trace of what the agent did: findings, edits, nested test runs and pushes on one connected line, with clickable file chips. While running, the header shimmers with the current step and a timer; when done, it reads “Worked for 5s”.',
		usageSnippet: `<script lang="ts">
  import { AgentWorkTrace, type WorkStep } from 'agents-kit-svelte';

  let steps = $state<WorkStep[]>([
    { id: 'find', label: 'Checkout sent you to sign in after a refresh', status: 'done' },
    { id: 'cause', label: 'The redirect drops the refreshed cookie', status: 'done', files: ['src/middleware.ts'] },
    { id: 'edit', label: 'Edited middleware.ts', kind: 'edit', status: 'done' },
    { id: 'tests', label: 'Running 11 of 12 e2e tests', kind: 'run', status: 'running', nested: true }
  ]);
  let elapsed = $state(4);
  let expanded = $state(true);
</script>

<AgentWorkTrace
  {steps}
  status="running"
  {elapsed}
  bind:expanded
  onSelectFile={(path) => console.log('open', path)}
/>`
	},

	{
		slug: 'action-receipt',
		name: 'ActionReceipt',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/ActionReceipt.svelte',
		upstreamSource: 'Agents Kit Svelte · Operator cards',
		description:
			'One record of something an agent did or refused to do for the person: the verb, what it touched, who did it and when, the run that proposed it, and the reason. Refused reads differently from done, and Undo shows only while it is done. Stacks as rows in an inbox with compact.',
		usageSnippet: `<script lang="ts">
  import { ActionReceipt } from 'agents-kit-svelte';
</script>

<ActionReceipt
  action="Parked"
  target={{ label: '#3412 Fix sign-in redirect', id: '3412' }}
  outcome="done"
  actor="You"
  at="2026-11-11T11:59:00Z"
  run={{ id: 'run-88', label: 'Run 88' }}
  undoable
  onUndo={(target) => console.log('unpark', target.id)}
/>

<ActionReceipt
  action="Merge"
  target={{ label: 'PR #212 Add retry to export' }}
  outcome="refused"
  reason="merging is not on the operator's list"
  actor="Operator"
  compact
/>`
	},
	{
		slug: 'device-approval',
		name: 'DeviceApprovalCard',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/DeviceApprovalCard.svelte',
		upstreamSource: 'Agents Kit Svelte · Operator cards',
		description:
			'A new device asks to act with the same rights as this one. Shows the device, a large match code read digit by digit to screen readers, what it will be able to do and the time left; Approve stays off until the person confirms the code matches, Deny is always one press, and the card collapses to a one-line outcome.',
		usageSnippet: `<script lang="ts">
  import { DeviceApprovalCard } from 'agents-kit-svelte';
</script>

<DeviceApprovalCard
  device={{ name: 'Pixel 9', kind: 'phone', platform: 'Android 16', location: 'Berlin, Germany' }}
  code="482 913"
  requestedAt="2026-11-11T08:59:30Z"
  now="2026-11-11T09:00:00Z"
  expiresAt="2026-11-11T09:04:00Z"
  grants={['See your agents and their runs', 'Approve or stop work on your behalf']}
  onApprove={() => console.log('approved')}
  onDeny={() => console.log('denied')}
/>`
	},
	{
		slug: 'cited-answer',
		name: 'CitedAnswer',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/CitedAnswer.svelte',
		upstreamSource: 'Agents Kit Svelte · Operator cards',
		description:
			'An agent answers a question on someone’s behalf and shows what it based the answer on: each source as a quote with its location and a check badge (verified, not checked, or quote not found). A mismatch raises a banner and hides Send.',
		usageSnippet: `<script lang="ts">
  import { CitedAnswer, type CitedSource } from 'agents-kit-svelte';

  const sources: CitedSource[] = [
    {
      id: 'plan-retry',
      title: 'Run controls plan',
      location: 'section 3.2',
      quote: 'Retry is offered on failed runs only.',
      check: 'verified'
    }
  ];
</script>

<CitedAnswer
  question="Should the retry button show on cancelled runs?"
  askedBy="Builder on card #3412"
  answer="No. The plan limits Retry to failed runs."
  {sources}
  status="draft"
  onSend={() => console.log('send')}
  onEdit={() => console.log('edit')}
  onOpenSource={(source) => console.log('open', source.id)}
/>`
	},

	// 2. Beautiful UI (11 components)
	{
		slug: 'tool-chips',
		name: 'ToolChips',
		category: 'Beautiful UI',
		sveltePath: 'src/lib/beautiful/ToolChips.svelte',
		upstreamSource: 'Beautiful UI · components/beautiful-ui/tool-chips.tsx',
		description:
			'Compact interactive status pills for parallel tool invocations with expandable output drawer.',
		usageSnippet: `<script lang="ts">
  import { ToolChips, type ToolStep, type ToolDiff } from 'agents-kit-svelte';

  const steps: ToolStep[] = [
    { id: 't-1', label: 'Read', chip: 'src/lib/auth.ts', status: 'complete' },
    { id: 't-2', label: 'Edit', chip: 'src/lib/auth.ts', additions: 12, deletions: 3, status: 'complete' },
    { id: 't-3', label: 'Bash', detail: 'pnpm test', status: 'running' }
  ];
  const diffs: ToolDiff[] = [{ file: 'src/lib/auth.ts', additions: 12, deletions: 3, lines: ['+ if (!user) return null;'] }];
  let expandedId = $state<string | undefined>(undefined);
</script>

<ToolChips {steps} {diffs} {expandedId} onToggle={(id) => (expandedId = expandedId === id ? undefined : id)} />`
	},
	{
		slug: 'recommendation-card',
		name: 'RecommendationCard',
		category: 'Beautiful UI',
		sveltePath: 'src/lib/beautiful/RecommendationCard.svelte',
		upstreamSource: 'Beautiful UI · components/beautiful-ui/recommendation-card.tsx',
		description:
			'Confidence-scored agent recommendation card with reasoning bullets and alternative actions.',
		usageSnippet: `<script lang="ts">
  import { RecommendationCard, type RecommendationOption } from 'agents-kit-svelte';

  const alternatives: RecommendationOption[] = [
    { id: 'redis', label: 'Redis', description: 'Faster, but another service to run' },
    { id: 'memory', label: 'In-memory LRU', description: 'Simplest, lost on restart' }
  ];
</script>

<RecommendationCard
  title="Cache with Postgres"
  summary="Reuse the database you already run."
  confidence={0.82}
  reasoning={['No new infrastructure', 'Traffic is under 50 req/s']}
  acceptLabel="Use Postgres"
  {alternatives}
  onAccept={() => console.log('accepted')}
  onSelectAlternative={(id) => console.log('picked', id)}
/>`
	},
	{
		slug: 'context-cards',
		name: 'ContextCards',
		category: 'Beautiful UI',
		sveltePath: 'src/lib/beautiful/ContextCards.svelte',
		upstreamSource: 'Beautiful UI · components/beautiful-ui/context-cards.tsx',
		description:
			'Grid of attached context sources (files, URLs, commits, issues, schemas) with token counts.',
		usageSnippet: `<script lang="ts">
  import { ContextCards, type ContextChunk } from 'agents-kit-svelte';

  let chunks: ContextChunk[] = $state([
    { id: 'c-1', title: 'auth.ts', source: 'src/lib/auth.ts', content: 'export function login() { … }', kind: 'file', tokens: 820 },
    { id: 'c-2', title: 'Issue #12', source: 'github.com/acme/app/issues/12', content: 'Login fails on Safari', kind: 'issue', score: 0.88 }
  ]);
  let selectedId = $state('c-1');
</script>

<ContextCards
  {chunks}
  {selectedId}
  onSelect={(id) => (selectedId = id)}
  onRemove={(id) => (chunks = chunks.filter((c) => c.id !== id))}
/>`
	},
	{
		slug: 'diff-table',
		name: 'DiffTable',
		category: 'Beautiful UI',
		sveltePath: 'src/lib/beautiful/DiffTable.svelte',
		upstreamSource: 'Beautiful UI · components/beautiful-ui/diff-table.tsx',
		description:
			'Structured key/field before-and-after comparison table for config or schema mutations.',
		usageSnippet: `<script lang="ts">
  import { DiffTable, type DiffTableRow } from 'agents-kit-svelte';

  let rows: DiffTableRow[] = $state([
    { id: 'd-1', field: 'Plan', before: 'Free', after: 'Pro', status: 'pending' },
    { id: 'd-2', field: 'Seats', before: '3', after: '10', status: 'pending' }
  ]);

  const setStatus = (id: string, status: DiffTableRow['status']) =>
    (rows = rows.map((row) => (row.id === id ? { ...row, status } : row)));
</script>

<DiffTable
  title="Proposed account changes"
  {rows}
  onAccept={(id) => setStatus(id, 'accepted')}
  onReject={(id) => setStatus(id, 'rejected')}
  onApplyAll={() => rows.forEach((row) => setStatus(row.id, 'accepted'))}
/>`
	},
	{
		slug: 'records-table',
		name: 'RecordsTable',
		category: 'Beautiful UI',
		sveltePath: 'src/lib/beautiful/RecordsTable.svelte',
		upstreamSource: 'Beautiful UI · components/beautiful-ui/records-table.tsx',
		description:
			'Sortable, multi-selectable agent data table with category tags and strength badges.',
		usageSnippet: `<script lang="ts">
  import { RecordsTable } from 'agents-kit-svelte';

  let selectedIds = $state<string[]>(['rec-1', 'rec-2']);
</script>

<RecordsTable
  {selectedIds}
  onSelectionChange={(ids) => (selectedIds = ids)}
/>`
	},
	{
		slug: 'selection-actions',
		name: 'SelectionActions',
		category: 'Beautiful UI',
		sveltePath: 'src/lib/beautiful/SelectionActions.svelte',
		upstreamSource: 'Beautiful UI · components/beautiful-ui/selection-actions.tsx',
		description: 'Floating bulk-action toolbar for selected table rows or text excerpts.',
		usageSnippet: `<script lang="ts">
  import { SelectionActions } from 'agents-kit-svelte';

  let selectedCount = $state(3);
</script>

<SelectionActions
  {selectedCount}
  onClear={() => (selectedCount = 0)}
  onAction={(actionId) => console.log('Bulk action:', actionId)}
/>`
	},
	{
		slug: 'filter-table',
		name: 'FilterTable',
		category: 'Beautiful UI',
		sveltePath: 'src/lib/beautiful/FilterTable.svelte',
		upstreamSource: 'Beautiful UI · components/beautiful-ui/filter-table.tsx',
		description: 'Faceted search and tag-filterable agent evaluation table.',
		usageSnippet: `<script lang="ts">
  import { FilterTable, type FilterStatus, type FilterTableRow } from 'agents-kit-svelte';

  const rows: FilterTableRow[] = [
    { id: 'r-1', task: 'Write the changelog', date: 'Oct 28', status: 'done', owner: 'Ana' },
    { id: 'r-2', task: 'Review the adapter', date: 'Oct 30', status: 'progress', owner: 'Claude', tag: 'agent' },
    { id: 'r-3', task: 'Publish 1.0', date: 'Nov 2', status: 'todo', owner: 'Ana' }
  ];
  let filter: FilterStatus | 'all' = $state('all');
</script>

<FilterTable {rows} {filter} onFilterChange={(value) => (filter = value)} />`
	},
	{
		slug: 'flowchart',
		name: 'Flowchart',
		category: 'Beautiful UI',
		sveltePath: 'src/lib/beautiful/Flowchart.svelte',
		upstreamSource: 'Beautiful UI · components/beautiful-ui/flowchart.tsx',
		description: 'Interactive DAG workflow flowchart with node status inspection.',
		usageSnippet: `<script lang="ts">
  import { Flowchart, type FlowchartNode } from 'agents-kit-svelte';

  const nodes: FlowchartNode[] = [
    { id: 'n-1', label: '1. Triage Issue', detail: 'Verify repro & risk tier', status: 'complete' },
    { id: 'n-2', label: '2. Worktree Run', detail: 'Write failing test & minimal fix', status: 'complete' },
    { id: 'n-3', label: '3. Referee Gate', detail: 'svelte-check + Playwright parity', status: 'running' },
    { id: 'n-4', label: '4. Ready for You', detail: 'Human merge approval', status: 'pending' }
  ];
</script>

<Flowchart
  title="Factory 1.0 Card Run Pipeline"
  {nodes}
/>`
	},
	{
		slug: 'insight-cards',
		name: 'InsightCards',
		category: 'Beautiful UI',
		sveltePath: 'src/lib/beautiful/InsightCards.svelte',
		upstreamSource: 'Beautiful UI · components/beautiful-ui/insight-cards.tsx',
		description:
			'KPI metric cards with sparkline trend bars, delta badges, and agent insight annotations.',
		usageSnippet: `<script lang="ts">
  import { InsightCards, type InsightCard } from 'agents-kit-svelte';

  const insights: InsightCard[] = [
    { id: 'i-1', kind: 'compare', title: 'Weekly runs', description: 'Up on last week', value: '1,284', delta: '+12%', series: [8, 9, 11, 10, 13, 14, 16] },
    { id: 'i-2', kind: 'anomaly', title: 'Failed checks', description: 'Spike on Tuesday', value: '37', delta: '+210%' }
  ];
</script>

<InsightCards {insights} onSelect={(id) => console.log(id)} />`
	},
	{
		slug: 'fine-tune-card',
		name: 'FineTuneCard',
		category: 'Beautiful UI',
		sveltePath: 'src/lib/beautiful/FineTuneCard.svelte',
		upstreamSource: 'Beautiful UI · components/beautiful-ui/fine-tune-card.tsx',
		description:
			'Interactive parameter tuning card for thinking budget, temperature, risk tier, and max turns.',
		usageSnippet: `<script lang="ts">
  import { FineTuneCard, type FineTuneField } from 'agents-kit-svelte';

  let fields: FineTuneField[] = $state([
    { id: 'temperature', label: 'Temperature', value: 0.7, min: 0, max: 1, step: 0.1 },
    { id: 'maxTokens', label: 'Max tokens', value: 1024, min: 256, max: 8192, step: 256 },
    { id: 'tone', label: 'Tone', value: 'Friendly', options: ['Friendly', 'Formal', 'Terse'] }
  ]);
</script>

<FineTuneCard
  title="Response settings"
  {fields}
  onChange={(id, value) => (fields = fields.map((f) => (f.id === id ? { ...f, value } : f)))}
  onApply={() => console.log($state.snapshot(fields))}
/>`
	},
	{
		slug: 'search-list',
		name: 'SearchList',
		category: 'Beautiful UI',
		sveltePath: 'src/lib/beautiful/SearchList.svelte',
		upstreamSource: 'Beautiful UI · components/beautiful-ui/search-list.tsx',
		description: 'Instant faceted search list across issues, files, runs, and specs.',
		usageSnippet: `<script lang="ts">
  import { SearchList, type SearchListItem } from 'agents-kit-svelte';

  const items: SearchListItem[] = [
    { id: 's-1', label: 'Login fails on Safari', description: 'Issue #12', category: 'issue' },
    { id: 's-2', label: 'src/lib/auth.ts', category: 'file' },
    { id: 's-3', label: 'Nightly e2e run', description: 'Failed 2h ago', category: 'run' }
  ];
  let value = $state('');
</script>

<SearchList
  {items}
  {value}
  placeholder="Search issues, files and runs"
  onValueChange={(next) => (value = next)}
  onSelect={(id) => console.log('open', id)}
/>`
	},

	// 3. GitHub Cards & Layouts (18 components)
	{
		slug: 'github-issue-card',
		name: 'GitHubIssueCard',
		category: 'GitHub Cards & Layouts',
		sveltePath: 'src/lib/github/GitHubIssueCard.svelte',
		upstreamSource: 'Agents Kit Svelte · GitHub Suite',
		description:
			'GitHub issue card with triage labels, risk tier, active worktree run, Spring criteria progress, and dispatch actions.',
		usageSnippet: `<script lang="ts">
  import { GitHubIssueCard, type GitHubIssueData } from 'agents-kit-svelte';

  const issue: GitHubIssueData = {
    number: 2151,
    title: 'Card drawer hydration guard prevents lost early clicks on mobile viewports',
    repo: 'RSynapse/trailside',
    state: 'in-progress',
    author: 'grok-bot',
    createdAt: '8m ago',
    labels: [
      { name: 'ready', tone: 'accent' },
      { name: 'area:app', tone: 'neutral' },
      { name: 'type:bug', tone: 'danger' }
    ],
    size: 'S',
    riskTier: 'T2',
    assignedAgent: 'AK-S Agent 0.3',
    attemptNumber: 1,
    worktreeBranch: 'trailside/2151-drawer-hydration',
    criteriaCompleted: 4,
    criteriaTotal: 4
  };
</script>

<GitHubIssueCard {issue} />`
	},
	{
		slug: 'github-pr-card',
		name: 'GitHubPullRequestCard',
		category: 'GitHub Cards & Layouts',
		sveltePath: 'src/lib/github/GitHubPullRequestCard.svelte',
		upstreamSource: 'Agents Kit Svelte · GitHub Suite',
		description:
			'GitHub pull request card with head/base branches, +add/-del stats, referee verdict, and collapsible CI checks.',
		usageSnippet: `<script lang="ts">
  import { GitHubPullRequestCard, type GitHubPullRequestData } from 'agents-kit-svelte';

  const pr: GitHubPullRequestData = {
    number: 2153,
    title: 'fix(app): guard interactive controls until client hydration completes',
    repo: 'RSynapse/trailside',
    state: 'open',
    author: 'aks-agent[bot]',
    headBranch: 'trailside/2151-drawer-hydration',
    baseBranch: 'main',
    updatedAt: '3m ago',
    additions: 46,
    deletions: 9,
    changedFilesCount: 3,
    riskTier: 'T2',
    linkedIssueNumber: 2151,
    refereeStatus: 'pass',
    checks: [
      { id: 'c-1', name: 'corepack pnpm check (svelte-check)', workflow: 'CI / Verify', status: 'passed', duration: '14s' },
      { id: 'c-2', name: 'Playwright Browser Parity (390x844 & 1440x900)', workflow: 'CI / Browser', status: 'passed', duration: '38s' }
    ]
  };
</script>

<GitHubPullRequestCard {pr} />`
	},
	{
		slug: 'github-commit-card',
		name: 'GitHubCommitCard',
		category: 'GitHub Cards & Layouts',
		sveltePath: 'src/lib/github/GitHubCommitCard.svelte',
		upstreamSource: 'AI Elements · components/ai-elements/commit.tsx + GitHub Suite',
		description:
			'Verified commit card with SHA copy, changed file list, and worktree checkout action.',
		usageSnippet: `<script lang="ts">
  import { GitHubCommitCard, type GitHubCommitData } from 'agents-kit-svelte';

  const commit: GitHubCommitData = {
    sha: '9f8e7d6c5b4a3210fedcba9876543210abcdef12',
    message: 'feat(agents-kit): port 76 agent & GitHub UI components to Svelte 5 Runes',
    author: 'AK-S Agent',
    branch: 'trailside/2151-drawer-hydration',
    timestamp: '2m ago',
    verified: true,
    additions: 435,
    deletions: 0,
    files: [
      { path: 'src/lib/github/GitHubKanbanBoard.svelte', status: 'added', additions: 195, deletions: 0 },
      { path: 'src/lib/intelligent-ui/IntelligentUIRenderer.svelte', status: 'added', additions: 240, deletions: 0 }
    ]
  };
</script>

<GitHubCommitCard {commit} />`
	},
	{
		slug: 'github-checks-panel',
		name: 'GitHubChecksPanel',
		category: 'GitHub Cards & Layouts',
		sveltePath: 'src/lib/github/GitHubChecksPanel.svelte',
		upstreamSource: 'Agents Kit Svelte · GitHub Suite',
		description:
			'GitHub Actions & check suite status panel with one-click Fix with Agent action.',
		usageSnippet: `<script lang="ts">
  import { GitHubChecksPanel, type GitHubCheckItem } from 'agents-kit-svelte';

  const checks: GitHubCheckItem[] = [
    { id: 'c-1', name: 'corepack pnpm check (svelte-check)', workflow: 'CI / Verify', status: 'passed', duration: '14s' },
    { id: 'c-2', name: 'Playwright Browser Parity (390x844 & 1440x900)', workflow: 'CI / Browser', status: 'passed', duration: '38s' }
  ];
</script>

<GitHubChecksPanel {checks} />`
	},
	{
		slug: 'github-review-thread',
		name: 'GitHubReviewThreadCard',
		category: 'GitHub Cards & Layouts',
		sveltePath: 'src/lib/github/GitHubReviewThreadCard.svelte',
		upstreamSource: 'Agents Kit Svelte · GitHub Suite',
		description:
			'Inline PR code review thread with diff hunk, suggested patch application, and reply box.',
		usageSnippet: `<script lang="ts">
  import { GitHubReviewThreadCard, type GitHubReviewThreadData } from 'agents-kit-svelte';

  const thread: GitHubReviewThreadData = {
    id: 'th-1',
    filePath: 'apps/web/src/lib/components/CardRunDrawer.svelte',
    lineRange: 'L45-L49',
    resolved: false,
    diffHunk: '@@ -45,3 +45,5 @@\\n-  <button type="button" onclick={submitRun}>\\n+  <button type="button" disabled={!ready} onclick={submitRun}>',
    comments: [
      {
        id: 'rc-1',
        author: 'claude-referee',
        role: 'Referee',
        timestamp: '4m ago',
        body: 'Clean SSR readiness gate. Matches .agents/skills/ssr-interaction-readiness/SKILL.md.',
        suggestedPatch: '<button type="button" disabled={!ready} aria-busy={!ready} onclick={submitRun}>'
      }
    ]
  };
</script>

<GitHubReviewThreadCard {thread} />`
	},
	{
		slug: 'github-kanban-board',
		name: 'GitHubKanbanBoard',
		category: 'GitHub Cards & Layouts',
		sveltePath: 'src/lib/github/GitHubKanbanBoard.svelte',
		upstreamSource: 'Agents Kit Svelte · GitHub Suite',
		description:
			'4-column reactive GitHub board layout with Svelte 5 crossfade (send/receive) and animate:flip transitions.',
		usageSnippet: `<script lang="ts">
  import { GitHubKanbanBoard, type GitHubIssueData } from 'agents-kit-svelte';
  import { SAMPLE_BOARD_ISSUES } from 'agents-kit-svelte/fixtures';

  let selected = $state<GitHubIssueData | null>(null);
</script>

<GitHubKanbanBoard issues={SAMPLE_BOARD_ISSUES} onSelectIssue={(issue) => (selected = issue)} />`
	},
	{
		slug: 'github-bento-layout',
		name: 'GitHubBentoLayout',
		category: 'GitHub Cards & Layouts',
		sveltePath: 'src/lib/github/GitHubBentoLayout.svelte',
		upstreamSource: 'Agents Kit Svelte · GitHub Suite',
		description:
			'Repository pulse bento layout combining active PR, issue dispatch card, CI checks panel, verified commit, and inline review thread.',
		usageSnippet: `<script lang="ts">
  import { GitHubBentoLayout } from 'agents-kit-svelte';
  import {
    SAMPLE_BENTO_STATS,
    SAMPLE_CHECKS,
    SAMPLE_COMMIT,
    SAMPLE_ISSUE,
    SAMPLE_PULL_REQUEST,
    SAMPLE_REVIEW_THREAD
  } from 'agents-kit-svelte/fixtures';
</script>

<GitHubBentoLayout
  repoName="RSynapse/trailside"
  repoDetail="GitHub App installation active"
  stats={SAMPLE_BENTO_STATS}
  pullRequest={SAMPLE_PULL_REQUEST}
  checks={SAMPLE_CHECKS}
  issue={SAMPLE_ISSUE}
  commit={SAMPLE_COMMIT}
  thread={SAMPLE_REVIEW_THREAD}
/>`
	},
	{
		slug: 'github-lifecycle-timeline',
		name: 'GitHubLifecycleTimeline',
		category: 'GitHub Cards & Layouts',
		sveltePath: 'src/lib/github/GitHubLifecycleTimeline.svelte',
		upstreamSource: 'Agents Kit Svelte · GitHub Lifecycle',
		description:
			'Ten-stage lifecycle stepper (issue, triage, branch, commits, PR, review, checks, merge, deploy, release) that plays itself and lets you pin any stage for details.',
		usageSnippet: `<script lang="ts">
  import { GitHubLifecycleTimeline, type GitHubLifecycleStage } from 'agents-kit-svelte';
  import { SAMPLE_LIFECYCLE_STAGES } from 'agents-kit-svelte/fixtures';

  let pinned = $state<GitHubLifecycleStage | null>(null);
</script>

<!-- live plays a demo loop; leave it off for real data -->
<GitHubLifecycleTimeline
  stages={SAMPLE_LIFECYCLE_STAGES}
  live
  onSelectStage={(stage) => (pinned = stage)}
/>`
	},
	{
		slug: 'github-issue-triage',
		name: 'GitHubIssueTriage',
		category: 'GitHub Cards & Layouts',
		sveltePath: 'src/lib/github/GitHubIssueTriage.svelte',
		upstreamSource: 'Agents Kit Svelte · GitHub Lifecycle',
		description:
			'Issue intake card where an agent proposes type, priority, area, assignee and milestone with confidence bars, flags likely duplicates, and lets you drop suggestions before applying.',
		usageSnippet: `<script lang="ts">
  import { GitHubIssueTriage } from 'agents-kit-svelte';
  import { SAMPLE_TRIAGE_ISSUE } from 'agents-kit-svelte/fixtures';

  let appliedLabels = $state<string[]>([]);
</script>

<GitHubIssueTriage
  issue={SAMPLE_TRIAGE_ISSUE}
  live
  onApply={(issueNumber, labels) => (appliedLabels = labels)}
  onMarkDuplicate={(issueNumber, duplicateOf) => console.log(issueNumber, duplicateOf)}
/>`
	},
	{
		slug: 'github-branch-card',
		name: 'GitHubBranchCard',
		category: 'GitHub Cards & Layouts',
		sveltePath: 'src/lib/github/GitHubBranchCard.svelte',
		upstreamSource: 'Agents Kit Svelte · GitHub Lifecycle',
		description:
			'Feature branch card with ahead/behind counts, a commit rail that fills as commits land, branch protection rules, and worktree / compare actions.',
		usageSnippet: `<script lang="ts">
  import { GitHubBranchCard } from 'agents-kit-svelte';
  import { SAMPLE_BRANCH } from 'agents-kit-svelte/fixtures';

  let worktree = $state<string | null>(null);
</script>

<GitHubBranchCard
  branch={SAMPLE_BRANCH}
  live
  onOpenWorktree={(branch) => (worktree = branch)}
  onCompare={(branch, base) => console.log(base, branch)}
/>`
	},
	{
		slug: 'github-pr-review',
		name: 'GitHubPullRequestReview',
		category: 'GitHub Cards & Layouts',
		sveltePath: 'src/lib/github/GitHubPullRequestReview.svelte',
		upstreamSource: 'Agents Kit Svelte · GitHub Lifecycle',
		description:
			'Files-changed review surface: file list with viewed checkboxes, a unified diff with inline comments, and an Approve / Comment / Request changes verdict.',
		usageSnippet: `<script lang="ts">
  import { GitHubPullRequestReview, type GitHubReviewVerdict } from 'agents-kit-svelte';
  import { SAMPLE_REVIEW_FILES } from 'agents-kit-svelte/fixtures';

  let verdict = $state<GitHubReviewVerdict | null>(null);
</script>

<GitHubPullRequestReview
  prNumber={2210}
  title="fix(export): quote CSV fields per RFC 4180"
  reviewer="mira-chen"
  files={SAMPLE_REVIEW_FILES}
  live
  onSubmitReview={(prNumber, v) => (verdict = v)}
/>`
	},
	{
		slug: 'github-merge-queue',
		name: 'GitHubMergeQueue',
		category: 'GitHub Cards & Layouts',
		sveltePath: 'src/lib/github/GitHubMergeQueue.svelte',
		upstreamSource: 'Agents Kit Svelte · GitHub Lifecycle',
		description:
			'Merge queue for a protected branch: the head group runs checks, the next is tested speculatively, merged PRs slide out with flip animations, and you can hold the queue or pull an entry.',
		usageSnippet: `<script lang="ts">
  import { GitHubMergeQueue } from 'agents-kit-svelte';
  import { SAMPLE_MERGE_QUEUE } from 'agents-kit-svelte/fixtures';

  let removed = $state<number[]>([]);
</script>

<GitHubMergeQueue
  entries={SAMPLE_MERGE_QUEUE}
  baseBranch="main"
  live
  onRemove={(prNumber) => (removed = [...removed, prNumber])}
/>`
	},
	{
		slug: 'github-deployment-pipeline',
		name: 'GitHubDeploymentPipeline',
		category: 'GitHub Cards & Layouts',
		sveltePath: 'src/lib/github/GitHubDeploymentPipeline.svelte',
		upstreamSource: 'Agents Kit Svelte · GitHub Lifecycle',
		description:
			'Environment promotion from Preview to Staging to Production, with a protected-environment approval gate, staged traffic rollout and one-click rollback.',
		usageSnippet: `<script lang="ts">
  import { GitHubDeploymentPipeline } from 'agents-kit-svelte';
  import { SAMPLE_ENVIRONMENTS } from 'agents-kit-svelte/fixtures';

  let lastAction = $state('');
</script>

<GitHubDeploymentPipeline
  environments={SAMPLE_ENVIRONMENTS}
  sha="9b07d3e"
  live
  onApprove={(env) => (lastAction = \`approved \${env}\`)}
  onRollback={(env) => (lastAction = \`rolled back \${env}\`)}
/>`
	},
	{
		slug: 'github-release-card',
		name: 'GitHubReleaseCard',
		category: 'GitHub Cards & Layouts',
		sveltePath: 'src/lib/github/GitHubReleaseCard.svelte',
		upstreamSource: 'Agents Kit Svelte · GitHub Lifecycle',
		description:
			'Draft release whose notes are written from merged PRs and grouped by type, with contributors, assets, and a Latest / Pre-release publish control.',
		usageSnippet: `<script lang="ts">
  import { GitHubReleaseCard } from 'agents-kit-svelte';
  import { SAMPLE_RELEASE } from 'agents-kit-svelte/fixtures';

  let publishedTag = $state<string | null>(null);
</script>

<GitHubReleaseCard
  release={SAMPLE_RELEASE}
  live
  onPublish={(tag, prerelease) => (publishedTag = tag)}
/>`
	},
	{
		slug: 'github-incident-card',
		name: 'GitHubIncidentCard',
		category: 'GitHub Cards & Layouts',
		sveltePath: 'src/lib/github/GitHubIncidentCard.svelte',
		upstreamSource: 'Agents Kit Svelte · GitHub Lifecycle',
		description:
			'Production incident card: a live error-rate sparkline crosses its threshold, the suspect deploy is identified, and a revert walks the incident to resolved.',
		usageSnippet: `<script lang="ts">
  import { GitHubIncidentCard } from 'agents-kit-svelte';
  import { SAMPLE_INCIDENT } from 'agents-kit-svelte/fixtures';

  let reverted = $state<number | null>(null);
</script>

<GitHubIncidentCard
  incident={SAMPLE_INCIDENT}
  live
  onRevert={(prNumber, sha) => (reverted = prNumber)}
/>`
	},
	{
		slug: 'github-pr-action-bar',
		name: 'GitHubPrActionBar',
		category: 'GitHub Cards & Layouts',
		sveltePath: 'src/lib/github/GitHubPrActionBar.svelte',
		upstreamSource: 'Agents Kit Svelte · PR Flow',
		description:
			'The bar that docks above the composer once a branch has changes: a Create PR button that spins while the agent opens it and turns into the PR number, next to a GitHub-style +/− diff stat that opens a per-file menu.',
		usageSnippet: `<script lang="ts">
  import { GitHubPrActionBar, type DiffStat, type PrActionStatus } from 'agents-kit-svelte';

  const diff: DiffStat = {
    additions: 482,
    deletions: 37,
    files: [
      { path: 'src/lib/session.ts', additions: 214, deletions: 22 },
      { path: 'src/lib/session.test.ts', additions: 268, deletions: 15 }
    ]
  };
  let status = $state<PrActionStatus>('idle');

  function create() {
    status = 'creating';
    setTimeout(() => (status = 'created'), 1500);
  }
</script>

<GitHubPrActionBar
  {diff}
  {status}
  prNumber={128}
  onCreate={create}
  onOpenPr={(n) => console.log('open PR', n)}
  onSelectFile={(path) => console.log('open', path)}
/>`
	},
	{
		slug: 'github-pr-graph',
		name: 'GitHubPullRequestGraph',
		category: 'GitHub Cards & Layouts',
		sveltePath: 'src/lib/github/GitHubPullRequestGraph.svelte',
		upstreamSource: 'Agents Kit Svelte · PR Flow',
		description:
			'A pull request card with a commit graph: the base branch on the left, each branch forking off it with a coloured lane and chip, and a dashed line from the head to a “Merge into main” node that spins while checking and fills purple once merged.',
		usageSnippet: `<script lang="ts">
  import { GitHubPullRequestGraph, type PrGraphLane, type PrGraphCommit, type PrMergeState } from 'agents-kit-svelte';

  const lanes: PrGraphLane[] = [
    { id: 'main', branch: 'main', base: true },
    { id: 'session', branch: 'feat/session-refresh' }
  ];
  const commits: PrGraphCommit[] = [
    { sha: 'd29f50a', message: 'Add session refresh tests', lane: 'session', author: 'You', age: 'now' },
    { sha: 'c70a92e', message: 'Refresh sessions near expiry', lane: 'session', author: 'You', age: '25m' },
    { sha: '9c2d4a1', message: 'Bump next to 16.3', lane: 'main', author: 'Sam', age: '3h' }
  ];
  let mergeState = $state<PrMergeState>('checking');
</script>

<GitHubPullRequestGraph
  title="Refresh sessions before they expire"
  number={128}
  {lanes}
  {commits}
  head="session"
  {mergeState}
  footer={{ label: 'Checks 2/5', tone: 'running' }}
  onSelectCommit={(commit) => console.log('open', commit.sha)}
/>`
	},
	{
		slug: 'github-checks-waterfall',
		name: 'GitHubChecksWaterfall',
		category: 'GitHub Cards & Layouts',
		sveltePath: 'src/lib/github/GitHubChecksWaterfall.svelte',
		upstreamSource: 'Agents Kit Svelte · PR Flow',
		description:
			'CI checks as a live waterfall: one bar per check on a shared time axis, a status ring in the header, the failing assertion inline with expected and received, and Fix and Merge buttons that hand the next step to the agent.',
		usageSnippet: `<script lang="ts">
  import { GitHubChecksWaterfall, type CheckRun, type ChecksPhase } from 'agents-kit-svelte';

  let checks = $state<CheckRun[]>([
    { id: 'lint', name: 'lint', status: 'passed', start: 1, duration: 11 },
    { id: 'unit', name: 'unit', status: 'running', start: 2 },
    {
      id: 'e2e',
      name: 'e2e',
      status: 'failed',
      start: 0,
      duration: 33,
      failure: { location: 'e2e/checkout.spec.ts:42', title: 'keeps the cart after a refresh', expected: '/checkout', received: '/sign-in' }
    }
  ]);
  let now = $state(24);
  let phase = $state<ChecksPhase>('checks');
</script>

<GitHubChecksWaterfall
  prNumber={128}
  commit={{ sha: 'd29f50a', message: 'Add session refresh tests' }}
  {checks}
  {now}
  {phase}
  onFix={(failed) => (phase = 'fixing')}
  onMerge={() => (phase = 'merging')}
/>`
	},

	// 4. Intelligent UI & Generative (3 components)
	{
		slug: 'agent-generative-surface',
		name: 'AgentGenerativeSurface',
		category: 'Intelligent UI & Generative',
		sveltePath: 'src/lib/intelligent-ui/AgentGenerativeSurface.svelte',
		upstreamSource: 'Agents Kit · components/agents-ui/agent-generative-surface.tsx',
		description:
			'Polymorphic generative surface supporting comparison, recommendation, checklist, document, source-brief, activity, and GitHub cards.',
		usageSnippet: `<script lang="ts">
  import { AgentGenerativeSurface, type GeneratedSurfaceContent } from 'agents-kit-svelte';

  const content: GeneratedSurfaceContent = {
    type: 'comparison',
    title: 'Framework Portability Evaluation',
    description: 'Generated by AK-S Agent · 96% confidence',
    selectedId: 'svelte5',
    options: [
      {
        id: 'svelte5',
        title: 'Svelte 5 Runes (agents-kit-svelte)',
        description: 'Fine-grained reactivity with zero Virtual DOM overhead and 100% OKLCH tokens.',
        recommended: true,
        attributes: [
          { label: 'Reactivity', value: '$props, $state, $derived' },
          { label: 'Theme System', value: 'OKLCH CSS variables (@theme inline)' }
        ]
      },
      {
        id: 'react',
        title: 'React Upstream',
        description: 'Original upstream reference implementation.',
        attributes: [
          { label: 'Reactivity', value: 'useState / useMemo hooks' },
          { label: 'Theme System', value: 'Tailwind utility classes' }
        ]
      }
    ]
  };
</script>

<AgentGenerativeSurface {content} />`
	},
	{
		slug: 'result-actions',
		name: 'ResultActions',
		category: 'Intelligent UI & Generative',
		sveltePath: 'src/lib/intelligent-ui/ResultActions.svelte',
		upstreamSource: 'Agents Kit · components/agents-ui/result-actions.tsx',
		description:
			'Composable action bar for generated surfaces with Expand, Edit, Compare, Save, Copy, and Markdown export.',
		usageSnippet: `<script lang="ts">
  import { ResultActions, type ResultActionState } from 'agents-kit-svelte';

  let mode = $state<ResultActionState>('view');
  let saved = $state(false);
</script>

<ResultActions
  state={mode}
  {saved}
  onExpand={() => (mode = mode === 'expanded' ? 'view' : 'expanded')}
  onEdit={() => (mode = mode === 'editing' ? 'view' : 'editing')}
  onCompare={() => (mode = mode === 'comparing' ? 'view' : 'comparing')}
  onSave={() => (saved = !saved)}
/>`
	},
	{
		slug: 'intelligent-ui-renderer',
		name: 'IntelligentUIRenderer',
		category: 'Intelligent UI & Generative',
		sveltePath: 'src/lib/intelligent-ui/IntelligentUIRenderer.svelte',
		upstreamSource: 'Agents Kit Svelte · Dynamic Intelligent UI Engine',
		description:
			'Declarative JSON-schema to Svelte 5 renderer with animate:flip and fly transitions.',
		usageSnippet: `<script lang="ts">
  import { IntelligentUIRenderer, type DynamicUINode } from 'agents-kit-svelte';

  const nodes: DynamicUINode[] = [
    {
      id: 'dyn-1',
      component: 'agent-activity',
      title: 'Dynamic Schema Node 1 · AgentActivity',
      props: {
        status: 'complete',
        durationSeconds: 4,
        defaultOpen: true,
        items: [
          { id: 'a-1', type: 'tool', label: 'Read', target: 'src/lib/index.ts', status: 'complete' }
        ]
      }
    },
    {
      id: 'dyn-2',
      component: 'todo-list',
      title: 'Dynamic Schema Node 2 · TodoList',
      props: {
        title: 'Generated Verification Plan',
        items: [
          { id: 't-1', label: 'Validate JSON schema payload', status: 'completed' },
          { id: 't-2', label: 'Mount Svelte 5 component tree', status: 'in-progress' }
        ]
      }
    }
  ];
</script>

<IntelligentUIRenderer
  {nodes}
  onIntent={({ nodeId, action, detail }) => console.log(nodeId, action, detail)}
/>`
	},

	// 5. Agents UI Orchestration (12 components)
	{
		slug: 'agent-orchestrator',
		name: 'AgentOrchestrator',
		category: 'Agents UI Orchestration',
		sveltePath: 'src/lib/agents-ui/AgentOrchestrator.svelte',
		upstreamSource: 'Agents Kit · components/agents-ui/agent-orchestrator.tsx',
		description:
			'Supervisor-to-subagent delegation graph with live handoff status and token budgets.',
		usageSnippet: `<script lang="ts">
  import { AgentOrchestrator, type SubAgent } from 'agents-kit-svelte';

  const subAgents: SubAgent[] = [
    { id: 'a-1', name: 'Researcher', role: 'Reads the codebase', status: 'completed', task: 'Map the exports', progress: 100 },
    { id: 'a-2', name: 'Implementer', role: 'Writes the change', status: 'running', task: 'Add the adapter', progress: 60 },
    { id: 'a-3', name: 'Reviewer', role: 'Checks the diff', status: 'idle', task: 'Review the PR', progress: 0 }
  ];
</script>

<AgentOrchestrator
  orchestratorName="Release run"
  description="Three agents working on one pull request."
  {subAgents}
  isProcessing
  onRetryAgent={(id) => console.log('retry', id)}
/>`
	},
	{
		slug: 'agent-parallel-processor',
		name: 'AgentParallelProcessor',
		category: 'Agents UI Orchestration',
		sveltePath: 'src/lib/agents-ui/AgentParallelProcessor.svelte',
		upstreamSource: 'Agents Kit · components/agents-ui/agent-parallel-processor.tsx',
		description:
			'Multi-lane parallel worker pool monitor for concurrent worktree, test, and search jobs.',
		usageSnippet: `<script lang="ts">
  import { AgentParallelProcessor, type ParallelLane } from 'agents-kit-svelte';

  const lanes: ParallelLane[] = [
    { id: 'l-1', label: 'Docs', agentName: 'writer', status: 'done', progress: 100, tokens: 1840 },
    { id: 'l-2', label: 'Tests', agentName: 'tester', status: 'processing', progress: 55 },
    { id: 'l-3', label: 'Types', agentName: 'typist', status: 'waiting', progress: 0 }
  ];
</script>

<AgentParallelProcessor
  taskDescription="Prepare the 1.0 release"
  {lanes}
  mergeStatus="idle"
  onRetryLane={(id) => console.log('retry', id)}
/>`
	},
	{
		slug: 'agent-sequential-workflow',
		name: 'AgentSequentialWorkflow',
		category: 'Agents UI Orchestration',
		sveltePath: 'src/lib/agents-ui/AgentSequentialWorkflow.svelte',
		upstreamSource: 'Agents Kit · components/agents-ui/agent-sequential-workflow.tsx',
		description:
			'Step-by-step pipeline planner with gate dependencies, retry actions, and stage durations.',
		usageSnippet: `<script lang="ts">
  import { AgentSequentialWorkflow, type WorkflowStep } from 'agents-kit-svelte';

  const steps: WorkflowStep[] = [
    { id: 's-1', number: 1, title: 'Plan', agentName: 'planner', inputSummary: 'Issue #42', outputSummary: '4 tasks', status: 'completed', duration: '12s' },
    { id: 's-2', number: 2, title: 'Implement', agentName: 'coder', inputSummary: '4 tasks', outputSummary: 'Writing files', status: 'running' },
    { id: 's-3', number: 3, title: 'Review', agentName: 'reviewer', gateDependency: 'Tests pass', inputSummary: 'Diff', outputSummary: '', status: 'waiting' }
  ];
</script>

<AgentSequentialWorkflow
  workflowName="Fix issue #42"
  {steps}
  currentStepId="s-2"
  isRunning
  onRetryStep={(id) => console.log('retry', id)}
/>`
	},
	{
		slug: 'agent-routing-hub',
		name: 'AgentRoutingHub',
		category: 'Agents UI Orchestration',
		sveltePath: 'src/lib/agents-ui/AgentRoutingHub.svelte',
		upstreamSource: 'Agents Kit · components/agents-ui/agent-routing-hub.tsx',
		description:
			'Intent classifier & agent router showing confidence scores across AK-S Agent, Claude Code, Codex, and Gemini.',
		usageSnippet: `<script lang="ts">
  import { AgentRoutingHub, type AgentRoute } from 'agents-kit-svelte';

  const routes: AgentRoute[] = [
    { id: 'r-1', agentName: 'Billing agent', specialty: 'Invoices and refunds', matchScore: 0.92, status: 'selected', description: 'Can issue refunds up to $500.' },
    { id: 'r-2', agentName: 'Support agent', specialty: 'General questions', matchScore: 0.41, status: 'available', description: 'Answers from the help centre.' }
  ];
</script>

<AgentRoutingHub
  inputQuery="I was charged twice this month"
  classification={{ intent: 'billing.refund', confidence: 0.92, reasoning: 'Mentions a duplicate charge.' }}
  {routes}
  selectedRouteId="r-1"
  onOverrideRoute={(id) => console.log('route to', id)}
/>`
	},
	{
		slug: 'agent-evaluator',
		name: 'AgentEvaluator',
		category: 'Agents UI Orchestration',
		sveltePath: 'src/lib/agents-ui/AgentEvaluator.svelte',
		upstreamSource: 'Agents Kit · components/agents-ui/agent-evaluator.tsx',
		description: 'Rubric-based evaluation & red-team referee scorecard with weighted criteria.',
		usageSnippet: `<script lang="ts">
  import { AgentEvaluator, type EvalIteration } from 'agents-kit-svelte';

  const iterations: EvalIteration[] = [
    {
      id: 'it-1',
      number: 1,
      output: 'Summary misses the breaking change.',
      score: 64,
      feedback: 'Mention the renamed tokens.',
      status: 'failed',
      criteria: [
        { label: 'Accuracy', score: 6, maxScore: 10, status: 'warn' },
        { label: 'Completeness', score: 5, maxScore: 10, status: 'fail', note: 'No migration notes' }
      ]
    },
    {
      id: 'it-2',
      number: 2,
      output: 'Summary covers the token rename and the alias period.',
      score: 91,
      feedback: 'Ready to ship.',
      status: 'passed',
      criteria: [
        { label: 'Accuracy', score: 9, maxScore: 10, status: 'pass' },
        { label: 'Completeness', score: 9, maxScore: 10, status: 'pass' }
      ]
    }
  ];
</script>

<AgentEvaluator
  taskDescription="Write the release summary"
  {iterations}
  qualityThreshold={85}
  onAccept={() => console.log('accepted')}
/>`
	},
	{
		slug: 'agent-ops-monitor',
		name: 'AgentOpsMonitor',
		category: 'Agents UI Orchestration',
		sveltePath: 'src/lib/agents-ui/AgentOpsMonitor.svelte',
		upstreamSource: 'Agents Kit · components/agents-ui/agent-ops-monitor.tsx',
		description:
			'Live latency, token throughput, tool success rate, and Companion daemon health panel.',
		usageSnippet: `<script lang="ts">
  import { AgentOpsMonitor, type OpsSignal, type OpsServiceMetric } from 'agents-kit-svelte';

  const signals: OpsSignal[] = [
    { id: 's-1', title: 'Queue latency', status: 'warning', detail: 'p95 above 4s for 10 minutes', owner: 'runner' },
    { id: 's-2', title: 'Worker pool', status: 'healthy', detail: '6 of 6 workers online' }
  ];
  const metrics: OpsServiceMetric[] = [
    { label: 'Success rate', value: '98.2%', threshold: '95%', trend: 'stable' },
    { label: 'Cost / run', value: '$0.41', threshold: '$0.60', trend: 'down' }
  ];
</script>

<AgentOpsMonitor
  environment="production"
  daemonStatus="Degraded"
  uptime="14d 3h"
  {signals}
  {metrics}
  onAcknowledge={(signal) => console.log('ack', signal.id)}
/>`
	},
	{
		slug: 'agent-task-queue',
		name: 'AgentTaskQueue',
		category: 'Agents UI Orchestration',
		sveltePath: 'src/lib/agents-ui/AgentTaskQueue.svelte',
		upstreamSource: 'Agents Kit · components/agents-ui/agent-task-queue.tsx',
		description: 'Prioritized agent run queue with pause, promote, and cancel controls.',
		usageSnippet: `<script lang="ts">
  import { AgentTaskQueue, type AgentTask } from 'agents-kit-svelte';

  let tasks: AgentTask[] = $state([
    { id: 'q-1', title: 'Fix the overflow menu label', priority: 'high', status: 'running', progress: 40 },
    { id: 'q-2', title: 'Add an empty state', priority: 'medium', status: 'queued' },
    { id: 'q-3', title: 'Restore drawer focus', status: 'completed', progress: 100 }
  ]);
</script>

<AgentTaskQueue
  {tasks}
  activeTaskId="q-1"
  onCancelTask={(id) => (tasks = tasks.filter((t) => t.id !== id))}
  onReorder={(ids) => (tasks = ids.map((id) => tasks.find((t) => t.id === id)!))}
/>`
	},
	{
		slug: 'blocked-work-list',
		name: 'BlockedWorkList',
		category: 'Agents UI Orchestration',
		sveltePath: 'src/lib/agents-ui/BlockedWorkList.svelte',
		upstreamSource: 'Agents Kit Svelte · Agents UI Orchestration',
		description:
			'What is stuck, and what can be done about it. Items are grouped by why they are stuck, and each shows only the actions you allow for it. An action with a confirm sentence asks inline first; busy items show a spinner.',
		usageSnippet: `<script lang="ts">
  import { BlockedWorkList, type BlockedItem } from 'agents-kit-svelte';

  let busy: string[] = $state([]);
  const items: BlockedItem[] = [
    {
      id: 'w-1',
      ref: '#3412',
      title: 'Add rate limiting to the export endpoint',
      reason: { kind: 'unstarted', label: 'Not started for 40 min' },
      actions: [{ id: 'start', label: 'Start now' }]
    },
    {
      id: 'w-2',
      title: 'Retire the legacy signer',
      reason: { kind: 'hold', label: 'Held after a failed run' },
      actions: [{ id: 'discard', label: 'Discard run', tone: 'danger', confirm: 'Discard the failed run?' }]
    }
  ];
</script>

<BlockedWorkList {items} busyIds={busy} onAction={(item, action) => (busy = [...busy, item.id])} />`
	},
	{
		slug: 'agent-artifact',
		name: 'AgentArtifact',
		category: 'Agents UI Orchestration',
		sveltePath: 'src/lib/agents-ui/AgentArtifact.svelte',
		upstreamSource: 'Agents Kit · components/agents-ui/agent-artifact.tsx',
		description:
			'Rich artifact viewer/editor with tabs for Preview, Markdown Source, Schema, and History.',
		usageSnippet: `<script lang="ts">
  import { AgentArtifact, type ArtifactVersion } from 'agents-kit-svelte';

  const versions: ArtifactVersion[] = [
    { id: 'v1', label: 'v1', timestamp: '10:02', content: '# Release notes\\n\\n- First draft' },
    { id: 'v2', label: 'v2', timestamp: '10:06', summary: 'Added the install step', content: '# Release notes\\n\\n- First draft\\n- Install with pnpm add agents-kit-svelte' }
  ];
  let currentVersion = $state('v2');
</script>

<AgentArtifact
  title="release-notes.md"
  artifactType="document"
  {versions}
  {currentVersion}
  content={versions.find((v) => v.id === currentVersion)?.content}
  metadata={{ model: 'claude', tokens: 412 }}
  onVersionChange={(id) => (currentVersion = id)}
  onCopy={(text) => navigator.clipboard.writeText(text)}
/>`
	},
	{
		slug: 'agent-form-generator',
		name: 'AgentFormGenerator',
		category: 'Agents UI Orchestration',
		sveltePath: 'src/lib/agents-ui/AgentFormGenerator.svelte',
		upstreamSource: 'Agents Kit · components/agents-ui/agent-form-generator.tsx',
		description:
			'Dynamic schema-to-form generator for structured agent tool inputs with live payload preview.',
		usageSnippet: `<script lang="ts">
  import { AgentFormGenerator, type FormField } from 'agents-kit-svelte';

  const fields: FormField[] = [
    { id: 'name', label: 'Project name', type: 'text', required: true, placeholder: 'my-app' },
    { id: 'framework', label: 'Framework', type: 'select', options: ['SvelteKit', 'Vite'] },
    { id: 'ssr', label: 'Server rendering', type: 'checkbox', defaultValue: true }
  ];
</script>

<AgentFormGenerator
  formTitle="New project"
  formDescription="Generated from the agent's tool schema."
  {fields}
  onSubmitPayload={(payload) => console.log(payload)}
/>`
	},
	{
		slug: 'agent-tool-palette',
		name: 'AgentToolPalette',
		category: 'Agents UI Orchestration',
		sveltePath: 'src/lib/agents-ui/AgentToolPalette.svelte',
		upstreamSource: 'Agents Kit · components/agents-ui/agent-tool-palette.tsx',
		description:
			'Interactive command & MCP tool palette with category filter and parameter preview.',
		usageSnippet: `<script lang="ts">
  import { AgentToolPalette, type AgentTool } from 'agents-kit-svelte';

  let tools: AgentTool[] = $state([
    { id: 'read', name: 'Read', description: 'Read a file', category: 'files', enabled: true, parameters: [{ name: 'path', type: 'string', required: true }] },
    { id: 'bash', name: 'Bash', description: 'Run a shell command', category: 'shell', enabled: false },
    { id: 'fetch', name: 'WebFetch', description: 'Fetch a URL', category: 'web', enabled: true }
  ]);
</script>

<AgentToolPalette
  {tools}
  categoryLabels={{ files: 'Files', shell: 'Shell', web: 'Web' }}
  onToolToggle={(id, enabled) => (tools = tools.map((t) => (t.id === id ? { ...t, enabled } : t)))}
/>`
	},
	{
		slug: 'agent-thinking-indicator',
		name: 'AgentThinkingIndicator',
		category: 'Agents UI Orchestration',
		sveltePath: 'src/lib/agents-ui/AgentThinkingIndicator.svelte',
		upstreamSource: 'Agents Kit · components/agents-ui/agent-thinking-indicator.tsx',
		description:
			'Multi-variant animated thinking indicator (wave, spin, stars, infinity, orbs).',
		usageSnippet: `<script lang="ts">
  import { AgentThinkingIndicator, type ThinkingVariant } from 'agents-kit-svelte';

  let variant: ThinkingVariant = $state('wave');
</script>

<AgentThinkingIndicator
  {variant}
  state="searching"
  label="Searching the docs"
  showControls
  onVariantChange={(next) => (variant = next)}
/>`
	},

	{
		slug: 'fleet-status',
		name: 'FleetStatus',
		category: 'Agents UI Orchestration',
		sveltePath: 'src/lib/agents-ui/FleetStatus.svelte',
		upstreamSource: 'Agents Kit Svelte · Operator cards',
		description:
			'What is happening on the machines that run agent work: presence, busy slots as a segmented bar, what runs on each machine, warning chips for missing safeguards and the machine the operator lives on. Stacked cards on a phone, dense rows on desktop.',
		usageSnippet: `<script lang="ts">
  import { FleetStatus, type Machine } from 'agents-kit-svelte';

  let machines = $state<Machine[]>([
    {
      id: 'devbox',
      name: 'devbox',
      presence: 'online',
      slots: { used: 4, total: 6 },
      badge: 'Operator',
      flags: [{ id: 'confined', label: 'Confined', ok: true }],
      work: [{ id: '3412', label: '#3412 Fix sign-in redirect', status: 'running' }]
    },
    {
      id: 'laptop',
      name: 'laptop',
      presence: 'offline',
      lastSeen: '2026-11-11T09:00:00Z',
      slots: { used: 0, total: 2 },
      flags: [{ id: 'confined', label: 'Confinement off', ok: false }]
    }
  ]);
</script>

<FleetStatus
  title="Fleet"
  {machines}
  onSelectMachine={(machine) => console.log('open', machine.id)}
  onSelectWork={(work, machine) => console.log('open', work.id, 'on', machine.id)}
/>`
	},

	// 6. AI Elements & Coding (13 components)
	{
		slug: 'agent-context-meter',
		name: 'AgentContextMeter',
		category: 'AI Elements & Coding',
		sveltePath: 'src/lib/runtime/AgentContextMeter.svelte',
		upstreamSource: 'Agents Kit · components/agents-ui/agent-context-meter.tsx',
		description:
			'Spring-animated token window usage bar with expandable source breakdown popover.',
		usageSnippet: `<script lang="ts">
  import { AgentContextMeter, type ContextSourceItem } from 'agents-kit-svelte';

  const sources: ContextSourceItem[] = [
    { id: 'sys', label: 'System & Architecture Brief', tokens: 14200, category: 'system' },
    { id: 'wt', label: 'Worktree AST & Diffs', tokens: 32000, category: 'worktree' },
    { id: 'conv', label: 'Session History', tokens: 18000, category: 'conversation' }
  ];
</script>

<AgentContextMeter
  usedTokens={64200}
  maxTokens={200000}
  {sources}
/>`
	},
	{
		slug: 'agent-checkpoint',
		name: 'AgentCheckpoint',
		category: 'AI Elements & Coding',
		sveltePath: 'src/lib/runtime/AgentCheckpoint.svelte',
		upstreamSource: 'Agents Kit · components/agents-ui/agent-checkpoint.tsx',
		description:
			'Worktree git checkpoint card with commit SHA, changed file count, and restore trigger.',
		usageSnippet: `<script lang="ts">
  import { AgentCheckpoint, type CheckpointEntry } from 'agents-kit-svelte';

  const checkpoint: CheckpointEntry = {
    id: 'cp-1',
    title: 'Verified 76 Svelte 5 components + unit suite',
    description: 'All static and unit checks green',
    commitSha: '456f3b4',
    worktreeBranch: 'trailside/2151-drawer-hydration',
    timestamp: '2m ago',
    filesChanged: 12,
    restorable: true
  };
</script>

<AgentCheckpoint {checkpoint} />`
	},
	{
		slug: 'chain-of-thought',
		name: 'ChainOfThought',
		category: 'AI Elements & Coding',
		sveltePath: 'src/lib/ai-elements/ChainOfThought.svelte',
		upstreamSource: 'AI Elements · components/ai-elements/chain-of-thought.tsx',
		description:
			'Multi-step collapsible chain-of-thought reasoning trace with step durations and confidence.',
		usageSnippet: `<script lang="ts">
  import { ChainOfThought, type ChainOfThoughtStepItem } from 'agents-kit-svelte';

  const steps: ChainOfThoughtStepItem[] = [
    { id: 's-1', label: 'Read the failing test', status: 'complete', durationMs: 900, tools: ['Read'] },
    { id: 's-2', label: 'Find where the date is parsed', status: 'active', sources: ['src/lib/date.ts'] },
    { id: 's-3', label: 'Write the fix', status: 'pending' }
  ];
</script>

<ChainOfThought title="Fixing the date bug" {steps} isStreaming defaultOpen />`
	},
	{
		slug: 'stack-trace',
		name: 'StackTrace',
		category: 'AI Elements & Coding',
		sveltePath: 'src/lib/ai-elements/StackTrace.svelte',
		upstreamSource: 'AI Elements · components/ai-elements/stack-trace.tsx',
		description:
			'Interactive error stack trace viewer with highlighted source frame and Send to Agent action.',
		usageSnippet: `<script lang="ts">
  import { StackTrace } from 'agents-kit-svelte';

  const trace = [
    "TypeError: Cannot read properties of undefined (reading 'id')",
    '    at loadUser (src/lib/user.ts:14:22)',
    '    at load (src/routes/+page.ts:6:10)',
    '    at node_modules/@sveltejs/kit/src/runtime/client.js:410:9'
  ].join('\\n');
</script>

<StackTrace
  {trace}
  defaultOpen
  onFilePathClick={(path, line) => console.log('open', path, line)}
  onSendToAgent={(text) => console.log('ask the agent about', text)}
/>`
	},
	{
		slug: 'schema-display',
		name: 'SchemaDisplay',
		category: 'AI Elements & Coding',
		sveltePath: 'src/lib/ai-elements/SchemaDisplay.svelte',
		upstreamSource: 'AI Elements · components/ai-elements/schema-display.tsx',
		description:
			'Interactive HTTP/Tool schema inspector with expandable nested request/response properties.',
		usageSnippet: `<script lang="ts">
  import { SchemaDisplay, type SchemaParameterItem, type SchemaPropertyItem } from 'agents-kit-svelte';

  const parameters: SchemaParameterItem[] = [
    { name: 'owner', type: 'string', required: true, location: 'path' },
    { name: 'state', type: "'open' | 'closed'", location: 'query' }
  ];
  const responseBody: SchemaPropertyItem[] = [
    { name: 'number', type: 'integer', required: true },
    { name: 'labels', type: 'array', items: { name: 'label', type: 'object', properties: [{ name: 'name', type: 'string' }] } }
  ];
</script>

<SchemaDisplay
  method="GET"
  path={'/repos/{owner}/{repo}/issues'}
  description="List issues in a repository."
  {parameters}
  {responseBody}
/>`
	},
	{
		slug: 'environment-variables',
		name: 'EnvironmentVariables',
		category: 'AI Elements & Coding',
		sveltePath: 'src/lib/ai-elements/EnvironmentVariables.svelte',
		upstreamSource: 'AI Elements · components/ai-elements/environment-variables.tsx',
		description:
			'Masked .env and runtime configuration inspector with reveal toggles and scope badges.',
		usageSnippet: `<script lang="ts">
  import { EnvironmentVariables, type EnvVariableEntry } from 'agents-kit-svelte';

  const variables: EnvVariableEntry[] = [
    { name: 'DATABASE_URL', value: 'postgres://localhost/app', required: true, scope: 'runtime' },
    { name: 'ANTHROPIC_API_KEY', value: 'sk-ant-…', required: true, scope: 'secret' },
    { name: 'PUBLIC_SITE_URL', value: 'https://example.com', scope: 'build' }
  ];
</script>

<EnvironmentVariables title=".env" {variables} />`
	},
	{
		slug: 'package-info',
		name: 'PackageInfo',
		category: 'AI Elements & Coding',
		sveltePath: 'src/lib/ai-elements/PackageInfo.svelte',
		upstreamSource: 'AI Elements · components/ai-elements/package-info.tsx',
		description:
			'Package metadata card with version diff, dependencies, scripts, and verification status.',
		usageSnippet: `<script lang="ts">
  import { PackageInfo, type PackageDependencyItem } from 'agents-kit-svelte';

  const dependencies: PackageDependencyItem[] = [
    { name: 'svelte', version: '^5.0.0' },
    { name: 'tailwind-merge', version: '^3.0.0' },
    { name: 'vitest', version: '^3.0.0', dev: true }
  ];
</script>

<PackageInfo
  name="agents-kit-svelte"
  currentVersion="0.9.0"
  newVersion="1.0.0"
  changeType="major"
  license="MIT"
  verified
  scripts={[{ name: 'build', command: 'svelte-package' }]}
  {dependencies}
/>`
	},
	{
		slug: 'web-preview',
		name: 'WebPreview',
		category: 'AI Elements & Coding',
		sveltePath: 'src/lib/ai-elements/WebPreview.svelte',
		upstreamSource: 'AI Elements · components/ai-elements/web-preview.tsx',
		description:
			'Live web preview frame with URL bar, 390px/768px/1440px viewport switcher, and console drawer.',
		usageSnippet: `<script lang="ts">
  import { WebPreview, type PreviewConsoleLog } from 'agents-kit-svelte';

  const logs: PreviewConsoleLog[] = [
    { id: 'l-1', level: 'log', message: 'App mounted', timestamp: '10:02:11' },
    { id: 'l-2', level: 'warn', message: 'Image is missing alt text', timestamp: '10:02:12' }
  ];
</script>

<WebPreview defaultUrl="http://localhost:5173" defaultViewport="768px" {logs} onUrlChange={(url) => console.log(url)}>
  <iframe title="Preview" src="http://localhost:5173" class="h-full w-full"></iframe>
</WebPreview>`
	},
	{
		slug: 'plan-card',
		name: 'PlanCard',
		category: 'AI Elements & Coding',
		sveltePath: 'src/lib/ai-elements/PlanCard.svelte',
		upstreamSource: 'AI Elements · components/ai-elements/plan.tsx',
		description:
			'Structured agent execution plan card with approval status and step dependencies.',
		usageSnippet: `<script lang="ts">
  import { PlanCard } from 'agents-kit-svelte';

  let approved = $state(false);
</script>

<PlanCard
  title="Align Showcase with agents-ui/agents-kit Gallery"
  onApprove={() => (approved = true)}
/>`
	},
	{
		slug: 'prompt-suggestions',
		name: 'PromptSuggestions',
		category: 'AI Elements & Coding',
		sveltePath: 'src/lib/ai-elements/PromptSuggestions.svelte',
		upstreamSource: 'AI Elements · components/ai-elements/suggestion.tsx',
		description: 'Categorized starter prompt pills with search highlighting.',
		usageSnippet: `<script lang="ts">
  import { PromptSuggestions, type PromptSuggestionItem } from 'agents-kit-svelte';

  const suggestions: PromptSuggestionItem[] = [
    { id: 'p-1', category: 'inspect', label: 'Explain this repo', prompt: 'Give me a tour of this repository.' },
    { id: 'p-2', category: 'implement', label: 'Add a test', prompt: 'Add a unit test for the date parser.' },
    { id: 'p-3', category: 'review', label: 'Review my diff', prompt: 'Review the staged changes.' }
  ];
  let draft = $state('');
</script>

<PromptSuggestions {suggestions} onSelect={(item) => (draft = item.prompt)} />
<textarea bind:value={draft}></textarea>`
	},
	{
		slug: 'test-results',
		name: 'TestResults',
		category: 'AI Elements & Coding',
		sveltePath: 'src/lib/runtime/TestResults.svelte',
		upstreamSource: 'AI Elements · components/ai-elements/test-results.tsx',
		description:
			'Expandable test suite runner with pass/fail/skip counts and per-case durations.',
		usageSnippet: `<script lang="ts">
  import { TestResults, type SuiteGroup } from 'agents-kit-svelte';

  const suites: SuiteGroup[] = [
    {
      id: 'suite-1',
      name: 'tests/svelte5-audit.test.ts',
      status: 'passed',
      tests: [
        { id: 'tc-1', name: 'all 76 Svelte components comply with Svelte 5 Runes and semantic tokens', status: 'passed', durationMs: 6 },
        { id: 'tc-2', name: 'every component has a dedicated 1-to-1 showcase entry and usage snippet', status: 'passed', durationMs: 2 }
      ]
    }
  ];
</script>

<TestResults {suites} durationMs={105} />`
	},
	{
		slug: 'terminal',
		name: 'Terminal',
		category: 'AI Elements & Coding',
		sveltePath: 'src/lib/runtime/Terminal.svelte',
		upstreamSource: 'AI Elements · components/ai-elements/terminal.tsx',
		description: 'Worktree terminal console with copy buffer and streaming status.',
		usageSnippet: `<script lang="ts">
  import { Terminal } from 'agents-kit-svelte';

  let output = $state(
    [
      '$ corepack pnpm check && corepack pnpm test',
      'svelte-check found 0 errors and 0 warnings',
      '✔ all 76 Svelte components pass audit (105ms)'
    ].join('\\n')
  );
</script>

<Terminal
  title="~/agents-kit-svelte · zsh"
  {output}
  onClear={() => (output = '$ # Cleared')}
/>`
	},
	{
		slug: 'file-tree',
		name: 'FileTree',
		category: 'AI Elements & Coding',
		sveltePath: 'src/lib/runtime/FileTree.svelte',
		upstreamSource: 'AI Elements · components/ai-elements/file-tree.tsx',
		description:
			'Accessible worktree changed-file tree with per-file +additions/-deletions.',
		usageSnippet: `<script lang="ts">
  import { FileTree, type WorktreeFileNode } from 'agents-kit-svelte';

  let selectedPath = $state('src/lib/agents');

  const nodes: WorktreeFileNode[] = [
    {
      path: 'src/lib',
      name: 'src/lib',
      kind: 'folder',
      children: [
        { path: 'src/lib/agents', name: 'agents/ (19 components)', kind: 'file', additions: 19 },
        { path: 'src/lib/beautiful', name: 'beautiful/ (11 components)', kind: 'file', additions: 11 },
        { path: 'src/lib/github', name: 'github/ (15 components)', kind: 'file', additions: 15 },
        { path: 'src/lib/intelligent-ui', name: 'intelligent-ui/ (3 components)', kind: 'file', additions: 3 }
      ]
    }
  ];
</script>

<FileTree
  {nodes}
  {selectedPath}
  onSelect={(path) => (selectedPath = path)}
/>`
	},

	// 7. Agentic Skills (6 components)
	{
		slug: 'skill-library',
		name: 'SkillLibrary',
		category: 'Agentic Skills',
		sveltePath: 'src/lib/skills/SkillLibrary.svelte',
		upstreamSource: 'Agents Kit Svelte · Agentic Skills',
		description:
			'Searchable library of installed skills with Personal, Project, Plugin and Built-in scopes, enable switches and flip-animated filtering.',
		usageSnippet: `<script lang="ts">
  import { SkillLibrary, type AgentSkill } from 'agents-kit-svelte';
  import { SAMPLE_SKILLS } from 'agents-kit-svelte/fixtures';

  let skills = $state<AgentSkill[]>(SAMPLE_SKILLS);
  let lastRun = $state<string | null>(null);
</script>

<SkillLibrary
  {skills}
  onToggle={(id, enabled) =>
    (skills = skills.map((s) => (s.id === id ? { ...s, enabled } : s)))}
  onInvoke={(skill) => (lastRun = skill.name)}
  onCreate={() => console.log('open the skill editor')}
/>`
	},
	{
		slug: 'skill-card',
		name: 'SkillCard',
		category: 'Agentic Skills',
		sveltePath: 'src/lib/skills/SkillCard.svelte',
		upstreamSource: 'Agents Kit Svelte · Agentic Skills',
		description:
			'One skill at a glance: description, trigger phrases, allowed tools, bundled files, run count and an enable switch.',
		usageSnippet: `<script lang="ts">
  import { SkillCard, type AgentSkill } from 'agents-kit-svelte';

  const skill: AgentSkill = {
    id: 'release-notes',
    name: 'release-notes',
    description: 'Drafts release notes from merged PRs. Use when asked for a changelog.',
    scope: 'project',
    version: '1.2.0',
    triggers: ['write the release notes', 'what shipped this week'],
    allowedTools: ['Bash(git log:*)', 'Read', 'Write'],
    files: [
      { path: 'SKILL.md', kind: 'skill', size: '2.1 KB' },
      { path: 'scripts/collect_prs.sh', kind: 'script', size: '840 B' }
    ],
    invocations: 37,
    lastUsedLabel: '2h ago'
  };
</script>

<SkillCard
  {skill}
  defaultFilesOpen={true}
  onToggle={(id, enabled) => console.log(id, enabled)}
  onInvoke={(s) => console.log('run', s.name)}
/>`
	},
	{
		slug: 'skill-router',
		name: 'SkillRouter',
		category: 'Agentic Skills',
		sveltePath: 'src/lib/skills/SkillRouter.svelte',
		upstreamSource: 'Agents Kit Svelte · Agentic Skills',
		description:
			'Shows which skill a request would load: ranked candidates, matched terms, a threshold marker and a tweened confidence readout.',
		usageSnippet: `<script lang="ts">
  import { SkillRouter, type SkillMatch } from 'agents-kit-svelte';
  import { SAMPLE_SKILLS } from 'agents-kit-svelte/fixtures';

  let routed = $state<SkillMatch | null>(null);
</script>

<SkillRouter
  skills={SAMPLE_SKILLS}
  prompt="Chart weekly signups by region"
  threshold={0.45}
  onRoute={(prompt, match) => (routed = match)}
/>`
	},
	{
		slug: 'skill-invocation',
		name: 'SkillInvocation',
		category: 'Agentic Skills',
		sveltePath: 'src/lib/skills/SkillInvocation.svelte',
		upstreamSource: 'Agents Kit Svelte · Agentic Skills',
		description:
			'Inline “Using skill” trace for a chat transcript, with step statuses, a tweened progress bar and an optional result snippet.',
		usageSnippet: `<script lang="ts">
  import { SkillInvocation, type SkillInvocationStep } from 'agents-kit-svelte';
  import { SAMPLE_SKILLS } from 'agents-kit-svelte/fixtures';

  let steps = $state<SkillInvocationStep[]>([
    { id: 's-1', label: 'Read SKILL.md', detail: 'release-notes · 2.1 KB', status: 'complete' },
    { id: 's-2', label: 'Run scripts/collect_prs.sh', detail: '14 PRs merged', status: 'running' },
    { id: 's-3', label: 'Write RELEASE_NOTES.md', status: 'pending' }
  ]);
</script>

<SkillInvocation skill={SAMPLE_SKILLS[0]} {steps} status="running">
  {#snippet result()}
    <p class="text-xs text-fg-light">RELEASE_NOTES.md · 42 lines</p>
  {/snippet}
</SkillInvocation>`
	},
	{
		slug: 'skill-editor',
		name: 'SkillEditor',
		category: 'Agentic Skills',
		sveltePath: 'src/lib/skills/SkillEditor.svelte',
		upstreamSource: 'Agents Kit Svelte · Agentic Skills',
		description:
			'Author a SKILL.md: name, description, allowed tools and instructions, with a live file preview and frontmatter checks.',
		usageSnippet: `<script lang="ts">
  import { SkillEditor, type SkillManifest } from 'agents-kit-svelte';

  const manifest: SkillManifest = {
    name: 'incident-review',
    description: 'Builds a blameless incident timeline. Use after an outage.',
    allowedTools: ['Read', 'Grep'],
    body: '# Incident review\\n\\n1. Collect logs and chat.\\n2. Build the timeline.'
  };
</script>

<SkillEditor
  {manifest}
  title="New skill"
  onSave={(next, skillMd) => console.log(skillMd)}
/>`
	},
	{
		slug: 'skill-proposal-card',
		name: 'SkillProposalCard',
		category: 'Agentic Skills',
		sveltePath: 'src/lib/skills/SkillProposalCard.svelte',
		upstreamSource: 'Agents Kit Svelte · Agentic Skills',
		description:
			'Review card for a skill the agent suggests saving, or an update to one, with the evidence, a line diff of SKILL.md and Save or Not now.',
		usageSnippet: `<script lang="ts">
  import { SkillProposalCard, type SkillProposal } from 'agents-kit-svelte';
  import { SAMPLE_SKILL_PROPOSAL } from 'agents-kit-svelte/fixtures';

  const proposal: SkillProposal = SAMPLE_SKILL_PROPOSAL;
  let saved = $state(false);
</script>

<SkillProposalCard
  {proposal}
  onSave={() => (saved = true)}
  onDismiss={() => (saved = false)}
/>`
	},

	// 8. Charts & Timelines (8 components)
	{
		slug: 'generative-chart',
		name: 'GenerativeChart',
		category: 'Charts & Timelines',
		sveltePath: 'src/lib/charts/GenerativeChart.svelte',
		upstreamSource: 'Agents Kit Svelte · Charts & Timelines',
		description:
			'A line, area or bar chart drawn from one JSON spec an agent emits. It draws in, rescales smoothly as data streams, pins the agent’s callouts to points, and hands a clicked point to your onSelectPoint.',
		usageSnippet: `<script lang="ts">
  import { GenerativeChart, type ChartSpec, type ChartPoint } from 'agents-kit-svelte';

  const spec: ChartSpec = {
    kind: 'line',
    title: 'Checkout p95 latency',
    x: 'day',
    y: 'ms',
    series: 'build',
    unit: 'ms',
    data: [
      { day: 1, build: 'Before', ms: 412 },
      { day: 2, build: 'Before', ms: 431 },
      { day: 1, build: 'After', ms: 405 },
      { day: 2, build: 'After', ms: 318 }
    ],
    annotations: [{ x: 2, series: 'After', label: 'Cache shipped' }]
  };

  function openDetail(point: ChartPoint) {
    console.log('Open details for', point);
  }
</script>

<GenerativeChart {spec} height={240} onSelectPoint={openDetail} actionLabel="Click to open the build" />`
	},
	{
		slug: 'agent-handoff-gantt',
		name: 'AgentHandoffGantt',
		category: 'Charts & Timelines',
		sveltePath: 'src/lib/charts/AgentHandoffGantt.svelte',
		upstreamSource: 'Agents Kit Svelte · Charts & Timelines',
		description:
			'A Gantt of one agent run: a lane per agent or model, a bar per phase, and arrows for each handoff labelled with what was passed. Live bars grow to a moving cursor, and retried attempts stay behind as ghosts.',
		usageSnippet: `<script lang="ts">
  import { AgentHandoffGantt, type HandoffLane, type HandoffSpan, type HandoffLink } from 'agents-kit-svelte';

  const lanes: HandoffLane[] = [
    { id: 'planner', label: 'Planner', model: 'claude-opus' },
    { id: 'implementer', label: 'Implementer', model: 'claude-sonnet' }
  ];
  const spans: HandoffSpan[] = [
    { id: 'plan', lane: 'planner', phase: 'plan', start: 0, end: 38, status: 'done', label: 'Plan' },
    { id: 'impl', lane: 'implementer', phase: 'implement', start: 42, status: 'running', label: 'Implement' }
  ];
  const handoffs: HandoffLink[] = [{ id: 'h1', from: 'plan', to: 'impl', artifact: 'plan.md', kind: 'file' }];
</script>

<AgentHandoffGantt
  title="Card #214"
  {lanes}
  {spans}
  {handoffs}
  now={96}
  onSelectSpan={(span) => console.log('span', span.id)}
  onSelectHandoff={(handoff) => console.log('open', handoff.artifact)}
/>`
	},
	{
		slug: 'model-phase-stream',
		name: 'ModelPhaseStream',
		category: 'Charts & Timelines',
		sveltePath: 'src/lib/charts/ModelPhaseStream.svelte',
		upstreamSource: 'Agents Kit Svelte · Charts & Timelines',
		description:
			'Which model ran when, as a stacked stream of throughput over shaded phase bands, with markers for escalations, fallbacks and swaps. Drag to zoom, double-click to reset.',
		usageSnippet: `<script lang="ts">
  import { ModelPhaseStream, type PhaseBand, type ModelSeries, type ModelEvent } from 'agents-kit-svelte';

  const phases: PhaseBand[] = [
    { id: 'plan', label: 'Plan', start: 0, end: 40 },
    { id: 'build', label: 'Implement', start: 40, end: 120 }
  ];
  const series: ModelSeries[] = [
    { model: 'claude-opus', points: [{ t: 0, value: 60 }, { t: 40, value: 0 }, { t: 120, value: 0 }] },
    { model: 'claude-sonnet', points: [{ t: 0, value: 0 }, { t: 40, value: 95 }, { t: 120, value: 80 }] }
  ];
  const events: ModelEvent[] = [{ id: 'e1', t: 40, kind: 'swap', from: 'claude-opus', to: 'claude-sonnet' }];
</script>

<ModelPhaseStream title="Model throughput" {phases} {series} {events} />`
	},
	{
		slug: 'metric-tiles',
		name: 'MetricTiles',
		category: 'Charts & Timelines',
		sveltePath: 'src/lib/charts/MetricTiles.svelte',
		upstreamSource: 'Agents Kit Svelte · Charts & Timelines',
		description:
			'A row of headline numbers, such as runs and merges per hour, time from ready to merged and busy slots. Each tile can show the change against the prior period (coloured by whether that direction is good), a small trend line, or a capacity bar. Make the tiles buttons to open the detail behind one.',
		usageSnippet: `<script lang="ts">
  import { MetricTiles, type Metric } from 'agents-kit-svelte';

  const metrics: Metric[] = [
    { id: 'merges', label: 'Merges per hour', value: 3.2, unit: '/h', previous: 2.1, better: 'up', series: [1.8, 2.2, 2.6, 3, 3.2] },
    { id: 'ttm', label: 'Ready to merged', value: 2280, format: 'duration', previous: 3060, better: 'down', hint: 'Median' },
    { id: 'slots', label: 'Busy slots', value: 4, max: 6 }
  ];
</script>

<MetricTiles
  title="Fleet"
  period="last 24 hours"
  {metrics}
  onSelect={(metric) => console.log('open', metric.id)}
/>`
	},
	{
		slug: 'presence-banner',
		name: 'PresenceBanner',
		category: 'beUI Agents',
		sveltePath: 'src/lib/agents/PresenceBanner.svelte',
		upstreamSource: 'Agents Kit Svelte · beUI Agents',
		description:
			'A slim banner that says whether something you depend on is reachable: online, not responding, offline or reconnecting, with since when, one action such as Move or Retry, and a live region so a change of state is announced. Fits full width at the top of a phone chat.',
		usageSnippet: `<script lang="ts">
  import { PresenceBanner } from 'agents-kit-svelte';

  let now = $state(new Date().toISOString());
</script>

<PresenceBanner
  state="offline"
  subject="Operator on devbox"
  since="2026-11-11T02:10:00Z"
  {now}
  action={{ label: 'Move', onAction: () => console.log('move the operator') }}
  onDismiss={() => console.log('dismissed')}
/>`
	},
	{
		slug: 'feature-card',
		name: 'FeatureCard',
		category: 'Charts & Timelines',
		sveltePath: 'src/lib/charts/FeatureCard.svelte',
		upstreamSource: 'Agents Kit Svelte · Charts & Timelines',
		description:
			'One Feature at a glance: acceptance criteria met with a progress sparkline, its cards split by state, attempts, PRs, and tokens against budget. Click a segment of the cards bar to filter, or open the Feature.',
		usageSnippet: `<script lang="ts">
  import { FeatureCard, type FeatureSummary } from 'agents-kit-svelte';

  const feature: FeatureSummary = {
    id: 'F-12',
    title: 'SSO for the billing portal',
    status: 'in-progress',
    riskTier: 'T3',
    cards: { done: 3, running: 1, failed: 0, planned: 1 },
    criteriaMet: 9,
    criteriaTotal: 14,
    attempts: 6,
    pullRequests: 4,
    tokensSpent: 412000,
    tokenBudget: 600000,
    progress: [10, 25, 30, 45, 64]
  };
</script>

<FeatureCard
  {feature}
  onOpen={(f) => console.log('open', f.id)}
  onSelectCards={(state) => console.log('filter cards', state)}
/>`
	},
	{
		slug: 'feature-proposal',
		name: 'FeatureProposalCard',
		category: 'Charts & Timelines',
		sveltePath: 'src/lib/charts/FeatureProposalCard.svelte',
		upstreamSource: 'Agents Kit Svelte · Charts & Timelines',
		description:
			'An agent proposes a new Feature with its child cards, and the person approves it once. Before deciding they can remove or rename a card and write a note for revisions; dependencies show as "after #2" chips. After approval it turns read-only.',
		usageSnippet: `<script lang="ts">
  import { FeatureProposalCard, type ProposalCard } from 'agents-kit-svelte';

  const cards: ProposalCard[] = [
    { id: 'c1', title: 'Store digest preferences', size: 'S' },
    { id: 'c2', title: 'Build the weekly summary', size: 'M' },
    { id: 'c3', title: 'Send the digest', size: 'L', dependsOn: ['c1', 'c2'] }
  ];
</script>

<FeatureProposalCard
  title="Weekly digest email"
  criteria={['At most one digest a week']}
  {cards}
  estimate="About 3 hours of agent time"
  onApprove={(proposal) => console.log('approve', proposal.cards)}
  onRevise={(note) => console.log('revise', note)}
  onDecline={() => console.log('decline')}
/>`
	},
	{
		slug: 'feature-lineage',
		name: 'FeatureLineage',
		category: 'Charts & Timelines',
		sveltePath: 'src/lib/charts/FeatureLineage.svelte',
		upstreamSource: 'Agents Kit Svelte · Charts & Timelines',
		description:
			'Where a Feature came from and everything it turned into: cards, agent attempts, PRs, releases and incidents as a graph. Hover a node to trace its ancestry, fold a branch away, and click a node to open what is behind it.',
		usageSnippet: `<script lang="ts">
  import { FeatureLineage, type LineageNode, type LineageEdge } from 'agents-kit-svelte';

  const nodes: LineageNode[] = [
    { id: 'f12', kind: 'feature', label: 'SSO for the billing portal', status: 'running' },
    { id: 'c214', kind: 'card', label: 'SSO login', detail: '#214', status: 'done' },
    { id: 'a214', kind: 'attempt', label: 'Attempt 1', detail: 'sonnet', status: 'done' },
    { id: 'p301', kind: 'pr', label: 'feat(auth): SSO login', detail: '#301', status: 'merged' }
  ];
  const edges: LineageEdge[] = [
    { from: 'f12', to: 'c214', rel: 'spawned' },
    { from: 'c214', to: 'a214', rel: 'attempted' },
    { from: 'a214', to: 'p301', rel: 'opened' }
  ];
</script>

<FeatureLineage title="F-12 lineage" {nodes} {edges} onSelectNode={(node) => console.log('open', node.id)} />`
	},
	{
		slug: 'feature-timeline',
		name: 'FeatureTimeline',
		category: 'Charts & Timelines',
		sveltePath: 'src/lib/charts/FeatureTimeline.svelte',
		upstreamSource: 'Agents Kit Svelte · Charts & Timelines',
		description:
			'A Feature’s cards, planned against what actually happened, with a marching forecast for work still running, releases and incidents along the top, and the ship date it adds up to. Sort by slip to see what is late.',
		usageSnippet: `<script lang="ts">
  import { FeatureTimeline, type TimelineItem, type TimelineMilestone } from 'agents-kit-svelte';

  const items: TimelineItem[] = [
    { id: 'c214', label: 'SSO login', status: 'done', planned: [0, 5], actual: [0, 6] },
    { id: 'c216', label: 'Logout and refresh', status: 'running', planned: [6, 11], actual: [8], forecast: 15 },
    { id: 'c217', label: 'Admin SSO settings', status: 'planned', planned: [10, 15] }
  ];
  const milestones: TimelineMilestone[] = [{ id: 'v280', t: 11, label: 'v2.8.0', kind: 'release' }];
</script>

<FeatureTimeline
  title="F-12 timeline"
  {items}
  {milestones}
  today={13}
  start="2026-10-20"
  onSelectItem={(item) => console.log('open card', item.id)}
/>`
	},
	{
		slug: 'token-burn-chart',
		name: 'TokenBurnChart',
		category: 'Charts & Timelines',
		sveltePath: 'src/lib/charts/TokenBurnChart.svelte',
		upstreamSource: 'Agents Kit Svelte · Charts & Timelines',
		description:
			'Tokens spent against a budget, with the current burn rate, a projection to the end of the run, and a pulsing marker where the budget runs out. Pins handoffs, retries and escalations on the line.',
		usageSnippet: `<script lang="ts">
  import { TokenBurnChart, type BurnPoint, type RunMark } from 'agents-kit-svelte';

  const points: BurnPoint[] = [
    { t: 0, spent: 0 },
    { t: 60, spent: 3200 },
    { t: 120, spent: 8600 },
    { t: 180, spent: 14100 }
  ];
  const marks: RunMark[] = [{ id: 'retry', t: 146, label: 'Tests failed: retrying', kind: 'error' }];
</script>

<TokenBurnChart
  title="Token burn"
  {points}
  {marks}
  budget={20000}
  end={284}
  onSelectMark={(mark) => console.log('open', mark.id)}
/>`
	},
	{
		slug: 'run-replay-scrubber',
		name: 'RunReplayScrubber',
		category: 'Charts & Timelines',
		sveltePath: 'src/lib/charts/RunReplayScrubber.svelte',
		upstreamSource: 'Agents Kit Svelte · Charts & Timelines',
		description:
			'A transport bar for replaying an agent run: play, pause, speed, drag to scrub, and skip between handoffs, retries and decisions. The track is coloured by phase and a caption says what is happening now. Bind `now` and feed it to your charts.',
		usageSnippet: `<script lang="ts">
  import { RunReplayScrubber, type PhaseBand, type RunMark } from 'agents-kit-svelte';

  let now = $state(0);
  const phases: PhaseBand[] = [
    { id: 'plan', label: 'Plan', start: 0, end: 40 },
    { id: 'implement', label: 'Implement', start: 40, end: 148 }
  ];
  const marks: RunMark[] = [{ id: 'h1', t: 38, label: 'Plan handed to the implementer', kind: 'handoff' }];
</script>

<RunReplayScrubber duration={148} bind:now {phases} {marks} />
<p>Replaying at {Math.round(now)} s</p>`
	},

	// 9. Voice & Effects (3 components)
	{
		slug: 'voice-wave-visualizer',
		name: 'VoiceWaveVisualizer',
		category: 'Voice & Effects',
		sveltePath: 'src/lib/ai-elements/VoiceWaveVisualizer.svelte',
		upstreamSource: 'Voice Agents · components/voice-agents/session.tsx',
		description:
			'Interactive voice session & 24-bar audio waveform visualizer with mic selector and live transcript.',
		usageSnippet: `<script lang="ts">
  import { VoiceWaveVisualizer, type VoiceDeviceOption } from 'agents-kit-svelte';

  const devices: VoiceDeviceOption[] = [
    { id: 'default', label: 'MacBook microphone' },
    { id: 'usb', label: 'USB headset' }
  ];
</script>

<VoiceWaveVisualizer
  defaultState="listening"
  {devices}
  transcript="Book a table for two at seven."
  onStateChange={(state) => console.log(state)}
/>`
	},
	{
		slug: 'border-beam',
		name: 'BorderBeam',
		category: 'Voice & Effects',
		sveltePath: 'src/lib/effects/BorderBeam.svelte',
		upstreamSource: 'Effects · components/effects/border-beam.tsx',
		description: 'Animated active-work border beam treatment for running agent cards and composers.',
		usageSnippet: `<script lang="ts">
  import { BorderBeam } from 'agents-kit-svelte';

  let active = $state(true);
</script>

<BorderBeam {active} tone="accent" size="md" label="Agent running">
  <button class="rounded-control px-4 py-2" onclick={() => (active = !active)}>
    {active ? 'Stop' : 'Start'} run
  </button>
</BorderBeam>`
	},
	{
		slug: 'svelte5-motion-lab',
		name: 'Svelte5MotionLab',
		category: 'Voice & Effects',
		sveltePath: 'src/lib/effects/Svelte5MotionLab.svelte',
		upstreamSource: 'Agents Kit Svelte · Svelte 5 Motion, Crossfade & Reactivity Suite',
		description:
			'Interactive Svelte 5 physics & microanimation playground showcasing Spring, Tween, crossfade (send/receive), animate:flip, SvelteSet, SvelteMap, and {#snippet}.',
		usageSnippet: `<script lang="ts">
  import { Svelte5MotionLab, ReactiveSpringMetric, ReactiveTweenProgress } from 'agents-kit-svelte';

  // The lab demonstrates these helpers; use them in your own components too.
  const confidence = new ReactiveSpringMetric(92);
  const progress = new ReactiveTweenProgress(75);
</script>

<Svelte5MotionLab initialTarget={80} />
<button onclick={() => (confidence.set(60), progress.set(100))}>Animate</button>`
	}
];

/** Every catalogue entry: the original collections, then Board, Primitives, Auth and Settings (one file per group). */
export const CATALOG_ITEMS: CatalogItemMeta[] = [
	...COLLECTION_ITEMS,
	...BOARD,
	...PRIMITIVES_ACTIONS,
	...PRIMITIVES_FORM,
	...PRIMITIVES_DISPLAY,
	...PRIMITIVES_NAVIGATION,
	...PRIMITIVES_OVERLAYS,
	...PRIMITIVES_MENUS,
	...AUTH_FIELDS,
	...AUTH_ACCOUNT,
	...AUTH_SIGNIN,
	...AUTH_RECOVERY,
	...SETTINGS_SHELL,
	...SETTINGS_ROWS,
	...SETTINGS_SAVE,
	...SETTINGS_CONTROLS,
];
