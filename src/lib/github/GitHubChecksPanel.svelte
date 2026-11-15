<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Check, RefreshCw, X, Zap } from '@lucide/svelte';
	import { buttonClass } from '../ui/styles';
	import type { GitHubCheckItem } from '../types';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children' | 'title' | 'checks' | 'onFixWithAgent' | 'onRerunCheck'> {
		title?: string;
		checks?: GitHubCheckItem[];
		onFixWithAgent?: (checkId: string) => void;
		onRerunCheck?: (checkId: string) => void;
		class?: string;
	}

	let {
		title = 'GitHub Actions & Check Suites',
		checks = [],
		onFixWithAgent,
		onRerunCheck,
		class: className = '',
		...rest
	}: Props = $props();

	let fixingIds = $state<Record<string, boolean>>({});
	let rerunningIds = $state<Record<string, boolean>>({});

	/**
	 * Dispatches the agent to diagnose and fix a failing CI check.
	 *
	 * @param checkId - Identifier of the failing check item.
	 */
	function triggerAgentFix(checkId: string): void {
		fixingIds = { ...fixingIds, [checkId]: true };
		onFixWithAgent?.(checkId);
	}

	/**
	 * Triggers a check suite re-run.
	 *
	 * @param checkId - Identifier of the check item.
	 */
	function triggerRerun(checkId: string): void {
		rerunningIds = { ...rerunningIds, [checkId]: true };
		onRerunCheck?.(checkId);
	}
</script>

<section {...rest}
	aria-label={title}
	class={cn('rounded-card border border-card-border bg-card-bg p-4 text-sm', className)}
>
	<header class="flex flex-wrap items-center justify-between gap-2 border-b border-canvas-border pb-3">
		<div>
			<h3 class="font-semibold text-fg-main">{title}</h3>
			<p class="text-xs text-fg-light">
				Live Commit Statuses & Workflow Gates · Read-only GitHub App integration
			</p>
		</div>
		<span class="rounded-full bg-canvas-secondary px-2.5 py-0.5 font-mono text-xs text-fg-main">
			{checks.filter((c) => c.status === 'passed').length}/{checks.length} passing
		</span>
	</header>

	<ul class="mt-3 divide-y divide-canvas-border">
		{#each checks as check (check.id)}
			{@const isFixing = fixingIds[check.id] ?? false}
			{@const isRerunning = rerunningIds[check.id] ?? false}
			<li class="flex flex-wrap items-start justify-between gap-3 py-2.5 text-xs">
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-2">
						<span
							class="inline-flex size-4 shrink-0 items-center justify-center rounded-full {isFixing ||
							isRerunning
								? 'bg-accent-subtle text-accent-primary'
								: check.status === 'passed'
									? 'bg-status-success-subtle text-status-success'
									: check.status === 'failed'
										? 'bg-status-danger-subtle text-status-danger'
										: 'bg-canvas-secondary text-fg-light'}"
						>
							{#if isFixing || isRerunning}
								<RefreshCw class="size-2.5 animate-spin" />
							{:else if check.status === 'passed'}
								<Check class="size-2.5" strokeWidth={3} />
							{:else}
								<X class="size-2.5" strokeWidth={3} />
							{/if}
						</span>
						<span class="font-medium text-fg-main">{check.name}</span>
						{#if check.workflow}
							<span class="rounded bg-canvas-secondary px-1.5 py-0.5 font-mono text-[10px] text-fg-light">
								{check.workflow}
							</span>
						{/if}
						{#if check.duration}<span class="font-mono text-[11px] tabular-nums text-fg-light">{check.duration}</span>{/if}
					</div>
					{#if check.summary}
						<p class="mt-1 pl-6 text-fg-light">{check.summary}</p>
					{/if}
				</div>

				<div class="flex items-center gap-1.5">
					{#if check.status === 'failed'}
						<button
							type="button"
							onclick={() => triggerAgentFix(check.id)}
							class={buttonClass('primary', 'sm')}
						>
							{#if isFixing}<RefreshCw aria-hidden="true" />Claude Code Fixing…{:else}<Zap aria-hidden="true" />Fix with Claude Code{/if}
						</button>
					{/if}
					<button
						type="button"
						onclick={() => triggerRerun(check.id)}
						class={buttonClass('secondary', 'sm')}
					>
						{#if isRerunning}Re-running…{:else}<RefreshCw aria-hidden="true" />Re-run{/if}
					</button>
				</div>
			</li>
		{/each}
	</ul>
</section>
