<script lang="ts">
	import { cn } from '../ui/cn';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicInOut, cubicOut } from 'svelte/easing';
	import { draw } from 'svelte/transition';
	import { SvelteSet } from 'svelte/reactivity';
	import { Bot, Check, ChevronLeft, ChevronRight, Flag, GitPullRequest, Minus, Plus, Siren, SquareKanban, Tag, X } from '@lucide/svelte';
	import { motionDuration, rise } from '../state/motion.svelte';
	import Button from '../primitives/actions/Button.svelte';
	import ButtonGroup from '../primitives/actions/ButtonGroup.svelte';
	import IconButton from '../primitives/actions/IconButton.svelte';
	import { layoutLineage, traceLineage } from './lineage';
	import { fitView, openingView, placeLineage, reveal, zoomAt, type Size, type View } from './viewport';
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
		/**
		 * Draws each node yourself, e.g. a compact `CardFace`, and makes the graph a canvas: drag to pan, the
		 * wheel, a pinch and the buttons zoom, and a line that skips a level goes round the nodes between. It
		 * is told whether the graph stands upright. Your node holds its own press, so `onSelectNode` is not
		 * called and no fold handle is drawn; the trace follows `selected` while nothing is hovered.
		 */
		node?: Snippet<[node: LineageNode, upright: boolean]>;
		/** With `node`: a node's size in px, on its side and upright. */
		nodeSize?: { across: Size; down: Size };
		/** With `node`: levels left to right (`across`), top to bottom (`down`), or `auto`, down where the box is narrower than 40rem. */
		direction?: 'auto' | 'across' | 'down';
		/** With `node`: a label over each level, from the first, while the graph lies on its side. */
		levels?: string[];
		/** With `node`: your key, in the foot beside the zoom buttons. */
		legend?: Snippet;
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
		node: custom,
		nodeSize = { across: { w: 140, h: 84 }, down: { w: 106, h: 62 } },
		direction = 'auto',
		levels = [],
		legend,
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
	let upright = $derived(direction === 'down' || (direction === 'auto' && width < 640));
	let size = $derived(custom ? nodeSize[upright ? 'down' : 'across'] : { w: NODE_W, h: NODE_H });
	/** With `node`, the graph is a canvas, and this says where its nodes and lines are drawn. */
	let canvas = $derived(custom ? placeLineage(layout, edges, size, upright) : null);
	let innerW = $derived(canvas ? canvas.world.w : PAD * 2 + NODE_W + colW * Math.max(0, layout.cols - 1));
	let hasBacklinks = $derived(edges.some((e) => e.backlink));
	/** Backlinks are drawn but are not lineage: they neither fold nor trace. */
	let forwardEdges = $derived(edges.filter((e) => !e.backlink));
	let height = $derived(canvas ? canvas.world.h : PAD * 2 + layout.rows * ROW_H - (ROW_H - NODE_H) + (hasBacklinks ? 36 : 0));

	type Pos = { x: number; y: number; o: number };
	function target(): Record<string, Pos> {
		const out: Record<string, Pos> = {};
		for (const n of nodes) {
			const s = layout.slots.get(n.id);
			if (!s) continue;
			out[n.id] = { ...(canvas ? canvas.at(s) : { x: PAD + s.col * colW, y: PAD + s.row * ROW_H }), o: s.visible ? 1 : 0 };
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
	/** A canvas folds nothing, so its nodes stand where they belong from the first frame, the server's too. */
	let at = $derived(canvas ? target() : pos.current);

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

	let traced = $derived(hovered ?? (custom ? selected : null));
	let trace = $derived(traced ? traceLineage(traced, forwardEdges) : null);

	function nodeOpacity(id: string): number {
		const o = at[id]?.o ?? 0;
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
			const a = at[edge.from];
			const b = at[edge.to];
			if (!a || !b) return [];
			const key = `${edge.from}→${edge.to}`;
			if (canvas) return [{ key, edge, d: canvas.path(edge), mx: (a.x + b.x + size.w) / 2, my: (a.y + b.y + size.h) / 2, o: Math.min(a.o, b.o) }];
			if (edge.backlink) {
				// Loop under the graph, from the bottom of one node to the bottom of the other.
				const x1 = a.x + NODE_W / 2;
				const x2 = b.x + NODE_W / 2;
				const y1 = a.y + NODE_H;
				const y2 = b.y + NODE_H;
				const floor = PAD + layout.rows * ROW_H - (ROW_H - NODE_H) + 26;
				const d = `M${x1},${y1} C${x1},${floor} ${x2},${floor} ${x2},${y2}`;
				return [{ key, edge, d, mx: (x1 + x2) / 2, my: floor - 6, o: Math.min(a.o, b.o) }];
			}
			const x1 = a.x + NODE_W;
			const y1 = a.y + NODE_H / 2;
			const x2 = b.x;
			const y2 = b.y + NODE_H / 2;
			const dx = Math.max(24, (x2 - x1) / 2);
			const d = `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
			return [{ key, edge, d, mx: (x1 + x2) / 2, my: (y1 + y2) / 2, o: Math.min(a.o, b.o) }];
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

	// The canvas's view. It opens on the whole graph fitted to the width, at 0.7 at least, centred on the
	// node that runs; the box keeps that height whatever the zoom. Where he moves it outlives a redraw.
	let pane = $state<HTMLDivElement>();
	let pad = $derived(upright ? 4 : 12);
	let opening = $derived.by(() => {
		if (!canvas) return { k: 1, x: 0, y: 0, h: 0 };
		const p = canvas.at(layout.slots.get((nodes.find((n) => n.status === 'running') ?? nodes[0])?.id ?? '') ?? { col: 0, row: 0 });
		return openingView(canvas.world, width, { x: p.x + size.w / 2, y: p.y + size.h / 2 }, upright ? [0, Infinity] : [300, 560], pad);
	});
	let moved = $state<(View & { upright: boolean }) | null>(null);
	let view = $derived(moved?.upright === upright ? moved : opening);
	let glide = $state(false);
	let box = $derived({ w: width, h: opening.h });
	function show(next: View, smooth = false): void {
		moved = { ...next, upright };
		glide = smooth;
	}
	const fit = (): View => fitView(canvas?.world ?? box, box, pad);
	const zoom = (by: number): void => show(zoomAt(view, box.w / 2, box.h / 2, by, fit().k), true);

	// A mouse drags the graph; one finger is the page's, two pinch and move it.
	const pointers = new Map<number, [number, number]>();
	let travel = 0;
	function spot(e: MouseEvent): [number, number] {
		const r = (pane as HTMLDivElement).getBoundingClientRect();
		return [e.clientX - r.left, e.clientY - r.top];
	}
	function press(e: PointerEvent): void {
		pointers.set(e.pointerId, spot(e));
		travel = pointers.size > 1 ? 9 : 0;
	}
	function drag(e: PointerEvent): void {
		const was = pointers.get(e.pointerId);
		if (!was || (e.pointerType === 'mouse' && !e.buttons && lift(e))) return;
		const now = spot(e);
		pointers.set(e.pointerId, now);
		const [dx, dy] = [now[0] - was[0], now[1] - was[1]];
		const other = [...pointers].find(([id]) => id !== e.pointerId)?.[1];
		if (other) {
			const by = Math.hypot(now[0] - other[0], now[1] - other[1]) / (Math.hypot(was[0] - other[0], was[1] - other[1]) || 1);
			const next = zoomAt(view, (now[0] + other[0]) / 2, (now[1] + other[1]) / 2, by, fit().k);
			show({ ...next, x: next.x + dx / 2, y: next.y + dy / 2 });
		} else if (e.pointerType !== 'touch' && (travel += Math.abs(dx) + Math.abs(dy)) > 4) {
			pane?.setPointerCapture(e.pointerId);
			show({ ...view, x: view.x + dx, y: view.y + dy });
		}
	}
	const lift = (e: PointerEvent): boolean => pointers.delete(e.pointerId);
	/** A drag of more than 4px is a pan, and opens nothing, wherever it began. */
	function swallow(e: MouseEvent): void {
		const dragged = travel > 4;
		travel = 0;
		if (!dragged) return;
		e.stopPropagation();
		e.preventDefault();
	}
	/** The wheel zooms about the pointer; at either end of the zoom it is the page's again. A trackpad's pinch (ctrl) never zooms the page. */
	function wheel(e: WheelEvent): void {
		const next = zoomAt(view, ...spot(e), Math.exp(-e.deltaY * 0.0022), fit().k);
		if (Math.abs(next.k - view.k) < 1e-4 && !e.ctrlKey) return;
		e.preventDefault();
		show(next);
	}
	const STEP: Record<string, [number, number]> = { ArrowLeft: [48, 0], ArrowRight: [-48, 0], ArrowUp: [0, 48], ArrowDown: [0, -48] };
	function key(e: KeyboardEvent): void {
		if (e.ctrlKey || e.metaKey || e.altKey) return;
		const step = STEP[e.key];
		if (step) show({ ...view, x: view.x + step[0], y: view.y + step[1] }, true);
		else if (e.key === '+' || e.key === '=') zoom(1.25);
		else if (e.key === '-') zoom(0.8);
		else if (e.key === '0') show(fit(), true);
		else return;
		e.preventDefault();
	}
	/** Keyboard focus pans a node that is off the canvas into it. */
	function focusNode(node: LineageNode, e: FocusEvent): void {
		setHover(node);
		const p = at[node.id];
		if (canvas && p && (e.target as Element).matches(':focus-visible')) show(reveal(view, { ...p, ...size }, box, pad), true);
	}

	const LINE: Record<string, string> = { live: 'stroke-accent-primary/40', stopped: 'stroke-status-warning', longest: 'stroke-fg-main' };
</script>

<div {...rest} class={cn('rounded-card border border-card-border bg-card-bg p-4 ak-shadow-btn', className)}>
	{#if title}
		<header class="mb-3 flex items-center justify-between gap-3">
			<h3 class="text-sm font-semibold text-fg-main">{title}</h3>
			<p class="text-[11px] text-fg-light">{custom ? 'Drag to move · the wheel zooms · press a node to open it' : 'Hover to trace · click a node to open it'}</p>
		</header>
	{/if}

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={pane}
		bind:clientWidth={width}
		class={canvas ? 'relative cursor-grab touch-pan-y overflow-clip rounded-control border border-card-border bg-canvas-secondary select-none active:cursor-grabbing' : 'overflow-x-auto'}
		style:height={canvas ? `${opening.h + 2}px` : undefined}
		onpointerdown={canvas ? press : undefined}
		onpointermove={canvas ? drag : undefined}
		onpointerup={canvas ? lift : undefined}
		onpointercancel={canvas ? lift : undefined}
		onclickcapture={canvas ? swallow : undefined}
		onwheel={canvas ? wheel : undefined}
		onkeydown={canvas ? key : undefined}
	>
		<div
			class={!canvas ? 'relative' : glide ? 'relative origin-top-left motion-safe:transition-transform motion-safe:duration-200' : 'relative origin-top-left'}
			style:width="{innerW}px"
			style:height="{height}px"
			style:transform={canvas ? `translate(${view.x}px, ${view.y}px) scale(${view.k})` : undefined}
		>
			<svg width={innerW} {height} class="absolute inset-0 overflow-visible" aria-hidden="true">
				{#each paths as p (p.key)}
					{@const lit = trace?.edges.has(p.key) ?? false}
					<path
						d={p.d}
						fill="none"
						class={cn(
							'transition-[stroke,opacity] duration-200',
							lit ? 'stroke-fg-main' : (LINE[p.edge.route ?? ''] ?? 'stroke-card-border'),
							(p.edge.rel === 'supersedes' || p.edge.backlink || p.edge.met === false) && 'ak-lineage-dashed'
						)}
						stroke-width={p.edge.route === 'longest' ? 2 : lit || p.edge.route ? 1.75 : 1.25}
						style:opacity={trace && !lit ? p.o * 0.35 : p.o}
						in:draw={{ duration: motionDuration(480), delay: motionDuration(120 + colOf(p.edge.from) * 110), easing: cubicOut }}
					/>
					{#if custom ? p.edge.route === 'live' : lit}
						<path d={p.d} fill="none" class="ak-lineage-flow stroke-accent-primary" stroke-width="1.75" style:opacity={p.o} />
					{/if}
				{/each}
				{#if canvas && !upright}
					{#each levels as label, col (col)}
						<text x={canvas.at({ col, row: 0 }).x} y="10" class="fill-fg-light text-[10.5px] font-semibold tracking-wide uppercase">{label}</text>
					{/each}
				{/if}
			</svg>

			{#each paths as p (p.key)}
				{#if p.edge.rel && trace?.edges.has(p.key) && p.o > 0.5}
					<span
						class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-card-border bg-card-bg px-1.5 py-px font-mono text-[9px] text-fg-light shadow-soft-sm"
						style:left="{p.mx}px"
						style:top="{p.my}px"
						in:rise={{ y: 3, duration: 140 }}
					>{p.edge.rel}</span>
				{/if}
			{/each}

			{#each nodes as node (node.id)}
				{@const p = at[node.id]}
				{@const k = KIND[node.kind]}
				{@const Icon = k.icon}
				{@const visible = layout.slots.get(node.id)?.visible ?? false}
				{@const kids = childCount.get(node.id) ?? 0}
				{@const isCollapsed = collapsed.has(node.id)}
				{#if p}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="absolute"
						style:left="{p.x}px"
						style:top="{p.y}px"
						style:width="{size.w}px"
						style:height="{size.h}px"
						style:opacity={nodeOpacity(node.id)}
						style:pointer-events={visible ? 'auto' : 'none'}
						inert={!visible}
						style:z-index={hovered === node.id ? 5 : 2}
						in:rise={{ y: 6, duration: 240, delay: 60 + colOf(node.id) * 110 }}
						onpointerenter={() => setHover(node)}
						onpointerleave={() => setHover(null)}
						onfocusin={(e) => focusNode(node, e)}
						onfocusout={() => setHover(null)}
					>
						{#if custom}
							{@render custom(node, upright)}
						{:else}
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
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	</div>

	{#if canvas}
		<div class="mt-3 flex flex-wrap items-center gap-3">
			{@render legend?.()}
			<ButtonGroup aria-label="Zoom" class="ml-auto">
				<IconButton aria-label="Zoom out" size="icon-sm" onclick={() => zoom(0.8)}><Minus aria-hidden="true" /></IconButton>
				<Button size="sm" aria-label="Fit the whole graph" onclick={() => show(fit(), true)}>Fit</Button>
				<IconButton aria-label="Zoom in" size="icon-sm" onclick={() => zoom(1.25)}><Plus aria-hidden="true" /></IconButton>
			</ButtonGroup>
		</div>
	{:else}
		<ul class="mt-3 flex flex-wrap gap-3 text-[11px] text-fg-light" aria-label="Node kinds">
			{#each kindsShown as kind (kind)}
				{@const k = KIND[kind]}
				<li class="flex items-center gap-1.5"><span class="size-2 rounded-full" style:background={k.color}></span>{k.label}</li>
			{/each}
		</ul>
	{/if}
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
