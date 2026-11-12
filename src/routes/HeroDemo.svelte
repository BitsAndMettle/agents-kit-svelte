<script lang="ts">
	import AgentActivity from '$lib/agents/AgentActivity.svelte';
	import Message from '$lib/agents/Message.svelte';
	import PromptInput from '$lib/agents/PromptInput.svelte';
	import StreamingResponse from '$lib/agents/StreamingResponse.svelte';
	import ThinkingShimmer from '$lib/agents/ThinkingShimmer.svelte';
	import type { ActivityItem, SupportedAgentId, SupportedAgentOption } from '$lib/types';
	import { RotateCcw } from '@lucide/svelte';
	import { buttonClass } from '$lib/ui/styles';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fly } from 'svelte/transition';

	interface Props {
		agents: SupportedAgentOption[];
	}

	let { agents }: Props = $props();

	interface Script {
		prompt: string;
		steps: { label: string; target?: string; tool: boolean; additions?: number; deletions?: number }[];
		answer: string;
	}

	const SCRIPTS: Script[] = [
		{
			prompt: 'Fix the OAuth redirect loop on deep links',
			steps: [
				{ label: 'Tracing the redirect through the auth callback', tool: false },
				{ label: 'Read', target: 'src/routes/auth/callback/+server.ts', tool: true },
				{ label: 'Edit', target: 'src/routes/auth/callback/+server.ts', tool: true, additions: 6, deletions: 2 },
				{ label: 'Bash', target: 'pnpm test auth-callback', tool: true }
			],
			answer:
				'The callback always redirected to /login instead of reading the sanitized next parameter. I now keep the original path and query string, and the four redirect tests pass.'
		},
		{
			prompt: 'Add a dark mode toggle to the settings page',
			steps: [
				{ label: 'Looking at how the theme is stored today', tool: false },
				{ label: 'Read', target: 'src/lib/theme.svelte.ts', tool: true },
				{ label: 'Edit', target: 'src/routes/settings/+page.svelte', tool: true, additions: 14, deletions: 0 }
			],
			answer:
				'Settings now has an Appearance row with Light, Dark and System. The choice is saved per user and applied before first paint, so there is no flash on reload.'
		}
	];

	let scriptIndex = $state(0);
	let customPrompt = $state('');
	let phase = $state<'idle' | 'thinking' | 'working' | 'streaming' | 'done'>('idle');
	let doneSteps = $state(0);
	let streamed = $state(0);
	let composerValue = $state('');
	let selectedAgentId = $state<SupportedAgentId>('claude-code');
	let visible = $state(true);
	let root: HTMLElement | undefined = $state();
	let scroller: HTMLElement | undefined = $state();
	let runId = 0;

	const script = $derived(SCRIPTS[scriptIndex % SCRIPTS.length]);
	const prompt = $derived(customPrompt || script.prompt);

	const activity = $derived<ActivityItem[]>(
		script.steps.slice(0, Math.min(doneSteps + 1, script.steps.length)).map((step, i) => {
			const status = i < doneSteps ? 'complete' : 'running';
			return step.tool
				? {
						id: `s-${i}`,
						type: 'tool',
						label: step.label,
						target: step.target ?? '',
						additions: step.additions,
						deletions: step.deletions,
						status
					}
				: { id: `s-${i}`, type: 'text', label: step.label, status };
		})
	);

	const answerText = $derived(script.answer.slice(0, streamed));

	/** Resolves after `ms`, or rejects silently when a newer run has started. */
	function wait(ms: number, id: number): Promise<boolean> {
		return new Promise((resolve) => {
			const tick = () => {
				if (id !== runId) return resolve(false);
				if (!visible || document.hidden) return void window.setTimeout(tick, 250);
				resolve(true);
			};
			window.setTimeout(tick, ms);
		});
	}

	/**
	 * Plays one scripted agent turn: thinking, tool steps, then a streamed answer.
	 * With reduced motion the finished turn is shown at once.
	 */
	async function play(): Promise<void> {
		const id = ++runId;
		doneSteps = 0;
		streamed = 0;
		if (prefersReducedMotion.current) {
			doneSteps = script.steps.length;
			streamed = script.answer.length;
			phase = 'done';
			return;
		}
		phase = 'thinking';
		if (!(await wait(1300, id))) return;
		phase = 'working';
		for (let i = 0; i < script.steps.length; i++) {
			if (!(await wait(850, id))) return;
			doneSteps = i + 1;
		}
		if (!(await wait(400, id))) return;
		phase = 'streaming';
		while (streamed < script.answer.length) {
			if (!(await wait(24, id))) return;
			streamed = Math.min(script.answer.length, streamed + 3);
		}
		phase = 'done';
		if (!(await wait(5200, id))) return;
		customPrompt = '';
		scriptIndex += 1;
		void play();
	}

	function replay(): void {
		void play();
	}

	// Keep the newest part of the turn in view as it grows.
	$effect(() => {
		void phase;
		void doneSteps;
		void streamed;
		scroller?.scrollTo({ top: scroller.scrollHeight });
	});

	$effect(() => {
		if (!root) return;
		const observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), {
			threshold: 0.2
		});
		observer.observe(root);
		void play();
		return () => {
			observer.disconnect();
			runId += 1;
		};
	});
