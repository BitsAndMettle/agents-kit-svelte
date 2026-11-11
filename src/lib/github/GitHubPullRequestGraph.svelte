<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Check, GitMerge, LoaderCircle, Maximize2, Minimize2, TriangleAlert, X } from '@lucide/svelte';
	import { draw } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { motionDuration, rise } from '../state/motion.svelte';
	import type { PrGraphCommit, PrGraphLane, PrMergeState, PrState } from '../types';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children' | 'title'> {
		/** Pull request title. */
		title: string;
		number: number;
		state?: PrState;
		/** Branches, base first or last; the one with `base: true` is drawn grey on the left. */
		lanes: PrGraphLane[];
		/** Commits newest first, across all lanes. */
		commits: PrGraphCommit[];
		/** Lane id of the pull request's head branch. Defaults to the first non-base lane. */
		head?: string;
		/** Whether it merges into the base cleanly. Drawn as the top row. */
		mergeState?: PrMergeState;
		/** Status line under the graph, e.g. `Checking it merges cleanly` or `Checks 2/5`. */
		footer?: { label: string; tone?: 'running' | 'success' | 'danger' | 'neutral' };
		/** Collapses the graph to the header and footer. Bindable. */
		collapsed?: boolean;
		/** Shows the collapse button. */
		collapsible?: boolean;
		/** Called when the person clicks a commit row. Rows are only buttons when set. */
		onSelectCommit?: (commit: PrGraphCommit) => void;
		class?: string;
	}

	let {
		title,
		number,
		state = 'open',
		lanes,
		commits,
		head,
		mergeState = 'checking',
		footer,
		collapsed = $bindable(false),
		collapsible = true,
		onSelectCommit,
		class: className = '',
		...rest
	}: Props = $props();

	const ROW = 36;
	const GAP = 15;
	const X0 = 11;
	const PALETTE = ['var(--ak-chart-1)', 'var(--ak-chart-4)', 'var(--ak-chart-3)', 'var(--ak-chart-2)', 'var(--ak-chart-5)'];
	const BASE_COLOR = 'color-mix(in oklch, var(--ak-color-fg-muted) 55%, transparent)';

	let base = $derived(lanes.find((l) => l.base));
	/** Base lane on the far left, then branches in the order given. */
	let ordered = $derived([...(base ? [base] : []), ...lanes.filter((l) => !l.base)]);
	let laneX = $derived(new Map(ordered.map((l, i) => [l.id, X0 + i * GAP])));
	let laneColor = $derived(
		new Map(ordered.map((l, i) => [l.id, l.color ?? (l.base ? BASE_COLOR : PALETTE[(i - (base ? 1 : 0)) % PALETTE.length])]))
	);
	let headId = $derived(head ?? lanes.find((l) => !l.base)?.id);
	let graphW = $derived(X0 * 2 + Math.max(0, ordered.length - 1) * GAP);

	/** Row 0 is the merge row; commit i sits on row i + 1. */
	const y = (row: number) => row * ROW + ROW / 2;

	/** Newest commit of each lane gets its branch chip. */
	let chipFor = $derived.by(() => {
		const seen = new Set<string>();
		const chips = new Map<string, string>();
		for (const c of commits) {
			if (seen.has(c.lane)) continue;
			seen.add(c.lane);
			const lane = lanes.find((l) => l.id === c.lane);
			if (lane) chips.set(c.sha, lane.branch);
		}
		return chips;
	});

	/** Path segments: each branch's line and the curve where it forks from the base. */
	let paths = $derived.by(() => {
		const out: { d: string; color: string; dashed?: boolean; key: string }[] = [];
		const baseX = base ? laneX.get(base.id)! : X0;
		const rows = (id: string) => commits.flatMap((c, i) => (c.lane === id ? [i + 1] : []));
		const baseRows = base ? rows(base.id) : [];
		/** Bottom edge of the last commit row; lines with no older base commit end here. */
		const bottom = (commits.length + 1) * ROW;
		if (base) {
			const top = baseRows.length ? y(baseRows[0]) : bottom;
			out.push({ key: 'base-up', d: `M${baseX},${y(0)} V${top}`, color: BASE_COLOR, dashed: true });
			out.push({ key: 'base', d: `M${baseX},${top} V${bottom}`, color: BASE_COLOR });
		}
		for (const lane of ordered) {
			if (lane.base) continue;
			const r = rows(lane.id);
			if (!r.length) continue;
			const x = laneX.get(lane.id)!;
			const color = laneColor.get(lane.id)!;
			const first = r[0];
			const last = r[r.length - 1];
			out.push({ key: `${lane.id}-line`, d: `M${x},${y(first)} V${y(last)}`, color });
			const fork = baseRows.find((row) => row > last);
			const y1 = y(last);
			const y2 = fork === undefined ? bottom : y(fork);
			out.push({ key: `${lane.id}-fork`, d: `M${x},${y1} C${x},${y1 + (y2 - y1) * 0.7} ${baseX},${y2 - ROW * 0.5} ${baseX},${y2}`, color });
			if (lane.id === headId) {
				out.push({
					key: `${lane.id}-merge`,
					d: `M${x},${y(first)} C${x},${y(first) - ROW * 0.55} ${baseX},${y(0) + ROW * 0.35} ${baseX},${y(0)}`,
					color,
					dashed: state !== 'merged'
				});
			}
		}
		return out;
	});

	const STATE = {
		draft: { label: 'Draft', cls: 'text-fg-light', dot: 'bg-fg-light' },
		open: { label: 'Open', cls: 'text-status-success', dot: 'bg-status-success' },
		merged: { label: 'Merged', cls: 'text-[var(--ak-chart-3)]', dot: 'bg-[var(--ak-chart-3)]' },
		closed: { label: 'Closed', cls: 'text-status-danger', dot: 'bg-status-danger' }
	} as const;

	const MERGE_TEXT: Record<PrMergeState, string> = {
		checking: 'checking',
		clean: 'no conflicts',
		conflict: 'conflicts',
		merged: 'merged'
	};

	let baseBranch = $derived(base?.branch ?? 'main');
