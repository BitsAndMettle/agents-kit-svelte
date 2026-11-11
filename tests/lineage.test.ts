import assert from 'node:assert/strict';
import test from 'node:test';
import { layoutLineage, traceLineage } from '../src/lib/charts/lineage.ts';
import { SAMPLE_LINEAGE_EDGES, SAMPLE_LINEAGE_NODES } from '../src/lib/fixtures/charts.ts';
import type { LineageEdge, LineageNode } from '../src/lib/charts/types.ts';

const nodes: LineageNode[] = [
	{ id: 'f', kind: 'feature', label: 'F' },
	{ id: 'c1', kind: 'card', label: 'C1' },
	{ id: 'c2', kind: 'card', label: 'C2' },
	{ id: 'a1', kind: 'attempt', label: 'A1' },
	{ id: 'p1', kind: 'pr', label: 'P1' },
	{ id: 'r1', kind: 'release', label: 'R1' }
];
const edges: LineageEdge[] = [
	{ from: 'f', to: 'c1', rel: 'spawned' },
	{ from: 'f', to: 'c2', rel: 'spawned' },
	{ from: 'c1', to: 'a1', rel: 'attempted' },
	{ from: 'a1', to: 'p1', rel: 'opened' },
	{ from: 'p1', to: 'r1', rel: 'shipped-in' },
	{ from: 'c2', to: 'r1', rel: 'shipped-in' },
	{ from: 'r1', to: 'c2', rel: 'fixed-by', backlink: true }
];

test('layoutLineage puts each node one column past its deepest parent and ignores backlinks', () => {
	const { slots, cols } = layoutLineage(nodes, edges);
	assert.equal(slots.get('f')?.col, 0);
	assert.equal(slots.get('c1')?.col, 1);
	assert.equal(slots.get('a1')?.col, 2);
	assert.equal(slots.get('r1')?.col, 4, 'release follows the longest path through the PR');
	assert.equal(cols, 5);
	for (const slot of slots.values()) assert.equal(slot.visible, true);
});

test('layoutLineage keeps rows inside a column distinct', () => {
	const { slots } = layoutLineage(SAMPLE_LINEAGE_NODES, SAMPLE_LINEAGE_EDGES);
	const seen = new Set<string>();
	for (const slot of slots.values()) {
		const key = `${slot.col}:${slot.row}`;
		assert.ok(!seen.has(key), `two nodes share ${key}`);
		seen.add(key);
	}
	assert.equal(slots.size, SAMPLE_LINEAGE_NODES.length);
});

test('layoutLineage hides descendants of a collapsed node and parks them on it', () => {
	const { slots } = layoutLineage(nodes, edges, new Set(['c1']));
	assert.equal(slots.get('c1')?.visible, true);
	assert.equal(slots.get('a1')?.visible, false);
	assert.equal(slots.get('a1')?.anchor, 'c1');
	assert.equal(slots.get('p1')?.visible, false);
	assert.equal(slots.get('r1')?.visible, true, 'still reachable through c2');
});

test('traceLineage collects ancestors and descendants of a node', () => {
	const trace = traceLineage('a1', edges.filter((e) => !e.backlink));
	assert.deepEqual([...trace.nodes].sort(), ['a1', 'c1', 'f', 'p1', 'r1']);
	assert.ok(trace.edges.has('c1→a1'));
	assert.ok(trace.edges.has('p1→r1'));
	assert.ok(!trace.edges.has('f→c2'));
});
