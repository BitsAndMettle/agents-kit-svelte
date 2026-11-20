import assert from 'node:assert/strict';
import test from 'node:test';
import { layoutLineage } from '../src/lib/charts/lineage.ts';
import { ZOOM_FLOOR, ZOOM_MOST, fitView, openingView, placeLineage, reveal, zoomAt } from '../src/lib/charts/viewport.ts';
import type { LineageEdge, LineageNode } from '../src/lib/charts/types.ts';
import { ssr } from './ssr.ts';

const { load, html, snippet } = ssr();

// a and x lead to b, b to c; a → c skips b's level, so it goes round.
const nodes: LineageNode[] = [
	{ id: 'a', kind: 'card', label: 'A', status: 'done' },
	{ id: 'x', kind: 'card', label: 'X', status: 'planned' },
	{ id: 'b', kind: 'card', label: 'B', status: 'running' },
	{ id: 'c', kind: 'card', label: 'C', status: 'planned' }
];
const edges: LineageEdge[] = [
	{ from: 'a', to: 'b', met: true, route: 'live' },
	{ from: 'x', to: 'b', met: false, route: 'stopped' },
	{ from: 'b', to: 'c', met: false, route: 'longest' },
	{ from: 'a', to: 'c', met: true }
];
const SIZE = { w: 140, h: 84 };

test('zoomAt keeps what is under the pointer under it, between the whole graph and one and a half, and changes nothing at either end', () => {
	const at = { k: 1, x: 10, y: 20 };
	const zoomed = zoomAt(at, 100, 50, 1.25, 0.5);
	assert.deepEqual([(100 - zoomed.x) / zoomed.k, (50 - zoomed.y) / zoomed.k], [(100 - at.x) / at.k, (50 - at.y) / at.k]);
	assert.deepEqual([zoomAt(at, 0, 0, 100, 0.5).k, zoomAt(at, 0, 0, 0.001, 0.5).k], [ZOOM_MOST, 0.5]);
	assert.deepEqual(zoomAt({ ...at, k: 0.5 }, 3, 4, 0.8, 0.5), { ...at, k: 0.5 });
	assert.deepEqual(zoomAt({ ...at, k: ZOOM_MOST }, 3, 4, 1.25, 0.5), { ...at, k: ZOOM_MOST });
});

test('openingView fits the width, holds the floor, centres on a point there and never passes its own edge', () => {
	// A graph 1,220 by 334 opens whole in 1,102px at 0.88, in a box 320 tall, as far out as Fit goes.
	const desk = openingView({ w: 1220, h: 334 }, 1102, { x: 430, y: 64 }, [300, 560]);
	assert.deepEqual([Math.round(desk.k * 100), desk.h, desk.x], [88, 320, 12]);
	assert.equal(fitView({ w: 1220, h: 334 }, { w: 1102, h: desk.h }).k, desk.k);
	// Upright on a phone it opens at its own size, and the box is as tall as the graph.
	const phone = openingView({ w: 348, h: 638 }, 356, { x: 53, y: 223 }, [0, Infinity], 4);
	assert.deepEqual([phone.k, phone.h, phone.x], [1, 646, 4]);
	assert.equal(fitView({ w: 348, h: 638 }, { w: 356, h: phone.h }, 4).k, 1);
	// Too wide to read whole: it opens at the floor on the point, and Fit shows the whole.
	const wide = openingView({ w: 4000, h: 304 }, 1104, { x: 2000, y: 150 }, [300, 560]);
	assert.deepEqual([wide.k, wide.x], [ZOOM_FLOOR, 1104 / 2 - 2000 * ZOOM_FLOOR]);
	assert.equal(openingView({ w: 4000, h: 304 }, 1104, { x: 0, y: 150 }, [300, 560]).x, 12);
	assert.equal(fitView({ w: 4000, h: 304 }, { w: 1104, h: 300 }).k, 0.27);
});

test('reveal pans a rectangle into the box and leaves one that is in it', () => {
	assert.deepEqual(reveal({ k: 1, x: 0, y: 0 }, { x: 500, y: 10, w: 100, h: 50 }, { w: 400, h: 300 }), { k: 1, x: -212, y: 2 });
	assert.deepEqual(reveal({ k: 1, x: 0, y: 0 }, { x: 100, y: 100, w: 100, h: 50 }, { w: 400, h: 300 }), { k: 1, x: 0, y: 0 });
});

