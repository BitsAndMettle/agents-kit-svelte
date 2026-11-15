<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Check, ChevronDown, Copy, GitCommitHorizontal, RotateCcw } from '@lucide/svelte';
	import { buttonClass } from '../ui/styles';
	import AgentDisclosure from '../agents/AgentDisclosure.svelte';
	import type { GitHubCommitData } from '../types';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'commit' | 'defaultOpen' | 'headingLevel' | 'onRestore'> {
		commit: GitHubCommitData;
		/** Whether the list of files starts open. */
		defaultOpen?: boolean;
		/** The message's heading level. */
		headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
		/** Gives the card its "Checkout commit in worktree" button. */
		onRestore?: (sha: string) => void;
		class?: string;
	}

	const COPY_FEEDBACK_MS = 1500;

	let {
		commit,
		defaultOpen = true,
		headingLevel = 3,
		onRestore,
		class: className = '',
		...rest
	}: Props = $props();

	let isOpen = $state(true);
	let copied = $state(false);

	$effect(() => {
		isOpen = defaultOpen;
	});

	let files = $derived(commit.files ?? []);

	/**
	 * Copies the commit SHA to the system clipboard.
	 */
	async function copySha(): Promise<void> {
		await navigator.clipboard?.writeText(commit.sha);
		copied = true;
		window.setTimeout(() => {
			copied = false;
		}, COPY_FEEDBACK_MS);
	}
</script>

<div {...rest} class={cn('rounded-card border border-card-border bg-card-bg p-3.5 text-sm', className)}>
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div class="flex min-w-0 flex-1 items-center gap-2">
			<GitCommitHorizontal aria-hidden="true" class="size-4 shrink-0 text-fg-light" />
			{#if commit.message}
				<svelte:element this={`h${headingLevel}`} class="truncate font-semibold text-fg-main">{commit.message}</svelte:element>
			{/if}
		</div>

		<div class="flex items-center gap-1.5 font-mono text-xs">
			{#if commit.verified}
				<span
					class="rounded-chip bg-status-success-subtle px-1.5 py-px font-sans text-[11px] font-medium text-status-success"
				>
					Verified
				</span>
			{/if}
			{#if commit.href}
				<a href={commit.href} class="rounded-sm font-medium text-fg-main underline decoration-fg-light/50 underline-offset-4 hover:decoration-fg-main">{commit.sha.slice(0, 7)}</a>
			{:else}
				<span class="font-medium text-fg-main">{commit.sha.slice(0, 7)}</span>
			{/if}
			<button type="button" onclick={copySha} aria-label="Copy commit SHA" title="Copy commit SHA" class={buttonClass('ghost', 'icon-xs')}>
				{#if copied}<Check aria-hidden="true" class="text-status-success" />{:else}<Copy aria-hidden="true" />{/if}
			</button>
		</div>
	</div>

	{#if commit.author || commit.timestamp || commit.branch || commit.additions !== undefined || commit.deletions !== undefined || files.length}
		<div class="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-fg-light">
			<span>
				{#if commit.author}Authored by <strong class="font-medium text-fg-main">{commit.author}</strong>{/if}
				{#if commit.author && commit.timestamp}·{/if}
				{#if commit.timestamp}{commit.timestamp}{/if}
				{#if commit.branch}on <code class="rounded bg-canvas-secondary px-1.5 py-0.5 font-mono text-[11px]">{commit.branch}</code>{/if}
			</span>
			<span class="flex items-center gap-2 font-mono tabular-nums">
				{#if commit.additions !== undefined}<span class="text-diff-add-fg">+{commit.additions}</span>{/if}
				{#if commit.deletions !== undefined}<span class="text-diff-del-fg">-{commit.deletions}</span>{/if}
				{#if files.length}
					<button
						type="button"
						aria-expanded={isOpen}
						onclick={() => (isOpen = !isOpen)}
						class="inline-flex items-center gap-1 rounded-sm font-sans text-fg-light hover:text-fg-main"
					>
						{files.length} {files.length === 1 ? 'file' : 'files'}
						<ChevronDown aria-hidden="true" class="size-3 transition-transform duration-150 {isOpen ? 'rotate-180' : ''}" />
					</button>
				{/if}
			</span>
		</div>
	{/if}

	{#if files.length}
		<AgentDisclosure open={isOpen}>
			<ul class="mt-3 divide-y divide-canvas-border rounded-lg border border-card-border bg-canvas-primary font-mono text-xs">
				{#each files as file (file.path)}
					<li class="flex items-center justify-between gap-2 px-3 py-1.5">
						<span class="flex min-w-0 items-center gap-2">
							<span
								class="inline-block size-4 rounded text-center text-[10px] font-bold {file.status ===
								'added'
									? 'bg-status-success-subtle text-status-success'
									: file.status === 'deleted'
										? 'bg-status-danger-subtle text-status-danger'
										: 'bg-accent-subtle text-accent-primary'}"
							>
								{file.status === 'added' ? 'A' : file.status === 'deleted' ? 'D' : 'M'}
							</span>
							<span class="truncate text-fg-main">{file.path}</span>
						</span>
						<span class="shrink-0 tabular-nums">
							<span class="text-diff-add-fg">+{file.additions}</span>
							<span class="ml-1 text-diff-del-fg">-{file.deletions}</span>
						</span>
					</li>
				{/each}
			</ul>
		</AgentDisclosure>
	{/if}

	{#if onRestore}
		<div class="mt-2.5 flex justify-end">
			<button type="button" onclick={() => onRestore(commit.sha)} class={buttonClass('secondary', 'sm')}>
				<RotateCcw aria-hidden="true" />Checkout commit in worktree
			</button>
		</div>
	{/if}
</div>
