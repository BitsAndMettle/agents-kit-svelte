<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Check, ChevronDown, GitPullRequest, LoaderCircle } from '@lucide/svelte';
	import { fade } from 'svelte/transition';
	import { motionDuration, rise } from '../state/motion.svelte';
	import { pillClass } from '../ui/styles';
	import type { DiffStat, PrActionStatus } from '../types';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		/** Lines added and removed on the branch. */
		diff: DiffStat;
		/** `creating` shows a spinner, `created` swaps the button for the PR number. */
		status?: PrActionStatus;
		/** Number of the opened pull request, shown once `status` is `created`. */
		prNumber?: number;
		/** Label for the main button. */
		actionLabel?: string;
		/** Called when the person presses the main button. */
		onCreate?: () => void;
		/** Called when the person opens the opened pull request. */
		onOpenPr?: (prNumber: number) => void;
		/** Called when the person picks a file in the diff stat menu. */
		onSelectFile?: (path: string) => void;
		class?: string;
	}

	let {
		diff,
		status = 'idle',
		prNumber,
		actionLabel = 'Create PR',
		onCreate,
		onOpenPr,
		onSelectFile,
		class: className = '',
		...rest
	}: Props = $props();

	let open = $state(false);
	let root: HTMLDivElement | undefined = $state();

	/** GitHub-style five-block bar: green for additions, red for deletions, grey for the rest. */
	let blocks = $derived.by(() => {
		const total = diff.additions + diff.deletions;
		if (total === 0) return ['none', 'none', 'none', 'none', 'none'];
		const filled = Math.min(5, Math.max(1, Math.round(Math.log10(total + 1) * 1.6)));
		let del = Math.round((diff.deletions / total) * filled);
		if (diff.deletions > 0 && del === 0 && filled > 1) del = 1;
		const add = filled - del;
		return Array.from({ length: 5 }, (_, i) => (i < add ? 'add' : i < filled ? 'del' : 'none'));
	});

	let files = $derived(diff.files ?? []);

	$effect(() => {
		if (!open) return;
		const close = (event: PointerEvent) => {
			if (root && !root.contains(event.target as Node)) open = false;
		};
		window.addEventListener('pointerdown', close);
		return () => window.removeEventListener('pointerdown', close);
	});

	const fmt = (n: number) => n.toLocaleString('en-US');
</script>

<div {...rest} bind:this={root} class={cn('relative flex flex-wrap items-center gap-1.5', className)}>
	{#if status === 'created' && prNumber !== undefined}
		<button
			type="button"
			class={pillClass('secondary', 'md', 'ak-shadow-btn')}
			onclick={() => onOpenPr?.(prNumber)}
			in:fade={{ duration: motionDuration(160) }}
		>
			<GitPullRequest aria-hidden="true" class="text-status-success" />
			<span class="tabular-nums">#{prNumber}</span>
		</button>
	{:else}
		<button
			type="button"
			class={pillClass('secondary', 'md', 'ak-shadow-btn')}
			disabled={status === 'creating'}
			aria-busy={status === 'creating'}
			onclick={() => onCreate?.()}
		>
			{#if status === 'creating'}
				<LoaderCircle aria-hidden="true" class="animate-spin text-fg-light" />
				<span class="text-fg-light">Creating PR</span>
			{:else}
				{actionLabel}
			{/if}
		</button>
	{/if}

	<button
		type="button"
		class={pillClass('secondary', 'md', 'gap-2 font-mono tabular-nums ak-shadow-btn')}
		aria-haspopup={files.length ? 'menu' : undefined}
		aria-expanded={files.length ? open : undefined}
		aria-label="{fmt(diff.additions)} lines added, {fmt(diff.deletions)} removed{files.length ? `, ${files.length} files` : ''}"
		onclick={() => files.length && (open = !open)}
	>
		<span class="text-diff-add-fg">+{fmt(diff.additions)}</span>
		<span class="text-diff-del-fg">−{fmt(diff.deletions)}</span>
		<span class="flex gap-[2px]" aria-hidden="true">
			{#each blocks as block, i (i)}
				<span
					class={cn(
						'size-2 rounded-[2px]',
						block === 'add' && 'bg-status-success',
						block === 'del' && 'bg-status-danger',
						block === 'none' && 'bg-canvas-secondary'
					)}
				></span>
			{/each}
		</span>
		{#if files.length}
			<ChevronDown aria-hidden="true" class={cn('text-fg-light transition-transform', open && 'rotate-180')} />
		{/if}
	</button>

	{#if status === 'created'}
		<span class="inline-flex items-center gap-1 text-xs text-status-success" in:fade={{ duration: motionDuration(160) }}>
			<Check aria-hidden="true" class="size-3.5" /> Opened
		</span>
	{/if}

	{#if open && files.length}
		<div
			role="menu"
			class="absolute bottom-full left-0 z-20 mb-2 w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-[12px] border border-chat-border bg-card-bg p-1 ak-shadow-soft-sm"
			transition:rise={{ y: 4, duration: 140 }}
		>
			<p class="px-2.5 pt-1.5 pb-1 text-xs text-fg-light">{files.length} files changed</p>
			{#each files as file (file.path)}
				<button
					type="button"
					role="menuitem"
					class="flex w-full items-center gap-3 rounded-[8px] px-2.5 py-1.5 text-left text-[13px] hover:bg-chat-surface"
					onclick={() => {
						onSelectFile?.(file.path);
						open = false;
					}}
				>
					<span class="min-w-0 flex-1 truncate font-mono text-xs text-fg-main">{file.path}</span>
					<span class="font-mono text-xs tabular-nums text-diff-add-fg">+{fmt(file.additions)}</span>
					<span class="font-mono text-xs tabular-nums text-diff-del-fg">−{fmt(file.deletions)}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
