<script lang="ts">
	import { SAMPLE_CHECKS, SAMPLE_ISSUE, SAMPLE_PULL_REQUEST } from '$lib/fixtures/github';
	import {
		ArrowUp,
		Braces,
		Check,
		Code,
		Copy,
		PanelRight,
		RotateCcw,
		Sparkle,
		Zap
	} from '@lucide/svelte';
	import Message from '$lib/agents/Message.svelte';
	import ThinkingShimmer from '$lib/agents/ThinkingShimmer.svelte';
	import IntelligentUIRenderer from '$lib/intelligent-ui/IntelligentUIRenderer.svelte';
	import type { DynamicUINode, GeneratedSurfaceContent } from '$lib/types';
	import { SEGMENT_GROUP_CLASS, buttonClass, pillClass, segmentClass } from '$lib/ui/styles';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fly } from 'svelte/transition';

	const SURFACE_EXAMPLES: { label: string; content: GeneratedSurfaceContent }[] = [
		{
			label: 'Comparison',
			content: {
				type: 'comparison',
				title: 'Choose the OAuth callback state verification strategy',
				description: 'Two approaches for preserving deep-link return paths across GitHub App sign-in.',
				selectedId: 'signed-cookie',
				options: [
					{
						id: 'signed-cookie',
						title: 'HttpOnly SameSite=Lax cookie',
						description: 'Stores sanitized relative returnTo path in a short-lived signed cookie.',
						recommended: true,
						attributes: [
							{ label: 'Risk Tier', value: 'T1 / T2' },
							{ label: 'CSRF resistance', value: 'High (bound to state)' },
							{ label: 'Max length', value: '4 KB' }
						]
					},
					{
						id: 'state-param',
						title: 'Encoded OAuth state parameter',
						description: 'Embeds returnTo inside the HMAC-signed OAuth state query string.',
						attributes: [
							{ label: 'Risk Tier', value: 'T2' },
							{ label: 'CSRF resistance', value: 'High' },
							{ label: 'Max length', value: '512 B' }
						]
					}
				]
			}
		},
		{
			label: 'Recommendation',
			content: {
				type: 'recommendation',
				id: 'rec-1',
				title: 'Promote CSS caption tokens from --faint to --muted on Home',
				summary:
					'Raising secondary captions to --muted achieves >= 5.4:1 contrast across both warm paper and dark themes without altering layout geometry.',
				reasoning: [
					'Preserves existing tokens.css variables with zero one-off hex colors.',
					'Passes Playwright 5-viewport contrast verification (320px to 1440px).',
					'Stays within T1 UI boundary rules.'
				],
				confidence: 96,
				acceptLabel: 'Apply token fix to worktree',
				alternatives: [
					{ id: 'alt-ink', label: 'Use --ink2 instead' },
					{ id: 'alt-font', label: 'Increase font-weight to 600' }
				]
			}
		},
		{
			label: 'Checklist',
			content: {
				type: 'checklist',
				title: 'Pre-PR Verification Gate Checklist',
				description: 'Required checks before opening an Argon pull request.',
				items: [
					{
						id: 'chk-1',
						label: 'Verify changed paths against allowed UI glob list',
						detail: 'apps/web/src/lib/** and tests/browser/** only',
						completed: true
					},
					{
						id: 'chk-2',
						label: 'Run Playwright spec in dev and preview targets',
						detail: 'Verify across 320px, 390px, 768px, 1024px, and 1440px',
						completed: true
					},
					{
						id: 'chk-3',
						label: 'Run corepack pnpm check & affected unit suites',
						detail: '0 errors, 0 warnings',
						completed: false
					}
				]
			}
		},
		{
			label: 'Document',
			content: {
				type: 'document',
				id: 'doc-1',
				title: 'ENG-0009 Showcase Execution Spec',
				format: 'Markdown',
				size: '4.8 KB',
				updated: 'Revision 3',
				excerpt:
					'A Connected Computer may run Claude Code and Codex on cards only as a Workflow the Trailside service dispatched to it, under its teammate Connect consent, each Run in its own Worktree.'
			}
		},
		{
			label: 'Source Brief',
			content: {
				type: 'source-brief',
				title: 'Browser Read Contract & Stream Grounding',
				summary:
					'Canonical specification governing /w routes, sample isolation, provenance labels, and client stream handling.',
				sources: [
					{
						id: 's1',
						title: '2026-10-02-g0-browser-read-contract-design.md',
						origin: 'Section 0 (Revision 3)'
					},
					{
						id: 's2',
						title: '2026-09-30-trailside-cli-design.md',
						origin: 'Section 7 (Supported Agent Probes)'
					}
				]
			}
		},
		{
			label: 'Activity Chart',
			content: {
				type: 'activity',
				title: 'Weekly Agent PR Throughput',
				value: '42',
				unit: 'merged PRs',
				description: 'Verified UI and domain fixes across 7 days',
				points: [
					{ label: 'Mon', value: 5 },
					{ label: 'Tue', value: 7 },
					{ label: 'Wed', value: 6 },
					{ label: 'Thu', value: 9 },
					{ label: 'Fri', value: 8 },
					{ label: 'Sat', value: 4 },
					{ label: 'Sun', value: 3 }
				]
			}
		}
	];

	interface Scenario {
		id: string;
		chip: string;
		prompt: string;
		keywords: string[];
		reply: string;
		nodes: DynamicUINode[];
	}

	const surface = (label: string): GeneratedSurfaceContent | undefined =>
		SURFACE_EXAMPLES.find((example) => example.label === label)?.content;

	const SCENARIOS: Scenario[] = [
		{
			id: 'compare',
			chip: 'Compare two auth strategies',
			prompt: 'Compare the two ways we could keep the return path through OAuth sign-in',
			keywords: ['compare', 'auth', 'oauth', 'strategy', 'option', 'decision'],
			reply: 'Here are both options side by side, with a decision gate for you.',
			nodes: [
				{
					id: 'node-arch-1',
					component: 'generative-surface',
					title: 'Generated tradeoff matrix',
					props: { content: surface('Comparison') }
				},
				{
					id: 'node-arch-2',
					component: 'approval-card',
					title: 'Decision gate',
					props: {
						title: 'Approve OAuth Return-Path Strategy',
						questions: [
							{
								id: 'q1',
								question: 'Which layout should the agent render?',
								options: [
									{ id: 'o1', label: 'Interactive Kanban Board' },
									{ id: 'o2', label: 'Side-by-side Diff Inspector' }
								]
							}
						]
					}
				}
			]
		},
		{
			id: 'fix',
			chip: 'Fix the redirect bug',
			prompt: 'Fix the redirect loop on deep links and show me the patch',
			keywords: ['fix', 'bug', 'redirect', 'patch', 'loop', 'diff'],
			reply: 'I traced it, patched the callback and need your OK to run the tests.',
			nodes: [
				{
					id: 'node-1',
					component: 'agent-activity',
					title: 'Reasoning and tool trace',
					props: {
						items: [
							{ id: '1', type: 'text', label: 'Dynamic Intelligent UI activity node' },
							{
								id: '2',
								type: 'tool',
								label: 'Read',
								target: 'src/lib/intelligent-ui/IntelligentUIRenderer.svelte',
								status: 'complete'
							}
						]
					}
				},
				{
					id: 'node-2',
					component: 'file-diff',
					title: 'Worktree patch',
					props: {
						filename: 'apps/web/src/routes/auth/callback/+server.ts',
						patch:
							'@@ -18,3 +18,5 @@\n-  return redirect(302, "/login");\n+  const next = sanitizeReturnTo(url.searchParams.get("next"));\n+  return redirect(303, next);'
					}
				},
				{
					id: 'node-3',
					component: 'tool-approval',
					title: 'Command consent',
					props: {
						tool: 'Bash',
						summary: 'corepack pnpm test:browser tests/browser/auth.spec.ts',
						params: [{ label: 'Command', value: 'corepack pnpm check', code: true }]
					}
				}
			]
		},
		{
			id: 'triage',
			chip: 'Triage this pull request',
			prompt: 'Triage the open pull request for the claimed issue',
			keywords: ['triage', 'pull', 'pr', 'github', 'issue', 'review', 'checks', 'ci'],
			reply: 'The issue, its candidate pull request and the failing checks, in one place.',
			nodes: [
				{ id: 'node-gh-1', component: 'github-issue-card', title: 'Claimed issue', props: { issue: SAMPLE_ISSUE } },
				{ id: 'node-gh-2', component: 'github-pr-card', title: 'Candidate pull request', props: { pr: SAMPLE_PULL_REQUEST } },
				{ id: 'node-gh-3', component: 'github-checks-panel', title: 'CI checks', props: { checks: SAMPLE_CHECKS } }
			]
		},
		{
			id: 'recommend',
			chip: 'Recommend a contrast fix',
			prompt: 'The captions on Home are too faint. What should we change?',
			keywords: ['recommend', 'contrast', 'caption', 'faint', 'color', 'colour', 'suggest'],
			reply: 'One recommendation, with my reasoning and two alternatives.',
			nodes: [
				{
					id: 'node-rec',
					component: 'generative-surface',
					title: 'Recommendation',
					props: { content: surface('Recommendation') }
				}
			]
		},
		{
			id: 'checklist',
			chip: 'Build a pre-PR checklist',
			prompt: 'What do I still need to check before opening the pull request?',
			keywords: ['checklist', 'check', 'before', 'gate', 'todo', 'verify'],
			reply: 'Two of three gates are done. The last one is yours to tick.',
			nodes: [
				{
					id: 'node-chk',
					component: 'generative-surface',
					title: 'Verification checklist',
					props: { content: surface('Checklist') }
				}
			]
		},
		{
			id: 'report',
			chip: 'Chart this week’s merged PRs',
			prompt: 'How many agent pull requests did we merge this week?',
			keywords: ['chart', 'week', 'merged', 'how many', 'throughput', 'stats', 'report'],
			reply: 'Forty-two merged this week, peaking on Thursday.',
			nodes: [
				{
					id: 'node-act',
					component: 'generative-surface',
					title: 'Weekly throughput',
					props: { content: surface('Activity Chart') }
				}
			]
		},
		{
			id: 'summarize',
			chip: 'Summarize the spec',
			prompt: 'Summarize the execution spec and show where it comes from',
			keywords: ['summarize', 'summary', 'spec', 'document', 'doc', 'source', 'read'],
			reply: 'The spec, plus the two sources it is grounded in.',
			nodes: [
				{
					id: 'node-doc',
					component: 'generative-surface',
					title: 'Document',
					props: { content: surface('Document') }
				},
				{
					id: 'node-src',
					component: 'generative-surface',
					title: 'Source brief',
					props: { content: surface('Source Brief') }
				}
			]
		}
	];

	type Phase = 'thinking' | 'building' | 'done';
	type InspectorTab = 'json' | 'intents' | 'svelte';

	let scenario = $state<Scenario>(SCENARIOS[0]);
	let askedPrompt = $state(SCENARIOS[0].prompt);
	let matchedNote = $state('');
	let composer = $state('');
	let phase = $state<Phase>('done');
	let built = $state(SCENARIOS[0].nodes.length);
	let studioOpen = $state(false);
	let inspectorTab = $state<InspectorTab>('json');
	let jsonDraft = $state(JSON.stringify(SCENARIOS[0].nodes, null, 2));
	let copied = $state(false);
	let ready = $state(false);
	let intents = $state<{ id: number; node: string; action: string; detail?: string }[]>([]);
	let runId = 0;
	let turn = $state(0);
	let intentSeq = 0;

	$effect(() => {
		ready = true;
	});

	let parsed = $derived.by<{ nodes: DynamicUINode[]; error: string | null }>(() => {
		try {
			const value = JSON.parse(jsonDraft) as unknown;
			return { nodes: Array.isArray(value) ? (value as DynamicUINode[]) : [], error: null };
		} catch (err) {
			return { nodes: scenario.nodes, error: err instanceof Error ? err.message : 'Invalid JSON' };
		}
	});

	let visibleNodes = $derived(parsed.nodes.slice(0, built));

	let svelteSnippet = $derived(
		`<script lang="ts">\n\timport { IntelligentUIRenderer } from 'agents-kit-svelte';\n\timport type { DynamicUINode } from 'agents-kit-svelte';\n\n\tconst nodes: DynamicUINode[] = ${JSON.stringify(
			parsed.nodes.map(({ id, component, title }) => ({ id, component, title, props: {} })),
			null,
			2
		).replace(/\n/g, '\n\t')};\n<\/script>\n\n<IntelligentUIRenderer\n\t{nodes}\n\tonIntent={(intent) => console.log(intent.action, intent.nodeId)}\n/>`
	);

	/** Resolves after `ms` unless a newer run has started. */
	function wait(ms: number, id: number): Promise<boolean> {
		return new Promise((resolve) => window.setTimeout(() => resolve(id === runId), ms));
	}

	/**
	 * Plays one turn: the agent thinks, then the interface builds itself one block at a time.
	 *
	 * @param next - Scenario to render.
	 * @param prompt - What the person asked.
	 */
	async function run(next: Scenario, prompt: string): Promise<void> {
		const id = ++runId;
		turn += 1;
		scenario = next;
		askedPrompt = prompt;
		jsonDraft = JSON.stringify(next.nodes, null, 2);
		intents = [];
		built = 0;
		if (prefersReducedMotion.current) {
			built = next.nodes.length;
			phase = 'done';
			return;
		}
		phase = 'thinking';
		if (!(await wait(1100, id))) return;
		phase = 'building';
		for (let i = 0; i < next.nodes.length; i++) {
			built = i + 1;
			if (!(await wait(650, id))) return;
		}
		phase = 'done';
	}

	/** Picks the scenario whose keywords best match free text. */
	function matchScenario(text: string): { scenario: Scenario; exact: boolean } {
		const lower = text.toLowerCase();
		let best = SCENARIOS[0];
		let bestScore = 0;
		for (const candidate of SCENARIOS) {
			const score = candidate.keywords.filter((k) => lower.includes(k)).length;
			if (score > bestScore) {
				best = candidate;
				bestScore = score;
			}
		}
		return { scenario: best, exact: bestScore > 0 };
	}

	function submit(event: SubmitEvent): void {
		event.preventDefault();
		const text = composer.trim();
		if (!text) return;
		const { scenario: next, exact } = matchScenario(text);
		matchedNote = exact ? '' : `No model is connected, so this shows the closest demo: “${next.chip}”.`;
		composer = '';
		void run(next, text);
	}

	function pick(next: Scenario): void {
		matchedNote = '';
		void run(next, next.prompt);
	}

	function recordIntent(intent: { nodeId: string; action: string; detail?: string }): void {
		const node = parsed.nodes.find((n) => n.id === intent.nodeId);
		intents = [
			{ id: ++intentSeq, node: node?.title ?? intent.nodeId, action: intent.action, detail: intent.detail },
			...intents
		].slice(0, 8);
		// The page records the decision, as an app would: the card reads decided only from its node.
		if (intent.action === 'submit' && intent.detail) {
			const decided = JSON.parse(intent.detail) as unknown;
			jsonDraft = JSON.stringify(
				parsed.nodes.map((n) => (n.id === intent.nodeId ? { ...n, props: { ...n.props, decided } } : n)),
				null,
				2
			);
		}
	}

	async function copySvelte(): Promise<void> {
		try {
			await navigator.clipboard.writeText(svelteSnippet);
		} catch {
			// Clipboard can be unavailable; the code stays visible to copy by hand.
		}
		copied = true;
		window.setTimeout(() => (copied = false), 1400);
	}

	const INSPECTOR_TABS: { id: InspectorTab; label: string; icon: typeof Braces }[] = [
		{ id: 'json', label: 'JSON', icon: Braces },
		{ id: 'intents', label: 'Intents', icon: Zap },
		{ id: 'svelte', label: 'Svelte', icon: Code }
	];
