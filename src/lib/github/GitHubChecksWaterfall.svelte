<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Check, ChevronDown, Clock, GitMerge, LoaderCircle, Wrench, X } from '@lucide/svelte';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import { motionDuration, rise } from '../state/motion.svelte';
	import { pillClass } from '../ui/styles';
	import type { CheckRun, ChecksPhase } from '../types';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children'> {
		prNumber: number;
		/** The commit the checks ran on. */
		commit: { sha: string; message: string };
		checks: CheckRun[];
		/** Seconds since the suite started. Running bars grow to here. */
		now?: number;
		/** What the agent is doing with the pull request; overrides the header. */
		phase?: ChecksPhase;
		/** Branch it merges into, for the merged header. */
		base?: string;
		/** Shows the bars. Bindable; the header toggles it. */
		expanded?: boolean;
		/** Called when the person presses Fix on a failed suite. The button only shows when set. */
		onFix?: (failed: CheckRun[]) => void;
		/** Called when the person presses Merge once every check passed. The button only shows when set. */
		onMerge?: () => void;
		/** Called when the person clicks a check row, e.g. to open its logs. */
		onSelectCheck?: (check: CheckRun) => void;
		class?: string;
	}

	let {
		prNumber,
		commit,
		checks,
		now,
		phase = 'checks',
		base = 'main',
		expanded = $bindable(true),
		onFix,
		onMerge,
		onSelectCheck,
		class: className = '',
		...rest
	}: Props = $props();

	const end = (c: CheckRun, t: number) =>
		c.start === undefined ? 0 : c.duration !== undefined ? c.start + c.duration : Math.max(c.start, t);

	let latest = $derived(Math.max(0, ...checks.map((c) => end(c, 0))));
	let clock = $derived(now ?? latest);
	let running = $derived(checks.some((c) => c.status === 'running' || c.status === 'queued'));
	let total = $derived(Math.max(0, ...checks.map((c) => end(c, clock))));
	let done = $derived(checks.filter((c) => c.status === 'passed' || c.status === 'skipped').length);
	let failed = $derived(checks.filter((c) => c.status === 'failed'));
	let allPassed = $derived(checks.length > 0 && done === checks.length);

	/** The time axis keeps headroom while checks run, and settles on the real total when they finish. */
	const domain = new Tween(60, { duration: 500, easing: cubicOut });
	let primed = false;
	$effect(() => {
		const t = Math.max(total, 1);
		const target = running ? Math.max(t * 1.18, 20) : t;
		if (!primed || target > domain.target || !running) {
			void domain.set(target, { duration: !primed || prefersReducedMotion.current ? 0 : 500 });
			primed = true;
		}
	});

	const ROW_CLASS = 'grid grid-cols-[1.25rem_minmax(5.5rem,9rem)_1fr_3.25rem] items-center gap-2 py-1.5';
	const pct = (s: number) => `${Math.max(0, Math.min(100, (s / domain.current) * 100))}%`;

	function fmt(s: number): string {
		const r = Math.round(s);
		return r < 60 ? `${r}s` : `${Math.floor(r / 60)}m ${r % 60}s`;
	}

	type Head = { text: string; tone: 'neutral' | 'success' | 'danger' | 'merged' | 'busy' };
	let head = $derived.by<Head>(() => {
		if (phase === 'merged') return { text: `Merged into ${base}`, tone: 'merged' };
		if (phase === 'merging') return { text: 'Merging', tone: 'busy' };
		if (phase === 'fixing') return { text: `Fixing ${failed.map((c) => c.name).join(', ') || 'checks'}`, tone: 'busy' };
		if (failed.length === 1) return { text: `${failed[0].name} failed`, tone: 'danger' };
		if (failed.length > 1) return { text: `${failed.length} checks failed`, tone: 'danger' };
		if (allPassed) return { text: 'All checks passed', tone: 'success' };
		return { text: `Checks ${done}/${checks.length}`, tone: 'neutral' };
	});

	const STATUS_BAR: Record<CheckRun['status'], string> = {
		queued: 'bg-canvas-secondary',
		running: 'bg-status-info',
		passed: 'bg-status-success',
		failed: 'bg-status-danger',
		skipped: 'bg-canvas-border'
	};
	const RING: Record<CheckRun['status'], string> = {
		queued: 'var(--ak-color-border-subtle)',
		running: 'var(--ak-color-info)',
		passed: 'var(--ak-color-success)',
		failed: 'var(--ak-color-danger)',
		skipped: 'var(--ak-color-border-subtle)'
	};

	/** Ring of one arc per check, coloured by status. */
	let arcs = $derived.by(() => {
		const n = Math.max(1, checks.length);
		const r = 6.5;
		const gap = n > 1 ? 0.5 : 0;
		return checks.map((c, i) => {
			const a0 = (i / n) * Math.PI * 2 - Math.PI / 2 + gap / 2 / r;
			const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2 - gap / 2 / r;
			const p = (a: number) => `${8 + r * Math.cos(a)},${8 + r * Math.sin(a)}`;
			return { d: `M${p(a0)} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)}`, color: RING[c.status], id: c.id };
		});
	});
</script>

<section {...rest}
	aria-label="Checks for pull request #{prNumber}"
	class={cn('overflow-hidden rounded-soft border border-chat-border bg-card-bg text-sm ak-shadow-soft-sm', className)}
