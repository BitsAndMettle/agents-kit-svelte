<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { prefersReducedMotion } from 'svelte/motion';
	import { Bot, Clock, Eye, LoaderCircle, TriangleAlert } from '@lucide/svelte';
	import { badgeClass } from '../ui/styles';
	import type { Machine, MachinePresence, MachineWork, MachineWorkStatus } from '../types';
	import { clampSlots, fleetSummary, WORK_PREVIEW, PRESENCE_LABEL, relativeTime, slotSegments, workPreview } from './fleet';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children' | 'title'> {
		machines: Machine[];
		/** Heading shown above the summary. */
		title?: string;
		/** The time "last seen" is measured against: an ISO string, a timestamp or a Date. Defaults to the current time. */
		now?: string | number | Date;
		/** Called when the person presses a machine's name row, e.g. to open its page. Rows are only buttons when set. */
		onSelectMachine?: (machine: Machine) => void;
		/** Called when the person presses a piece of work on a machine. Work rows are only buttons when set. */
		onSelectWork?: (work: MachineWork, machine: Machine) => void;
		class?: string;
	}

	let { machines, title, now, onSelectMachine, onSelectWork, class: className = '', ...rest }: Props = $props();

	let summary = $derived(fleetSummary(machines));
	let clock = $derived(now ?? Date.now());
	let expanded = $state<string[]>([]);

	const DOT: Record<MachinePresence, string> = {
		online: 'bg-status-success',
		stale: 'bg-status-warning',
		offline: 'border border-fg-light bg-transparent'
	};
	const PRESENCE_TEXT: Record<MachinePresence, string> = {
		online: 'text-status-success',
		stale: 'text-status-warning',
		offline: 'text-fg-light'
	};
	const WORK_LABEL: Record<MachineWorkStatus, string> = { running: 'Running', reviewing: 'In review', waiting: 'Waiting' };
	const RING =
		'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary';

	function toggle(id: string) {
		expanded = expanded.includes(id) ? expanded.filter((x) => x !== id) : [...expanded, id];
	}
</script>

