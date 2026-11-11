<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Check, ChevronRight, X } from '@lucide/svelte';
	import { slide } from 'svelte/transition';
	import { motionDuration, rise } from '../state/motion.svelte';
	import type { WorkStep } from '../types';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children' | 'title'> {
		steps: WorkStep[];
		/** `running` titles the trace with the current step; `done` with how long it took. */
		status?: 'running' | 'done';
		/** Seconds spent so far. */
		elapsed?: number;
		/** Header while running. Defaults to the running step's label. */
		title?: string;
		/** Shows the steps. Bindable; the header toggles it. */
		expanded?: boolean;
		/** Called when the person clicks a file chip. Chips are only buttons when set. */
		onSelectFile?: (path: string) => void;
		class?: string;
	}

	let {
		steps,
		status = 'running',
		elapsed,
		title,
		expanded = $bindable(true),
		onSelectFile,
		class: className = '',
		...rest
	}: Props = $props();

	let current = $derived(steps.findLast((s) => s.status === 'running'));
	let heading = $derived(
		status === 'done' ? `Worked for ${elapsed !== undefined ? fmt(elapsed) : `${steps.length} steps`}` : (title ?? current?.label ?? 'Working')
	);

	function fmt(s: number): string {
		const r = Math.max(1, Math.round(s));
		return r < 60 ? `${r}s` : `${Math.floor(r / 60)}m ${r % 60}s`;
	}

	const CHIP = 'inline-flex items-center gap-1.5 rounded-full border border-chat-border bg-card-bg px-2.5 py-0.5 text-[13px] text-fg-main';

	const EXT: Record<string, { tag: string; color: string }> = {
		ts: { tag: 'TS', color: 'var(--ak-chart-6)' },
		tsx: { tag: 'TSX', color: 'var(--ak-chart-6)' },
		js: { tag: 'JS', color: 'var(--ak-chart-5)' },
		svelte: { tag: 'SV', color: 'var(--ak-chart-2)' },
		css: { tag: 'CSS', color: 'var(--ak-chart-3)' },
		json: { tag: '{}', color: 'var(--ak-chart-5)' },
		md: { tag: 'MD', color: 'var(--ak-color-fg-muted)' },
		py: { tag: 'PY', color: 'var(--ak-chart-1)' }
	};
	function fileTag(path: string) {
		const name = path.split('/').pop() ?? path;
		const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
		return { name, ...(EXT[ext] ?? { tag: ext.toUpperCase().slice(0, 3) || '•', color: 'var(--ak-color-fg-muted)' }) };
	}
</script>

<section {...rest} aria-label="Agent work: {heading}" class={cn('text-sm', className)}>
	<button
		type="button"
		class="group -ml-1.5 flex items-center gap-2 rounded-[8px] px-1.5 py-1 text-left hover:bg-chat-surface/70"
		aria-expanded={expanded}
		onclick={() => (expanded = !expanded)}
	>
		<ChevronRight aria-hidden="true" class={cn('size-4 text-fg-light transition-transform', expanded && 'rotate-90')} />
		<span class={cn('text-fg-main', status === 'running' && 'ak-shimmer-text')} aria-live="polite">{heading}</span>
		{#if status === 'running' && elapsed !== undefined}
			<span class="text-fg-light tabular-nums">{fmt(elapsed)}</span>
		{/if}
	</button>

	{#if expanded}
		<ol class="mt-1.5" transition:slide={{ duration: motionDuration(200) }}>
			{#each steps as step, i (step.id)}
				{@const last = i === steps.length - 1}
				{@const nextNested = steps[i + 1]?.nested}
				<li class="relative grid grid-cols-[1.25rem_1fr] gap-x-2.5" in:rise={{ y: 4, duration: 200 }}>
					<!-- connector: main line runs under every marker but the last -->
					{#if !last}
						<span
							class="absolute top-[1.15rem] bottom-[-0.35rem] left-[calc(0.625rem-0.5px)] w-px bg-canvas-border"
							aria-hidden="true"
						></span>
					{/if}
					<span class="relative flex h-7 items-center justify-center" aria-hidden="true">
						{#if step.nested}
							<svg class="absolute -top-2 left-[0.6rem] h-11 w-3 overflow-visible" viewBox="0 0 12 44" fill="none">
								<path d="M0 0 C0 10 10 10 10 22 C10 34 0 34 0 44" stroke="var(--ak-color-border-subtle)" stroke-width="1" />
							</svg>
							<span class="relative left-[0.6rem]">
								{@render marker(step)}
							</span>
						{:else}
							{@render marker(step)}
						{/if}
					</span>
					<div class={cn('min-w-0 py-1', step.nested && 'pl-3', nextNested ? 'pb-0.5' : 'pb-1.5')}>
						<p class="leading-5">
							<span class={cn(step.kind === 'result' ? 'text-fg-main' : step.status === 'failed' ? 'text-status-danger' : step.nested ? 'text-fg-light' : 'text-fg-main/80', step.status === 'running' && 'ak-shimmer-text')}>
								{step.label}
							</span>
							{#if step.status}<span class="sr-only">, {step.status}</span>{/if}
							{#if step.detail}<span class="ml-1.5 text-fg-light">{step.detail}</span>{/if}
						</p>
						{#if step.files?.length}
							<div class="mt-1.5 flex flex-wrap gap-1.5">
								{#each step.files as path (path)}
									{@const f = fileTag(path)}
									{#if onSelectFile}
										<button type="button" title={path} class="{CHIP} hover:bg-chat-surface" onclick={() => onSelectFile(path)}>
											<span class="font-mono text-[10px] font-semibold" style="color:{f.color}">{f.tag}</span>
											{f.name}
										</button>
									{:else}
										<span title={path} class={CHIP}>
											<span class="font-mono text-[10px] font-semibold" style="color:{f.color}">{f.tag}</span>
											{f.name}
										</span>
									{/if}
								{/each}
							</div>
						{/if}
					</div>
				</li>
			{/each}
		</ol>
	{/if}
</section>

{#snippet marker(step: WorkStep)}
	{#if step.kind === 'result' && step.status === 'done'}
		<span class="inline-flex size-[18px] items-center justify-center rounded-full bg-status-info text-white [&_svg]:size-3">
			<Check strokeWidth={3} />
		</span>
	{:else if step.status === 'failed'}
		<span class="inline-flex size-4 items-center justify-center rounded-full bg-status-danger-subtle text-status-danger [&_svg]:size-3">
			<X strokeWidth={3} />
		</span>
	{:else if step.status === 'running'}
		<span class="relative inline-flex size-3.5 items-center justify-center rounded-full border-[1.5px] border-fg-light bg-card-bg">
			<span class="size-1.5 rounded-full bg-fg-light"></span>
			<span class="absolute inset-[-3px] animate-ping rounded-full border border-fg-light/40 motion-reduce:hidden"></span>
		</span>
	{:else if step.kind === 'push' || step.status === 'pending'}
		<span class="size-3 rounded-full border-[1.5px] border-fg-light/70 bg-card-bg"></span>
	{:else}
		<span class={cn('rounded-full bg-fg-light/60', step.nested ? 'size-1.5' : 'size-2')}></span>
	{/if}
{/snippet}