</script>

<section {...rest}
	aria-label="Pull request #{number}: {title}"
	class={cn('overflow-hidden rounded-soft border border-chat-border bg-card-bg text-sm ak-shadow-soft-sm', className)}
>
	<header class="flex items-start gap-3 px-4 pt-3.5 pb-2">
		<h3 class="min-w-0 flex-1 text-[15px] leading-6 font-semibold text-fg-main">
			{title} <span class="font-normal text-fg-light">#{number}</span>
		</h3>
		<span class="mt-0.5 inline-flex items-center gap-1.5 text-[13px] font-medium {STATE[state].cls}">
			<span class="size-2 rounded-full {STATE[state].dot}" aria-hidden="true"></span>
			{STATE[state].label}
		</span>
		{#if collapsible}
			<button
				type="button"
				class="-mr-1 inline-flex size-7 items-center justify-center rounded-full text-fg-light hover:bg-chat-surface hover:text-fg-main [&_svg]:size-3.5"
				aria-label={collapsed ? 'Show commits' : 'Hide commits'}
				aria-expanded={!collapsed}
				onclick={() => (collapsed = !collapsed)}
			>
				{#if collapsed}<Maximize2 aria-hidden="true" />{:else}<Minimize2 aria-hidden="true" />{/if}
			</button>
		{/if}
	</header>

	{#if !collapsed}
		<div class="relative px-4" style="--row:{ROW}px">
			<svg
				class="pointer-events-none absolute top-0 left-4 overflow-visible"
				width={graphW}
				height={(commits.length + 1) * ROW}
				aria-hidden="true"
			>
				{#each paths as p (p.key)}
					<path
						d={p.d}
						fill="none"
						stroke={p.color}
						stroke-width="1.6"
						stroke-linecap="round"
						stroke-dasharray={p.dashed ? '3 3.5' : undefined}
						in:draw={{ duration: motionDuration(520), easing: cubicOut }}
					/>
				{/each}
				<!-- merge node -->
				<g transform="translate({base ? laneX.get(base.id) : X0},{y(0)})">
					{#if state === 'merged' || mergeState === 'merged'}
						<circle r="6" fill="var(--ak-chart-3)" />
					{:else}
						<circle r="5.5" fill="var(--ak-color-surface)" stroke="var(--ak-color-fg-muted)" stroke-width="1.4" stroke-dasharray="2.2 2.2">
							{#if mergeState === 'checking'}
								<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="2.4s" repeatCount="indefinite" />
							{/if}
						</circle>
					{/if}
				</g>
				{#each commits as c, i (c.sha)}
					<circle
						cx={laneX.get(c.lane) ?? X0}
						cy={y(i + 1)}
						r={lanes.find((l) => l.id === c.lane)?.base ? 4 : 4.5}
						fill={laneColor.get(c.lane) ?? BASE_COLOR}
						stroke="var(--ak-color-surface)"
						stroke-width="2"
					/>
				{/each}
			</svg>

			<ul class="relative" style="padding-left:{graphW + 12}px">
				<li class="flex h-[var(--row)] items-center gap-3">
					<span class="min-w-0 flex-1 truncate text-fg-main">Merge into <span class="text-fg-light">{baseBranch}</span></span>
					<span
						class={cn(
							'text-[13px]',
							mergeState === 'conflict' ? 'text-status-danger' : mergeState === 'merged' ? 'text-[var(--ak-chart-3)]' : 'text-fg-light'
						)}
					>
						{MERGE_TEXT[mergeState]}
					</span>
				</li>
				{#each commits as c, i (c.sha)}
					{@const chip = chipFor.get(c.sha)}
					{@const isBase = lanes.find((l) => l.id === c.lane)?.base}
					<li in:rise={{ y: 4, duration: 220, delay: 40 + i * 45 }}>
						{#if onSelectCommit}
							<button type="button" class="-mx-2 flex h-[var(--row)] w-[calc(100%+1rem)] items-center gap-3 rounded-[8px] px-2 text-left hover:bg-chat-surface" onclick={() => onSelectCommit(c)}>
								{@render row(c, chip, isBase)}
							</button>
						{:else}
							<div class="flex h-[var(--row)] items-center gap-3">{@render row(c, chip, isBase)}</div>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if footer}
		<footer class="flex items-center gap-2.5 px-4 pt-1.5 pb-3.5 text-[13px]" aria-live="polite">
			<span class="inline-flex size-4 items-center justify-center [&_svg]:size-4">
				{#if footer.tone === 'success'}
					<Check aria-hidden="true" class="text-status-success" />
				{:else if footer.tone === 'danger'}
					<X aria-hidden="true" class="text-status-danger" />
				{:else if footer.tone === 'neutral'}
					{#if state === 'merged'}<GitMerge aria-hidden="true" class="text-[var(--ak-chart-3)]" />{:else}<TriangleAlert aria-hidden="true" class="text-fg-light" />{/if}
				{:else}
					<LoaderCircle aria-hidden="true" class="animate-spin text-fg-light" />
				{/if}
			</span>
			<span class={cn(footer.tone === 'danger' ? 'text-status-danger' : 'text-fg-light')}>{footer.label}</span>
		</footer>
	{/if}
</section>

{#snippet row(c: PrGraphCommit, chip: string | undefined, isBase: boolean | undefined)}
							<span class={cn('min-w-0 truncate', isBase || c.lane !== headId ? 'text-fg-light' : 'text-fg-main')}>{c.message}</span>
							{#if chip}
								<span
									class="shrink-0 rounded-[6px] px-1.5 py-0.5 font-mono text-[11.5px]"
									style="color:{isBase ? 'var(--ak-color-fg-muted)' : laneColor.get(c.lane)};background:color-mix(in oklch, {isBase
										? 'var(--ak-color-fg-muted)'
										: laneColor.get(c.lane)} 11%, transparent)"
								>
									{chip}
								</span>
							{/if}
							<span class="ml-auto flex shrink-0 items-center gap-2 pl-2 text-[13px] text-fg-light">
								<span class="font-mono text-xs">{c.sha.slice(0, 6)}</span>
								<span class="hidden sm:inline">{c.author} · {c.age}</span>
							</span>
{/snippet}