</script>

<div
	bind:this={root}
	class="overflow-hidden rounded-window border border-card-border bg-chat-surface text-left ak-shadow-soft"
>
	<div class="flex items-center justify-between border-b border-chat-border/70 px-4 py-2.5">
		<div class="flex items-center gap-2 text-xs text-fg-light">
			<span class="ak-breathe size-1.5 rounded-full bg-status-success"></span>
			Live demo, playing on its own
		</div>
		<button type="button" onclick={replay} class={buttonClass('ghost', 'xs')}>
			<RotateCcw aria-hidden="true" />
			Replay
		</button>
	</div>

	<div
		bind:this={scroller}
		class="h-[340px] space-y-4 overflow-y-auto px-4 pt-5 pb-2 [scrollbar-width:none] sm:px-6"
		aria-live="polite"
	>
		{#key `${scriptIndex}-${prompt}`}
			<div in:fly={{ y: 6, duration: 220 }}>
				<Message role="user" author="You">{prompt}</Message>
			</div>
		{/key}

		{#if phase === 'thinking'}
			<div in:fly={{ y: 4, duration: 180 }}>
				<ThinkingShimmer spark label="Thinking" />
			</div>
		{:else if phase !== 'idle'}
			<div in:fly={{ y: 4, duration: 180 }}>
				<Message role="assistant" author="Agents Kit">
					<div class="space-y-3">
						<AgentActivity
							items={activity}
							status={phase === 'working' ? 'working' : 'complete'}
							durationSeconds={script.steps.length}
							defaultOpen={true}
						/>
						{#if phase === 'streaming' || phase === 'done'}
							<StreamingResponse
								status={phase === 'done' ? 'complete' : 'streaming'}
								copyText={script.answer}
								showActions={phase === 'done'}
							>
								<p>{answerText}</p>
							</StreamingResponse>
						{/if}
					</div>
				</Message>
			</div>
		{/if}
	</div>

	<div class="bg-gradient-to-t from-chat-surface from-60% to-transparent px-3 pt-2 pb-3 sm:px-4">
		<PromptInput
			bind:value={composerValue}
			{agents}
			{selectedAgentId}
			onAgentChange={(id) => (selectedAgentId = id)}
			activeSkill="Backend v2"
			attachments={[{ id: 'worktree:trailside/1210-auth-redirect', label: 'trailside/1210-auth-redirect', kind: 'worktree' }]}
			onSubmit={(submitted) => {
				customPrompt = submitted;
				composerValue = '';
				void play();
			}}
		/>
	</div>
</div>