<section {...rest} aria-label={title ?? 'Fleet status'} class={cn('overflow-hidden rounded-card border border-card-border bg-card-bg text-sm', className)}>
	<header class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-canvas-border px-3 py-2.5 sm:px-4">
		{#if title}<h3 class="text-sm font-medium text-fg-main">{title}</h3>{/if}
		<p class="text-xs text-fg-light tabular-nums">
			<span class="font-medium text-fg-main">{summary.busy} of {summary.total}</span> slots busy
			<span aria-hidden="true">·</span>
			<span class="font-medium text-fg-main">{summary.online} of {summary.machines}</span> online
		</p>
	</header>

	{#if machines.length === 0}
		<p class="px-4 py-6 text-center text-xs text-fg-light">No machines have connected yet.</p>
	{:else}
		<ul class="divide-y divide-canvas-border">
			{#each machines as m (m.id)}
				{@const segs = slotSegments(m.slots)}
				{@const slots = clampSlots(m.slots)}
				{@const work = m.work ?? []}
				{@const all = expanded.includes(m.id)}
				{@const preview = workPreview(work, all ? work.length : undefined)}
				{@const seen = relativeTime(m.lastSeen, clock)}
				<li
					class={cn(
						'flex flex-col gap-2.5 px-3 py-3 sm:grid sm:grid-cols-[minmax(9rem,13rem)_minmax(8rem,11rem)_1fr] sm:items-start sm:gap-x-4 sm:px-4',
						m.presence === 'offline' && 'bg-canvas-primary/50'
					)}
				>
					<div class="min-w-0">
						{#snippet identity()}
							<span class={cn('size-2 shrink-0 rounded-full', DOT[m.presence])} aria-hidden="true"></span>
							<span class="min-w-0 truncate font-medium text-fg-main">{m.name}</span>
							{#if m.holdsOperator}
								<span class={badgeClass('accent')}><Bot aria-hidden="true" />Operator</span>
							{/if}
						{/snippet}
						{#if onSelectMachine}
							<button
								type="button"
								class={cn('-mx-1.5 flex max-w-full items-center gap-2 rounded-[8px] px-1.5 py-1 text-left hover:bg-chat-surface', RING)}
								onclick={() => onSelectMachine(m)}
							>
								{@render identity()}
							</button>
						{:else}
							<p class="flex items-center gap-2 py-1">{@render identity()}</p>
						{/if}
						<p class={cn('mt-0.5 text-xs', PRESENCE_TEXT[m.presence])}>
							{PRESENCE_LABEL[m.presence]}{#if seen && m.presence !== 'online'}<span class="text-fg-light">&nbsp;· seen {seen}</span>{/if}
						</p>
					</div>

					<div class={cn('min-w-0', m.presence === 'offline' && 'opacity-60')}>
						<p class="text-xs tabular-nums text-fg-light">
							<span class="font-medium text-fg-main">{slots.used} of {slots.total}</span> slots busy
						</p>
						<div class="mt-1.5 flex gap-0.5" aria-hidden="true">
							{#each segs as s, i (i)}
								<span class={cn('h-1.5 min-w-1 flex-1 rounded-full', s === 'busy' ? 'bg-accent-primary' : 'bg-canvas-secondary')}></span>
							{/each}
						</div>
					</div>

					<div class="min-w-0">
						{#if m.alert}
							<p class="flex items-start gap-1.5 text-xs text-status-warning">
								<TriangleAlert aria-hidden="true" class="mt-px size-3.5 shrink-0" />
								<span>{m.alert}</span>
							</p>
						{/if}
						{#if m.flags?.length}
							<ul class={cn('flex flex-wrap gap-1.5', !!m.alert && 'mt-1.5')}>
								{#each m.flags as f (f.id)}
									<li class={badgeClass(f.ok ? 'neutral' : 'warning')}>
										{#if !f.ok}<TriangleAlert aria-hidden="true" />{/if}
										{f.label}{#if !f.ok}<span class="sr-only"> (missing safeguard)</span>{/if}
									</li>
								{/each}
							</ul>
						{/if}
						{#if work.length}
							<ul class={cn('space-y-0.5', (m.alert || !!m.flags?.length) && 'mt-2')}>
								{#each preview.shown as w (w.id)}
									<li>
										{#snippet line()}
											<span class="inline-flex size-4 shrink-0 items-center justify-center text-fg-light [&_svg]:size-3.5" aria-hidden="true">
												{#if w.status === 'running'}
													<LoaderCircle class={cn('text-status-info', !prefersReducedMotion.current && 'animate-spin')} />
												{:else if w.status === 'reviewing'}
													<Eye />
												{:else if w.status === 'waiting'}
													<Clock />
												{:else}
													<span class="size-1.5 rounded-full bg-fg-light"></span>
												{/if}
											</span>
											<span class="min-w-0 flex-1 truncate text-fg-main">{w.label}</span>
											{#if w.status}<span class="sr-only">, {WORK_LABEL[w.status]}</span>{/if}
										{/snippet}
										{#if onSelectWork}
											<button
												type="button"
												class={cn('-mx-1.5 flex w-[calc(100%+0.75rem)] items-center gap-2 rounded-[8px] px-1.5 py-1 text-left text-xs hover:bg-chat-surface', RING)}
												onclick={() => onSelectWork(w, m)}
											>
												{@render line()}
											</button>
										{:else}
											<p class="flex items-center gap-2 py-1 text-xs">{@render line()}</p>
										{/if}
									</li>
								{/each}
							</ul>
							{#if work.length > WORK_PREVIEW}
								<button
									type="button"
									class={cn('mt-0.5 rounded-[6px] py-1 text-xs font-medium text-fg-light hover:text-fg-main', RING)}
									aria-expanded={all}
									onclick={() => toggle(m.id)}
								>
									{all ? 'Show fewer' : `+${preview.more} more`}
								</button>
							{/if}
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>