test('placeLineage: a line that skips a level goes round the nodes it passes, on its side and upright', () => {
	const layout = layoutLineage(nodes, edges);
	for (const down of [false, true]) {
		const { at, path } = placeLineage(layout, edges, SIZE, down);
		const box = (id: string) => ({ ...at(layout.slots.get(id)!), ...SIZE });
		for (const e of edges) {
			const [from, to] = [layout.slots.get(e.from)!.col, layout.slots.get(e.to)!.col];
			const straight = path(e).match(/L(-?[\d.]+),(-?[\d.]+)/);
			assert.equal(Boolean(straight), to - from > 1, `${e.from} → ${e.to} goes round only if it skips a level`);
			if (!straight) continue;
			const along = Number(straight[down ? 1 : 2]);
			for (const n of nodes.filter((n) => layout.slots.get(n.id)!.col > from && layout.slots.get(n.id)!.col < to)) {
				const b = box(n.id);
				const [lo, hi] = down ? [b.x, b.x + b.w] : [b.y, b.y + b.h];
				assert.ok(along < lo || along > hi, `${e.from} → ${e.to} misses ${n.id} (${down ? 'upright' : 'on its side'})`);
			}
		}
	}
});

test('FeatureLineage with a node snippet: a canvas of your nodes, its routes, its levels and its zoom buttons', async () => {
	const FeatureLineage = await load('/src/lib/charts/FeatureLineage.svelte');
	const node = snippet((n: LineageNode, upright: boolean) => `<b data-node="${n.id}" data-upright="${upright}">${n.label}</b>`);
	const out = html(FeatureLineage, { nodes, edges, node, levels: ['First', 'Then', 'Last'] });

	assert.equal(out.match(/<b data-node="\w" data-upright="false">/g)?.length, 4, 'every node is yours, drawn at once, on its side');
	assert.doesNotMatch(out, /Fold away|Show what|aria-label="Card: /, 'no node or fold handle of the kit');
	assert.match(out, /role="group" aria-label="Zoom"/);
	for (const name of ['Zoom out', 'Fit the whole graph', 'Zoom in']) assert.match(out, new RegExp(`aria-label="${name}"`));
	assert.match(out, /<text [^>]*>First<\/text>/);
	assert.match(out, /transform: translate\([\d.-]+px, [\d.-]+px\) scale\([\d.]+\)/);
	assert.match(out, /cursor-grab touch-pan-y overflow-clip[^"]*" style="height: 302px;"/, 'a short graph opens in a box 300 tall');

	assert.equal(out.match(/ak-lineage-flow/g)?.length, 1, 'only the live line flows');
	assert.equal(out.match(/stroke-status-warning/g)?.length, 1);
	assert.equal(out.match(/ak-lineage-dashed/g)?.length, 2, 'a need not met is dashed');
	assert.equal(out.match(/stroke-width="2" style="opacity/g)?.length, 1, 'the longest route is heavier');

	// The trace follows `selected` while nothing is hovered: x → b → c is lit, and a is dimmed.
	const traced = html(FeatureLineage, { nodes, edges, node, selected: 'x' });
	assert.equal(traced.match(/opacity: 0\.28/g)?.length, 1);

	const upright = html(FeatureLineage, { nodes, edges, node, levels: ['First'], direction: 'down' });
	assert.equal(upright.match(/data-upright="true"/g)?.length, 4);
	assert.doesNotMatch(upright, /<text /, 'upright, the levels are not labelled');
});

test('FeatureLineage without a node snippet is the v0.16.0 graph', async () => {
	const FeatureLineage = await load('/src/lib/charts/FeatureLineage.svelte');
	const out = html(FeatureLineage, { nodes, edges, selected: 'x', title: 'F' });
	assert.match(out, /<div class="overflow-x-auto"><div class="relative" style="width: [\d.]+px; height: [\d.]+px;">/);
	assert.match(out, /Hover to trace · click a node to open it/);
	assert.match(out, /aria-label="Node kinds"/);
	assert.doesNotMatch(out, /Zoom|transform|opacity: 0\.28/);
});

test('CardFace: a mark at the end of the reference line, and the compact density', async () => {
	const CardFace = await load('/src/lib/board/CardFace.svelte');
	const marked = html(CardFace, { title: 'Keep the tokens', reference: '#71', onSelect: () => {}, mark: snippet(() => '<i>RT</i>') });
	assert.match(marked, /<div class="flex items-center justify-between gap-2"><p class="[^"]*leading-4[^"]*">#71<\/p><span class="flex h-4 shrink-0 items-center"><i>RT<\/i><\/span><\/div>/);

	const plain = html(CardFace, { title: 'Keep the tokens', reference: '#71', onSelect: () => {} });
	assert.match(plain, /<div class="min-w-0"><p class="m-0 font-mono text-\[11px\] leading-4 text-fg-light">#71<\/p>\s*<h4 class="m-0 text-sm leading-snug font-medium \[overflow-wrap:anywhere\] text-fg-main">/);
	assert.match(plain, /<article class="relative flex min-w-0 flex-col gap-1\.5 rounded-card border border-card-border bg-card-bg p-3 /);

	const compact = html(CardFace, { title: 'Keep the tokens', reference: '#71', density: 'compact' });
	assert.match(compact, /<article class="relative flex min-w-0 flex-col rounded-card border border-card-border bg-card-bg p-3 gap-0\.5 px-2\.5 py-1\.5">/);
	assert.match(compact, /<h4 class="[^"]*line-clamp-2 text-xs \[&amp;>\*\]:line-clamp-2">/);
});