>
	<header class="flex items-center gap-2 px-3 py-2">
		<button
			type="button"
			class="flex min-w-0 flex-1 items-center gap-2.5 rounded-[8px] px-1.5 py-1.5 text-left hover:bg-chat-surface/70"
			aria-expanded={expanded}
			onclick={() => (expanded = !expanded)}
		>
			<span class="inline-flex size-4 shrink-0 items-center justify-center [&_svg]:size-4" aria-hidden="true">
				{#if head.tone === 'merged'}
					<GitMerge class="text-[var(--ak-chart-3)]" />
				{:else if head.tone === 'busy'}
					<LoaderCircle class="animate-spin text-fg-light" />
				{:else}
					<svg viewBox="0 0 16 16" class={cn('size-4', running && !prefersReducedMotion.current && 'animate-[spin_3s_linear_infinite]')}>
						{#each arcs as a (a.id)}
							<path d={a.d} fill="none" stroke={a.color} stroke-width="2" stroke-linecap="round" />
						{/each}
					</svg>
				{/if}
			</span>
			<span class="font-medium text-fg-main tabular-nums">#{prNumber}</span>
			<span
				class={cn(
					'truncate',
					head.tone === 'danger' && 'text-status-danger',
					head.tone === 'success' && 'text-status-success',
					head.tone === 'merged' && 'text-[var(--ak-chart-3)]',
					(head.tone === 'neutral' || head.tone === 'busy') && 'text-fg-light'
				)}
				aria-live="polite">{head.text}</span
			>
			<ChevronDown aria-hidden="true" class={cn('ml-auto size-4 shrink-0 text-fg-light transition-transform', expanded && 'rotate-180')} />
		</button>
		{#if onFix && failed.length && phase === 'checks'}
			<button type="button" class={pillClass('secondary', 'sm', 'text-status-info')} onclick={() => onFix(failed)} in:rise>
				<Wrench aria-hidden="true" /> Fix
			</button>
		{:else if onMerge && allPassed && phase === 'checks'}
			<button
				type="button"
				class={pillClass('secondary', 'sm', 'border-transparent bg-status-info-subtle text-status-info hover:bg-status-info-subtle/80')}
				onclick={() => onMerge()}
				in:rise
			>
				<GitMerge aria-hidden="true" /> Merge
			</button>
		{/if}
	</header>

	{#if expanded}
		<div class="border-t border-chat-border/70 px-4 pt-2.5 pb-3" transition:slide={{ duration: motionDuration(220) }}>
			<p class="flex items-center gap-2 pb-1.5 text-[13px] text-fg-light">
				Checks on
				<code class="rounded-[6px] bg-chat-surface px-1.5 py-0.5 font-mono text-xs text-fg-main">{commit.sha.slice(0, 6)}</code>
				<span class="min-w-0 flex-1 truncate">{commit.message}</span>
				<span class="font-mono text-xs tabular-nums">{fmt(total)}</span>
			</p>
			<ul>
				{#each checks as check (check.id)}
					{@const s = check.start ?? 0}
					{@const dur = check.status === 'queued' ? 0 : end(check, clock) - s}
					<li>
						{#if onSelectCheck}
							<button type="button" class="-mx-2 {ROW_CLASS} w-[calc(100%+1rem)] rounded-[8px] px-2 text-left hover:bg-chat-surface" onclick={() => onSelectCheck(check)}>
								{@render row(check, s, dur)}
							</button>
						{:else}
							<div class={ROW_CLASS}>{@render row(check, s, dur)}</div>
						{/if}
						{#if check.status === 'failed' && check.failure}
							{@const f = check.failure}
							<div class="mt-1 mb-2 ml-7 text-[13px]" transition:slide={{ duration: motionDuration(200) }}>
								{#if f.location}<p class="font-mono text-xs text-fg-light">{f.location}</p>{/if}
								<p class="mt-0.5 text-fg-main">{f.title}</p>
								{#if f.expected !== undefined || f.received !== undefined}
									<div class="mt-1.5 overflow-hidden rounded-[8px] font-mono text-xs">
										{#if f.expected !== undefined}
											<p class="bg-diff-add-bg px-2.5 py-1 text-diff-add-fg">Expected: {JSON.stringify(f.expected)}</p>
										{/if}
										{#if f.received !== undefined}
											<p class="bg-diff-del-bg px-2.5 py-1 text-diff-del-fg">Received: {JSON.stringify(f.received)}</p>
										{/if}
									</div>
								{:else if f.message}
									<p class="mt-1 text-fg-light">{f.message}</p>
								{/if}
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</section>

{#snippet row(check: CheckRun, s: number, dur: number)}
							<span class="inline-flex size-4 items-center justify-center [&_svg]:size-3.5" aria-hidden="true">
								{#if check.status === 'passed'}
									<Check class="text-status-success" />
								{:else if check.status === 'failed'}
									<X class="text-status-danger" />
								{:else if check.status === 'running'}
									<LoaderCircle class="animate-spin text-status-info" />
								{:else}
									<Clock class="text-fg-light" />
								{/if}
							</span>
							<span class="truncate text-fg-main">{check.name}<span class="sr-only">, {check.status}</span></span>
							<span class="relative h-2" aria-hidden="true">
								{#if check.status !== 'queued' && check.start !== undefined}
									<span
										class={cn('absolute top-0 h-2 min-w-1.5 rounded-full transition-colors duration-300', STATUS_BAR[check.status])}
										style="left:{pct(s)};width:{pct(dur)}"
									></span>
								{/if}
							</span>
							<span class="text-right font-mono text-xs tabular-nums text-fg-light">
								{check.status === 'queued' ? 'Queued' : fmt(dur)}
							</span>
{/snippet}