</script>

<div class="mx-auto max-w-7xl px-4 py-10 sm:px-6">
	<!-- Header -->
	<div class="mx-auto max-w-2xl text-center">
		<p class="text-xs font-medium text-accent-primary">Intelligent UI playground</p>
		<h1
			class="mt-2 font-display text-[2.25rem] leading-tight font-normal tracking-[-0.02em] text-fg-main sm:text-[2.75rem]"
		>
			Turn structured model output into interfaces people can use.
		</h1>
		<p class="mt-3 text-sm leading-6 text-fg-light">
			Ask for something, watch the agent build the interface block by block, then use it. Open the
			studio to see the JSON it streamed, the intents your app receives, and the Svelte to ship it.
		</p>
	</div>

	<!-- Composer + suggestions -->
	<div class="mx-auto mt-8 max-w-2xl">
		<form
			onsubmit={submit}
			class="flex items-center gap-2 rounded-composer border border-chat-border bg-card-bg py-2 pr-2 pl-5 ak-soft-focus"
		>
			<label for="iui-prompt" class="sr-only">Ask for an interface</label>
			<input
				id="iui-prompt"
				bind:value={composer}
				placeholder="Ask for a comparison, a checklist, a chart…"
				autocomplete="off"
				class="h-9 min-w-0 flex-1 bg-transparent text-[15px] text-fg-main outline-none placeholder:text-fg-light"
			/>
			<button
				type="submit"
				disabled={!ready || !composer.trim()}
				aria-label="Generate interface"
				class="inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors [&_svg]:size-4 {composer.trim()
					? 'bg-chat-accent text-white hover:bg-chat-accent/90'
					: 'bg-chat-user text-fg-light'}"
			>
				<ArrowUp aria-hidden="true" />
			</button>
		</form>

		<div class="mt-3 flex flex-wrap justify-center gap-1.5" role="group" aria-label="Try a prompt">
			{#each SCENARIOS as item (item.id)}
				<button
					type="button"
					disabled={!ready}
					aria-pressed={scenario.id === item.id}
					onclick={() => pick(item)}
					class={pillClass(scenario.id === item.id ? 'primary' : 'secondary', 'sm')}
				>
					{item.chip}
				</button>
			{/each}
		</div>
	</div>

	<!-- Result -->
	<section
		aria-label="Generated interface"
		class="mt-10 overflow-hidden rounded-window border border-card-border bg-chat-surface ak-shadow-soft"
	>
		<div class="flex flex-wrap items-center justify-between gap-2 border-b border-chat-border/70 px-4 py-2.5">
			<div class="flex items-center gap-2 text-xs text-fg-light">
				{#if phase === 'done'}
					<Check aria-hidden="true" class="size-3.5 text-status-success" />
					Built {parsed.nodes.length}
					{parsed.nodes.length === 1 ? 'block' : 'blocks'}
				{:else}
					<span class="ak-breathe size-1.5 rounded-full bg-chat-accent"></span>
					{phase === 'thinking' ? 'Planning the interface' : `Building ${built} of ${parsed.nodes.length}`}
				{/if}
			</div>
			<div class="flex items-center gap-1">
				<button
					type="button"
					disabled={!ready}
					onclick={() => run(scenario, askedPrompt)}
					class={buttonClass('ghost', 'xs')}
				>
					<RotateCcw aria-hidden="true" />
					Replay
				</button>
				<button
					type="button"
					disabled={!ready}
					aria-pressed={studioOpen}
					onclick={() => (studioOpen = !studioOpen)}
					class={pillClass(studioOpen ? 'primary' : 'secondary', 'xs')}
				>
					<PanelRight aria-hidden="true" />
					{studioOpen ? 'Close studio' : 'Open in studio'}
				</button>
			</div>
		</div>

		<div class="grid {studioOpen ? 'lg:grid-cols-[minmax(0,1fr)_400px]' : ''}">
			<!-- Conversation canvas -->
			<div class="min-w-0 space-y-5 px-4 py-6 sm:px-8">
				<div class="mx-auto max-w-3xl space-y-5">
					{#key turn}
						<div in:fly={{ y: 6, duration: 200 }}>
							<Message role="user" author="You">{askedPrompt}</Message>
						</div>
					{/key}
					{#if matchedNote}
						<p class="text-center text-xs text-fg-light">{matchedNote}</p>
					{/if}

					{#if phase === 'thinking'}
						<ThinkingShimmer spark label="Choosing components" />
					{:else}
						<Message role="assistant" author="Agents Kit">
							<div class="space-y-4">
								<p>{scenario.reply}</p>
								<IntelligentUIRenderer nodes={visibleNodes} onIntent={recordIntent} />
							</div>
						</Message>
					{/if}

					{#if !studioOpen && intents.length > 0}
						<div class="flex flex-wrap items-center gap-1.5 pl-9 text-xs text-fg-light" aria-live="polite">
							<Zap aria-hidden="true" class="size-3.5 text-chat-accent" />
							Your app received
							{#each intents.slice(0, 3) as intent (intent.id)}
								<span in:fly={{ y: 4, duration: 160 }} class="rounded-full bg-chat-user px-2.5 py-0.5 font-mono text-[11px] text-fg-main">
									{intent.action}
								</span>
							{/each}
						</div>
					{:else if !studioOpen && phase === 'done'}
						<p class="pl-9 text-xs text-fg-light">
							<Sparkle aria-hidden="true" class="mr-1 inline size-3 fill-current text-chat-accent" />
							Try the controls above. Each click is sent to your app as an intent.
						</p>
					{/if}
				</div>
			</div>

			<!-- Studio inspector -->
			{#if studioOpen}
				<aside
					aria-label="Studio inspector"
					in:fly={{ x: 12, duration: 200 }}
					class="flex min-w-0 flex-col border-t border-chat-border/70 bg-card-bg lg:border-t-0 lg:border-l"
				>
					<div class="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
						<div class={SEGMENT_GROUP_CLASS} role="tablist" aria-label="Inspector view">
							{#each INSPECTOR_TABS as tab (tab.id)}
								<button
									type="button"
									role="tab"
									aria-selected={inspectorTab === tab.id}
									onclick={() => (inspectorTab = tab.id)}
									class={segmentClass(inspectorTab === tab.id)}
								>
									<tab.icon aria-hidden="true" />
									{tab.label}
									{#if tab.id === 'intents' && intents.length > 0}
										<span class="tabular-nums text-fg-light">{intents.length}</span>
									{/if}
								</button>
							{/each}
						</div>
						{#if inspectorTab === 'svelte'}
							<button
								type="button"
								aria-label={copied ? 'Copied' : 'Copy Svelte code'}
								onclick={copySvelte}
								class={buttonClass('ghost', 'icon-sm')}
							>
								{#if copied}<Check aria-hidden="true" class="text-status-success" />{:else}<Copy aria-hidden="true" />{/if}
							</button>
						{/if}
					</div>

					<div class="min-h-0 flex-1 px-4 pb-4">
						{#if inspectorTab === 'json'}
							<div class="mb-2 flex items-center justify-between text-xs">
								<label for="intelligent-ui-json-editor" class="text-fg-light">
									Edit the schema to change the interface
								</label>
								{#if parsed.error}
									<span class="text-status-danger">Invalid JSON</span>
								{:else}
									<span class="inline-flex items-center gap-1 text-status-success">
										<Check aria-hidden="true" class="size-3.5" />Valid schema
									</span>
								{/if}
							</div>
							<textarea
								id="intelligent-ui-json-editor"
								rows={22}
								spellcheck="false"
								bind:value={jsonDraft}
								oninput={() => (built = Number.MAX_SAFE_INTEGER)}
								class="w-full resize-y rounded-[16px] border border-chat-border bg-chat-surface p-3.5 font-mono text-[11.5px] leading-5 text-fg-main focus:border-accent-primary/50 focus:outline-none"
							></textarea>
						{:else if inspectorTab === 'intents'}
							{#if intents.length === 0}
								<p class="rounded-[16px] bg-chat-surface p-4 text-xs leading-5 text-fg-light">
									Nothing yet. Click a button or option in the interface and the event your app
									would receive appears here.
								</p>
							{:else}
								<ul class="space-y-1.5" aria-live="polite">
									{#each intents as intent (intent.id)}
										<li
											in:fly={{ y: 4, duration: 160 }}
											class="rounded-[14px] bg-chat-surface px-3 py-2 text-xs"
										>
											<span class="font-mono font-medium text-chat-accent">{intent.action}</span>
											<span class="text-fg-light"> from {intent.node}</span>
											{#if intent.detail}
												<p class="mt-0.5 truncate font-mono text-[11px] text-fg-light">{intent.detail}</p>
											{/if}
										</li>
									{/each}
								</ul>
							{/if}
						{:else}
							<pre
								class="max-h-[480px] overflow-auto rounded-[16px] bg-terminal-bg p-3.5 font-mono text-[11.5px] leading-5 text-terminal-fg">{svelteSnippet}</pre>
						{/if}
					</div>
				</aside>
			{/if}
		</div>
	</section>
</div>
