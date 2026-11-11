<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicInOut, cubicOut } from 'svelte/easing';
	import { draw } from 'svelte/transition';
	import { SvelteSet } from 'svelte/reactivity';
	import { Bot, Check, ChevronLeft, ChevronRight, Flag, GitPullRequest, Siren, SquareKanban, Tag, X } from '@lucide/svelte';
	import { motionDuration, rise } from '../state/motion.svelte';
	import { layoutLineage, traceLineage } from './lineage';
	import type { LineageEdge, LineageNode, LineageNodeKind, LineageStatus } from './types';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		/** The Feature and everything it turned into. */
		nodes: LineageNode[];
		/** How each node led to the next. */
		edges: LineageEdge[];
		title?: string;
		/** Node to show as selected, e.g. the one whose detail panel is open. */
		selected?: string | null;
		/** Node ids whose descendants start folded away. */
		defaultCollapsed?: string[];
		/** Called when the person clicks a node or presses Enter on it. */
		onSelectNode?: (node: LineageNode) => void;
		/** Called with the node the person hovers or focuses, and `null` when they leave. */
		onHoverNode?: (node: LineageNode | null) => void;
		class?: string;
	}

	let {
		nodes,
		edges,
		title,
		selected = null,
		defaultCollapsed = [],
		onSelectNode,
		onHoverNode,
		class: className = '',
		...rest
	}: Props = $props();

	const NODE_W = 172;
	const NODE_H = 52;
	const ROW_H = 68;
	const PAD = 8;

	const KIND: Record<LineageNodeKind, { icon: typeof Flag; color: string; label: string }> = {
		feature: { icon: Flag, color: 'var(--ak-color-accent)', label: 'Feature' },
		card: { icon: SquareKanban, color: 'var(--ak-chart-1)', label: 'Card' },
		attempt: { icon: Bot, color: 'var(--ak-chart-2)', label: 'Attempt' },
		pr: { icon: GitPullRequest, color: 'var(--ak-chart-3)', label: 'Pull request' },
		release: { icon: Tag, color: 'var(--ak-chart-4)', label: 'Release' },
		incident: { icon: Siren, color: 'var(--ak-color-danger)', label: 'Incident' }
	};

	let width = $state(960);
	let hovered = $state<string | null>(null);
	let collapsed = new SvelteSet<string>();
	let seeded = false;
	$effect.pre(() => {
		if (seeded) return;
		seeded = true;
		for (const id of defaultCollapsed) collapsed.add(id);
	});

	let layout = $derived(layoutLineage(nodes, edges, collapsed));
	let colW = $derived(Math.max(NODE_W + 24, (width - NODE_W - PAD * 2) / Math.max(1, layout.cols - 1)));
	let innerW = $derived(PAD * 2 + NODE_W + colW * Math.max(0, layout.cols - 1));
	let hasBacklinks = $derived(edges.some((e) => e.backlink));
	/** Backlinks are drawn but are not lineage: they neither fold nor trace. */
	let forwardEdges = $derived(edges.filter((e) => !e.backlink));
	let height = $derived(PAD * 2 + layout.rows * ROW_H - (ROW_H - NODE_H) + (hasBacklinks ? 36 : 0));

	type Pos = { x: number; y: number; o: number };
	function target(): Record<string, Pos> {
		const out: Record<string, Pos> = {};
		for (const n of nodes) {
			const s = layout.slots.get(n.id);
			if (!s) continue;
			out[n.id] = { x: PAD + s.col * colW, y: PAD + s.row * ROW_H, o: s.visible ? 1 : 0 };
		}
		return out;
	}

	const pos = new Tween<Record<string, Pos>>({}, { duration: 420, easing: cubicInOut });
	let keys = '';
	$effect(() => {
		const next = target();
		const nextKeys = Object.keys(next).sort().join('|');
		const instant = nextKeys !== keys || prefersReducedMotion.current;
		keys = nextKeys;
		void pos.set(next, { duration: instant ? 0 : 420 });
	});

	let childCount = $derived.by(() => {
		const known = new Set(nodes.map((n) => n.id));
		const map = new Map<string, number>();
		for (const e of forwardEdges) if (known.has(e.to) && e.from !== e.to) map.set(e.from, (map.get(e.from) ?? 0) + 1);
		return map;
	});
	/** How many nodes are folded into `id`. */
	function hiddenCount(id: string): number {
		let n = 0;
		for (const slot of layout.slots.values()) if (slot.anchor === id) n++;
		return n;
	}

	let trace = $derived(hovered ? traceLineage(hovered, forwardEdges) : null);

	function nodeOpacity(id: string): number {
		const o = pos.current[id]?.o ?? 0;
		if (!trace) return o;
		return trace.nodes.has(id) ? o : o * 0.28;
	}

	interface EdgePath {
		key: string;
		edge: LineageEdge;
		d: string;
		mx: number;
		my: number;
		o: number;
	}
	let paths = $derived.by(() =>
		edges.flatMap((edge): EdgePath[] => {
			const a = pos.current[edge.from];
			const b = pos.current[edge.to];
			if (!a || !b) return [];
			if (edge.backlink) {
				// Loop under the graph, from the bottom of one node to the bottom of the other.
				const x1 = a.x + NODE_W / 2;
				const x2 = b.x + NODE_W / 2;
				const y1 = a.y + NODE_H;
				const y2 = b.y + NODE_H;
				const floor = PAD + layout.rows * ROW_H - (ROW_H - NODE_H) + 26;
				const d = `M${x1},${y1} C${x1},${floor} ${x2},${floor} ${x2},${y2}`;
				return [{ key: `${edge.from}→${edge.to}`, edge, d, mx: (x1 + x2) / 2, my: floor - 6, o: Math.min(a.o, b.o) }];
			}
			const x1 = a.x + NODE_W;
			const y1 = a.y + NODE_H / 2;
			const x2 = b.x;
			const y2 = b.y + NODE_H / 2;
			const dx = Math.max(24, (x2 - x1) / 2);
			const d = `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
			return [{ key: `${edge.from}→${edge.to}`, edge, d, mx: (x1 + x2) / 2, my: (y1 + y2) / 2, o: Math.min(a.o, b.o) }];
		})
	);

	function setHover(node: LineageNode | null): void {
		hovered = node?.id ?? null;
		onHoverNode?.(node);
	}
	function toggle(id: string): void {
		if (collapsed.has(id)) collapsed.delete(id);
		else collapsed.add(id);
		if (hovered && !layout.slots.get(hovered)?.visible) hovered = null;
	}

	function statusTone(status?: LineageStatus): string {
		switch (status) {
			case 'done':
			case 'merged':
			case 'shipped':
			case 'resolved':
				return 'text-status-success';
			case 'failed':
				return 'text-status-danger';
			case 'running':
			case 'open':
				return 'text-accent-primary';
			default:
				return 'text-fg-light';
		}
	}
	function statusText(status?: LineageStatus): string {
		return status ? status[0].toUpperCase() + status.slice(1) : '';
	}

	let kindsShown = $derived([...new Set(nodes.map((n) => n.kind))]);
	let colOf = (id: string): number => layout.slots.get(id)?.col ?? 0;
</script>

<div {...rest} class={cn('rounded-card border border-card-border bg-card-bg p-4 ak-shadow-btn', className)}>
	{#if title}
		<header class="mb-3 flex items-center justify-between gap-3">
			<h3 class="text-sm font-semibold text-fg-main">{title}</h3>
			<p class="text-[11px] text-fg-light">Hover to trace · click a node to open it</p>
		</header>
	{/if}

	<div class="overflow-x-auto" bind:clientWidth={width}>
		<div class="relative" style:width="{innerW}px" style:height="{height}px">
			<svg width={innerW} {height} class="absolute inset-0 overflow-visible" aria-hidden="true">
				{#each paths as p (p.key)}
					{@const lit = trace?.edges.has(p.key) ?? false}
					<path
						d={p.d}
						fill="none"
						class={cn('transition-[stroke,opacity] duration-200', lit ? 'stroke-fg-main' : 'stroke-card-border', (p.edge.rel === 'supersedes' || p.edge.backlink) && 'ak-lineage-dashed')}
						stroke-width={lit ? 1.75 : 1.25}
						style:opacity={trace && !lit ? p.o * 0.35 : p.o}
						in:draw={{ duration: motionDuration(480), delay: motionDuration(120 + colOf(p.edge.from) * 110), easing: cubicOut }}
					/>
					{#if lit}
						<path d={p.d} fill="none" class="ak-lineage-flow stroke-accent-primary" stroke-width="1.75" style:opacity={p.o} />
					{/if}
				{/each}
			</svg>

			{#each paths as p (p.key)}
				{#if trace?.edges.has(p.key) && p.o > 0.5}
					<span
						class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-card-border bg-card-bg px-1.5 py-px font-mono text-[9px] text-fg-light shadow-soft-sm"
						style:left="{p.mx}px"
						style:top="{p.my}px"
						in:rise={{ y: 3, duration: 140 }}
					>{p.edge.rel}</span>
				{/if}
			{/each}

			{#each nodes as node (node.id)}
				{@const p = pos.current[node.id]}
				{@const k = KIND[node.kind]}
				{@const Icon = k.icon}
				{@const visible = layout.slots.get(node.id)?.visible ?? false}
				{@const kids = childCount.get(node.id) ?? 0}
				{@const isCollapsed = collapsed.has(node.id)}
				{#if p}
					<div
						class="absolute"
						style:left="{p.x}px"
						style:top="{p.y}px"
						style:width="{NODE_W}px"
						style:height="{NODE_H}px"
						style:opacity={nodeOpacity(node.id)}
						style:pointer-events={visible ? 'auto' : 'none'}
						inert={!visible}
						style:z-index={hovered === node.id ? 5 : 2}
						in:rise={{ y: 6, duration: 240, delay: 60 + colOf(node.id) * 110 }}
					>
						<button
							type="button"
							tabindex={visible ? 0 : -1}
							aria-label="{k.label}: {node.label}{node.detail ? `, ${node.detail}` : ''}{node.status ? `, ${node.status}` : ''}"
							class={cn(
								'group flex size-full items-center gap-2.5 rounded-control border bg-card-bg px-2.5 text-left shadow-soft-sm outline-none transition-[transform,box-shadow,border-color] duration-200',
								onSelectNode ? 'cursor-pointer hover:-translate-y-px hover:shadow-soft' : 'cursor-default',
								selected === node.id ? 'border-fg-main ring-2 ring-accent-primary/30' : hovered === node.id ? 'border-fg-light/60' : 'border-card-border',
								node.status === 'superseded' && 'border-dashed opacity-70',
								'focus-visible:ring-2 focus-visible:ring-accent-primary/50'
							)}
							onpointerenter={() => setHover(node)}
							onpointerleave={() => setHover(null)}
							onfocus={() => setHover(node)}
							onblur={() => setHover(null)}
							onclick={() => onSelectNode?.(node)}
						>
							<span
								class="grid size-7 shrink-0 place-items-center rounded-full text-white transition-transform duration-200 group-hover:scale-110"
								style:background={k.color}
							>
								<Icon class="size-3.5" aria-hidden="true" />
							</span>
							<span class="min-w-0 flex-1">
								<span class="block truncate text-[12px] leading-tight font-medium text-fg-main">{node.label}</span>
								<span class="mt-0.5 flex items-center gap-1.5 text-[10px] leading-tight">
									{#if node.detail}<span class="truncate font-mono text-fg-light">{node.detail}</span>{/if}
									{#if node.status}
										<span class={cn('ml-auto flex shrink-0 items-center gap-0.5 font-medium', statusTone(node.status))}>
											{#if node.status === 'running' || node.status === 'open'}
												<span class="size-1.5 animate-pulse rounded-full bg-current"></span>
											{:else if node.status === 'failed'}
												<X class="size-2.5" aria-hidden="true" />
											{:else if statusTone(node.status) === 'text-status-success'}
												<Check class="size-2.5" aria-hidden="true" />
											{/if}
											{statusText(node.status)}
										</span>
									{/if}
								</span>
							</span>
						</button>
						{#if kids > 0 && node.kind !== 'feature'}
							<button
								type="button"
								tabindex={visible ? 0 : -1}
								aria-label={isCollapsed ? `Show what ${node.label} led to` : `Fold away what ${node.label} led to`}
								aria-expanded={!isCollapsed}
								class={cn(
									'absolute top-1/2 -right-2.5 grid h-5 min-w-5 -translate-y-1/2 place-items-center rounded-full border border-card-border bg-card-bg px-1 font-mono text-[9px] text-fg-light shadow-soft-sm transition-[opacity,transform,color] duration-200 hover:scale-110 hover:text-fg-main focus-visible:opacity-100',
									isCollapsed || hovered === node.id ? 'opacity-100' : 'opacity-0'
								)}
								onclick={() => toggle(node.id)}
							>
								{#if isCollapsed}
									<span class="flex items-center">+{hiddenCount(node.id)}<ChevronRight class="size-2.5" aria-hidden="true" /></span>
								{:else}
									<ChevronLeft class="size-3" aria-hidden="true" />
								{/if}
							</button>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	</div>

	<ul class="mt-3 flex flex-wrap gap-3 text-[11px] text-fg-light" aria-label="Node kinds">
		{#each kindsShown as kind (kind)}
			{@const k = KIND[kind]}
			<li class="flex items-center gap-1.5"><span class="size-2 rounded-full" style:background={k.color}></span>{k.label}</li>
		{/each}
	</ul>
</div>

<style>
	.ak-lineage-flow {
		stroke-dasharray: 3 9;
		animation: ak-lineage-flow 0.9s linear infinite;
	}
	:global(.ak-lineage-dashed) {
		stroke-dasharray: 4 4;
	}
	@keyframes ak-lineage-flow {
		to {
			stroke-dashoffset: -12;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.ak-lineage-flow {
			animation: none;
		}
	}
</style>
