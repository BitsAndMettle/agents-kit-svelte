<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { pillClass } from '../ui/styles';
	import { Check, ChevronDown, Copy, SquareTerminal } from '@lucide/svelte';
	import AgentDisclosure from './AgentDisclosure.svelte';
	import type { ToolResultStatus } from '../types';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'tool' | 'summary' | 'output' | 'status' | 'meta' | 'defaultOpen' | 'onRetry'> {
		tool: string;
		summary?: string;
		output: string;
		status?: ToolResultStatus;
		meta?: string;
		defaultOpen?: boolean;
		onRetry?: () => void;
		class?: string;
	}

	const COPY_FEEDBACK_MS = 1600;

	let {
		tool,
		summary,
		output,
		status = 'success',
		meta,
		defaultOpen = true,
		onRetry,
		class: className = '',
		...rest
	}: Props = $props();

	let isOpen = $state(true);
	let copied = $state(false);

	$effect(() => {
		isOpen = defaultOpen;
	});

	const uid = $props.id();
	const panelId = `${uid}-output`;

	/**
	 * Copies the raw tool terminal output to the system clipboard.
	 */
	async function handleCopy(): Promise<void> {
		await navigator.clipboard?.writeText(output);
		copied = true;
		window.setTimeout(() => {
			copied = false;
		}, COPY_FEEDBACK_MS);
	}
</script>

<div {...rest}
	data-state={status}
	aria-busy={status === 'running'}
	class={cn('w-full overflow-hidden rounded-soft border border-chat-border bg-card-bg ak-shadow-soft-sm text-sm', className)}
>
	<div class="flex h-10 items-center gap-2 px-3">
		<button
			type="button"
			aria-expanded={isOpen}
			aria-controls={panelId}
			onclick={() => (isOpen = !isOpen)}
			class="group flex min-w-0 flex-1 items-center gap-2 text-left outline-none"
		>
			<span
				aria-hidden="true"
				class="inline-flex size-4 shrink-0 items-center justify-center {status === 'error'
					? 'text-status-danger'
					: status === 'running'
						? 'text-accent-primary'
						: 'text-fg-light'}"
			>
				<SquareTerminal class="size-4" />
			</span>

			<span class="font-medium text-fg-main">{tool}</span>

			{#if summary}
				<code class="min-w-0 truncate rounded bg-chat-surface px-1.5 py-0.5 font-mono text-xs text-fg-light">
					{summary}
				</code>
			{/if}

			{#if meta}
				<span class="ml-auto shrink-0 font-mono text-xs tabular-nums text-fg-light">{meta}</span>
			{/if}

			<ChevronDown aria-hidden="true" class="size-4 shrink-0 text-fg-light transition-transform duration-150 group-hover:text-fg-main {isOpen
					? 'rotate-180'
					: ''}" />
		</button>

		<div class="flex items-center gap-1">
			{#if status === 'error' && onRetry}
				<button
					type="button"
					onclick={onRetry}
					class={pillClass('ghost', 'sm')}
				>
					Retry
				</button>
			{/if}
			<button
				type="button"
				aria-label={copied ? 'Copied output' : 'Copy output'}
				onclick={handleCopy}
				class={pillClass('ghost', 'icon-sm')}
			>
				{#if copied}
					<Check aria-hidden="true" class="size-3.5 text-status-success" />
				{:else}
					<Copy aria-hidden="true" class="size-3.5" />
				{/if}
			</button>
		</div>
	</div>

	<AgentDisclosure id={panelId} open={isOpen}>
		<div
			role={status === 'running' ? 'log' : undefined}
			aria-live={status === 'running' ? 'polite' : undefined}
			class="max-h-56 overflow-auto border-t border-chat-border/70 bg-terminal-bg px-3.5 py-2.5 font-mono text-xs leading-5 text-terminal-fg"
		>
			<pre class="m-0 whitespace-pre-wrap break-words">{output}</pre>
		</div>
	</AgentDisclosure>
</div>
