/**
 * Layout and tracing for `FeatureLineage`: columns by longest path from the roots, rows ordered
 * to keep edges short, and the ancestry and descendants of any node.
 */
import type { LineageEdge, LineageNode } from './types';

export interface LineageSlot {
	col: number;
	row: number;
	/** False when a collapsed ancestor hides the node. It then sits on that ancestor. */
	visible: boolean;
	/** The collapsed ancestor a hidden node sits on. */
	anchor?: string;
}

export interface LineageLayout {
	slots: Map<string, LineageSlot>;
	cols: number;
	rows: number;
}

/**
 * Places nodes in columns (longest path from a root) and rows (ordered by their parents' rows).
 * Nodes under a collapsed node are hidden and parked on it, so they can animate in and out.
 *
 * @param nodes - Lineage nodes.
 * @param edges - Lineage edges; cycles are ignored.
 * @param collapsed - Ids of nodes whose descendants are hidden.
 */
export function layoutLineage(nodes: LineageNode[], edges: LineageEdge[], collapsed: ReadonlySet<string> = new Set()): LineageLayout {
	const ids = new Set(nodes.map((n) => n.id));
	const parents = new Map<string, string[]>();
	const children = new Map<string, string[]>();
	for (const id of ids) {
		parents.set(id, []);
		children.set(id, []);
	}
	for (const e of edges) {
		if (!ids.has(e.from) || !ids.has(e.to) || e.from === e.to || e.backlink) continue;
		parents.get(e.to)?.push(e.from);
		children.get(e.from)?.push(e.to);
	}

	// Column = longest path from a root (memoised DFS, cycle-safe).
	const col = new Map<string, number>();
	const visiting = new Set<string>();
	const depth = (id: string): number => {
		const known = col.get(id);
		if (known !== undefined) return known;
		if (visiting.has(id)) return 0;
		visiting.add(id);
		const d = Math.max(-1, ...(parents.get(id) ?? []).map(depth)) + 1;
		visiting.delete(id);
		col.set(id, d);
		return d;
	};
	nodes.forEach((n) => depth(n.id));

	// Hidden = every parent is folded or hidden, so a node shared with an open branch stays put.
	// A hidden node is parked on the nearest folded ancestor.
	const parkedOn = new Map<string, string>();
	const byDepth = [...ids].sort((a, b) => (col.get(a) ?? 0) - (col.get(b) ?? 0));
	for (const id of byDepth) {
		const ps = parents.get(id) ?? [];
		if (!ps.length) continue;
		const blocked = ps.every((p) => collapsed.has(p) || parkedOn.has(p));
		if (!blocked) continue;
		const first = ps[0];
		parkedOn.set(id, parkedOn.get(first) ?? first);
	}

	// Rows: walk columns left to right, ordering each by the mean row of visible parents.
	const cols = Math.max(0, ...col.values()) + 1;
	const row = new Map<string, number>();
	const order = new Map(nodes.map((n, i) => [n.id, i]));
	let rows = 0;
	for (let c = 0; c < cols; c++) {
		const inCol = nodes.filter((n) => col.get(n.id) === c && !parkedOn.has(n.id)).map((n) => n.id);
		const colOrder = new Map(inCol.map((id, i) => [id, i]));
		// No placed parents: fall back to the node's place within its own column, not the whole list.
		const weight = (id: string): number => {
			const rs = (parents.get(id) ?? []).map((p) => row.get(p)).filter((r): r is number => r !== undefined);
			return rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : (colOrder.get(id) ?? 0);
		};
		inCol.sort((a, b) => weight(a) - weight(b) || (order.get(a) ?? 0) - (order.get(b) ?? 0));
		let next = 0;
		for (const id of inCol) {
			const r = Math.max(next, Math.round(weight(id)));
			row.set(id, r);
			next = r + 1;
		}
		rows = Math.max(rows, next);
	}

	const slots = new Map<string, LineageSlot>();
	for (const n of nodes) {
		const anchor = parkedOn.get(n.id);
		if (anchor) slots.set(n.id, { col: col.get(anchor) ?? 0, row: row.get(anchor) ?? 0, visible: false, anchor });
		else slots.set(n.id, { col: col.get(n.id) ?? 0, row: row.get(n.id) ?? 0, visible: true });
	}
	return { slots, cols, rows: Math.max(rows, 1) };
}

/**
 * Everything upstream and downstream of a node: the ids of the nodes and of the edges (`from→to`).
 *
 * @param id - The node to trace from.
 * @param edges - Lineage edges.
 */
export function traceLineage(id: string, edges: LineageEdge[]): { nodes: Set<string>; edges: Set<string> } {
	const nodes = new Set<string>([id]);
	const lit = new Set<string>();
	const walk = (start: string, forward: boolean): void => {
		const queue = [start];
		const seen = new Set<string>([start]);
		while (queue.length) {
			const cur = queue.shift() as string;
			for (const e of edges) {
				const [a, b] = forward ? [e.from, e.to] : [e.to, e.from];
				if (a !== cur) continue;
				lit.add(`${e.from}→${e.to}`);
				nodes.add(b);
				if (!seen.has(b)) {
					seen.add(b);
					queue.push(b);
				}
			}
		}
	};
	walk(id, true);
	walk(id, false);
	return { nodes, edges: lit };
}
