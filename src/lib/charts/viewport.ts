/**
 * The arithmetic of `FeatureLineage`'s canvas. A view is a zoom `k` and a pan `x`, `y` in px: a point
 * of the world at `p` is drawn at `p * k + x`.
 */
import type { LineageEdge } from './types';
import type { LineageLayout, LineageSlot } from './lineage';

export interface View {
	k: number;
	x: number;
	y: number;
}
export interface Size {
	w: number;
	h: number;
}
type Point = { x: number; y: number };

/** The closest a canvas zooms: one and a half times a node's own size. */
export const ZOOM_MOST = 1.5;
/** The farthest out a canvas opens: a node still reads at 0.7 of its size. */
export const ZOOM_FLOOR = 0.7;

/**
 * The opening view: the world fitted to the box's width, never over its own size and never under the
 * floor, where it is centred on `on`, a point of the world. The box is as tall as the world then is,
 * between `least` and `most`.
 */
export function openingView(world: Size, width: number, on: Point, [least, most]: [number, number] = [0, Infinity], pad = 12): View & { h: number } {
	const k = Math.max(ZOOM_FLOOR, Math.min(1, (width - pad * 2) / world.w));
	const h = Math.min(most, Math.max(least, Math.ceil(world.h * k + pad * 2)));
	const within = (free: number, size: number, centre: number) => (size <= free ? pad + (free - size) / 2 : Math.min(pad, Math.max(pad + free - size, pad + free / 2 - centre)));
	return { k, h, x: within(width - pad * 2, world.w * k, on.x * k), y: within(h - pad * 2, world.h * k, on.y * k) };
}

/** Fit: the whole world in the box, centred, never over its own size. */
export function fitView(world: Size, box: Size, pad = 12): View {
	const k = Math.min(1, (box.w - pad * 2) / world.w, (box.h - pad * 2) / world.h);
	return { k, x: (box.w - world.w * k) / 2, y: (box.h - world.h * k) / 2 };
}

/**
 * Zoom by `by` about a point of the box, so what is under it stays under it. No further out than
 * `least` (the whole world) and no closer than `ZOOM_MOST`: at either end the view comes back as it was,
 * which is how a wheel gives the page its scroll back.
 */
export function zoomAt(view: View, px: number, py: number, by: number, least: number): View {
	const k = Math.min(ZOOM_MOST, Math.max(Math.min(least, view.k), view.k * by));
	return { k, x: px - ((px - view.x) * k) / view.k, y: py - ((py - view.y) * k) / view.k };
}

/** Pan as little as brings a rectangle of the world into the box; one already in it stays where it is. */
export function reveal(view: View, rect: Point & Size, box: Size, margin = 12): View {
	const [l, t, r, b] = [rect.x * view.k + view.x, rect.y * view.k + view.y, (rect.x + rect.w) * view.k + view.x, (rect.y + rect.h) * view.k + view.y];
	const by = (lo: number, hi: number, end: number) => (lo < margin ? margin - lo : hi > end - margin ? end - margin - hi : 0);
	return { ...view, x: view.x + by(l, r, box.w), y: view.y + by(t, b, box.h) };
}

/**
 * Where a canvas draws a layout with nodes of `size`: levels left to right, or top to bottom when
 * `down`, with room above the first row for the levels' labels. A line that skips a level goes round
 * the nodes between, along the gap beside its own row, in a lane of its own.
 */
export function placeLineage(layout: LineageLayout, edges: LineageEdge[], size: Size, down: boolean) {
	const [gap, beside, top] = down ? [34, 10, 2] : [40, 22, 22];
	const at = (s: Pick<LineageSlot, 'col' | 'row'>): Point =>
		down ? { x: s.row * (size.w + beside), y: top + s.col * (size.h + gap) } : { x: s.col * (size.w + gap), y: top + s.row * (size.h + beside) };
	const world: Size = down
		? { w: layout.rows * (size.w + beside), h: top + layout.cols * (size.h + gap) - gap }
		: { w: layout.cols * (size.w + gap) - gap, h: top + layout.rows * (size.h + beside) - beside + 16 };
	const slot = (id: string) => layout.slots.get(id) ?? { col: 0, row: 0 };
	// ponytail: lanes 5px apart fit three lines a row in the gap; a fourth would touch the nodes.
	const far = edges.filter((e) => slot(e.to).col - slot(e.from).col > 1);
	const lane = (e: LineageEdge) => {
		const mates = far.filter((m) => slot(m.from).row === slot(e.from).row);
		return (mates.indexOf(e) - (mates.length - 1) / 2) * 5;
	};
	function path(e: LineageEdge): string {
		const [a, b] = [at(slot(e.from)), at(slot(e.to))];
		const round = far.includes(e);
		if (!down) {
			const [x1, y1, x2, y2] = [a.x + size.w, a.y + size.h / 2, b.x, b.y + size.h / 2];
			if (!round) return `M${x1},${y1} C${x1 + gap / 2},${y1} ${x2 - gap / 2},${y2} ${x2},${y2}`;
			const gy = a.y + size.h + beside / 2 + lane(e);
			return `M${x1},${y1} C${x1 + gap * 0.6},${y1} ${x1 + gap * 0.4},${gy} ${x1 + gap},${gy} L${x2 - gap},${gy} C${x2 - gap * 0.4},${gy} ${x2 - gap * 0.6},${y2} ${x2},${y2}`;
		}
		const [x1, y1, x2, y2] = [a.x + size.w / 2, a.y + size.h, b.x + size.w / 2, b.y];
		if (!round) return `M${x1},${y1} C${x1},${y1 + gap / 2} ${x2},${y2 - gap / 2} ${x2},${y2}`;
		const gx = a.x + size.w + beside / 2 + lane(e) * 0.7;
		return `M${x1},${y1} C${x1},${y1 + gap * 0.6} ${gx},${y1 + gap * 0.4} ${gx},${y1 + gap} L${gx},${y2 - gap} C${gx},${y2 - gap * 0.4} ${x2},${y2 - gap * 0.6} ${x2},${y2}`;
	}
	return { at, world, path };
}
