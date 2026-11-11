import assert from 'node:assert/strict';
import test from 'node:test';
import {
	availableSpace,
	computePosition,
	graceArea,
	pointInPolygon,
	pointRect,
	sideFromRects,
	toNativeCss
} from '../src/lib/headless/logic/placement.ts';

const viewport = { width: 1000, height: 800 };
const anchor = { x: 400, y: 100, width: 100, height: 30 };
const floating = { width: 200, height: 150 };

test('places below the anchor with the offset, centred by default', () => {
	const p = computePosition(anchor, floating, viewport, {});
	assert.equal(p.side, 'bottom');
	assert.equal(p.y, 134);
	assert.equal(p.x, 350);
});

test('alignment start/end lines up the physical edges', () => {
	assert.equal(computePosition(anchor, floating, viewport, { align: 'start' }).x, 400);
	assert.equal(computePosition(anchor, floating, viewport, { align: 'end' }).x, 300);
	const right = computePosition(anchor, floating, viewport, { side: 'right', align: 'start', offset: 8 });
	assert.equal(right.x, 508);
	assert.equal(right.y, 100);
});

test('flips to the opposite side when the requested side overflows', () => {
	const low = { x: 400, y: 700, width: 100, height: 30 };
	const p = computePosition(low, floating, viewport, {});
	assert.equal(p.side, 'top');
	assert.equal(p.y, 700 - 4 - 150);
});

test('keeps the roomier side when neither fits, and does not flip when flip is off', () => {
	const tall = { width: 200, height: 500 };
	const mid = { x: 400, y: 300, width: 100, height: 30 };
	assert.equal(computePosition(mid, tall, viewport, {}).side, 'bottom', 'below has 458px, above 288px');
	const low = { x: 400, y: 700, width: 100, height: 30 };
	assert.equal(computePosition(low, floating, viewport, { flip: false }).side, 'bottom');
});

test('flips horizontally for left/right sides', () => {
	const edge = { x: 900, y: 300, width: 50, height: 30 };
	assert.equal(computePosition(edge, floating, viewport, { side: 'right' }).side, 'left');
});

test('shift clamps the cross axis into the padded viewport', () => {
	const nearLeft = { x: 10, y: 100, width: 40, height: 30 };
	assert.equal(computePosition(nearLeft, floating, viewport, {}).x, 8);
	const nearRight = { x: 960, y: 100, width: 30, height: 30 };
	assert.equal(computePosition(nearRight, floating, viewport, {}).x, 1000 - 8 - 200);
	assert.equal(computePosition(nearLeft, floating, viewport, { shift: false }).x, 30 - 100);
});

test('shift never detaches the surface from the anchor', () => {
	const offscreen = { x: -150, y: 100, width: 40, height: 30 };
	const p = computePosition(offscreen, floating, viewport, {});
	assert.equal(p.x, -110, 'clamped to touch the anchor, not to the viewport padding');
});

test('available size follows the chosen side', () => {
	const p = computePosition(anchor, floating, viewport, {});
	assert.equal(p.availableHeight, 800 - 130 - 4 - 8);
	assert.equal(p.availableWidth, 1000 - 16);
	const flipped = computePosition({ x: 400, y: 700, width: 100, height: 30 }, floating, viewport, {});
	assert.equal(flipped.availableHeight, 700 - 4 - 8);
	assert.deepEqual(availableSpace(anchor, viewport, 'left'), { width: 400 - 4 - 8, height: 800 - 16 });
});

test('matchWidth widens the surface to the anchor and reports minWidth', () => {
	const wide = { x: 100, y: 100, width: 300, height: 30 };
	const p = computePosition(wide, floating, viewport, { matchWidth: true, align: 'start' });
	assert.equal(p.minWidth, 300);
	assert.equal(computePosition(anchor, floating, viewport, {}).minWidth, null);
	const centred = computePosition(wide, floating, viewport, { matchWidth: true });
	assert.equal(centred.x, 100);
});

test('a point anchor (context menu) works like a zero-size rect', () => {
	const p = computePosition(pointRect(500, 500), floating, viewport, { align: 'start', offset: 0 });
	assert.deepEqual([p.x, p.y, p.side], [500, 500, 'bottom']);
});

test('sideFromRects reads the measured side, preferring the requested axis', () => {
	assert.equal(sideFromRects(anchor, { x: 350, y: 134, width: 200, height: 150 }, 'bottom'), 'bottom');
	assert.equal(sideFromRects(anchor, { x: 350, y: -60, width: 200, height: 150 }, 'bottom'), 'top');
	assert.equal(sideFromRects(anchor, { x: 504, y: 100, width: 200, height: 150 }, 'right'), 'right');
	assert.equal(sideFromRects(anchor, { x: 196, y: 100, width: 200, height: 150 }, 'right'), 'left');
	assert.equal(sideFromRects(anchor, { x: 400, y: 100, width: 50, height: 10 }, 'top'), 'top', 'overlap keeps the request');
});

test('toNativeCss translates the same Placement for CSS anchor positioning', () => {
	const css = toNativeCss('--ak-a', { side: 'bottom', align: 'start', offset: 6 });
	assert.equal(css['position-anchor'], '--ak-a');
	assert.equal(css['position-area'], 'bottom span-right');
	assert.equal(css['margin-top'], '6px');
	assert.equal(css['position-try-fallbacks'], 'flip-block, flip-inline, flip-block flip-inline');
	assert.equal(css.inset, 'auto');
	const keys = Object.keys(css);
	assert.ok(keys.indexOf('margin') < keys.indexOf('margin-top'), 'margin reset comes before the gap');
});

test('toNativeCss for centred, side and matchWidth placements', () => {
	const centred = toNativeCss('--x', {});
	assert.equal(centred['position-area'], 'bottom span-all');
	assert.equal(centred['justify-self'], 'anchor-center');
	const side = toNativeCss('--x', { side: 'left', align: 'end', flip: false });
	assert.equal(side['position-area'], 'span-top left');
	assert.equal(side['margin-right'], '4px');
	assert.equal(side['position-try-fallbacks'], 'none');
	assert.equal(toNativeCss('--x', { matchWidth: true })['min-width'], 'anchor-size(width)');
});

test('grace polygon covers the gap toward a submenu and the submenu itself', () => {
	const submenu = { x: 200, y: 50, width: 150, height: 200 };
	const poly = graceArea({ x: 195, y: 120 }, submenu, 'right');
	assert.equal(pointInPolygon({ x: 198, y: 118 }, poly), true, 'in the triangle toward the submenu');
	assert.equal(pointInPolygon({ x: 300, y: 200 }, poly), true, 'inside the submenu');
	assert.equal(pointInPolygon({ x: 190, y: 120 }, poly), false, 'behind the exit point');
	assert.equal(pointInPolygon({ x: 198, y: 260 }, poly), false, 'below the triangle');
	const leftPoly = graceArea({ x: 355, y: 120 }, submenu, 'left');
	assert.equal(pointInPolygon({ x: 352, y: 121 }, leftPoly), true);
	assert.equal(pointInPolygon({ x: 360, y: 121 }, leftPoly), false);
});

test('pointInPolygon on a square', () => {
	const square = [
		{ x: 0, y: 0 },
		{ x: 10, y: 0 },
		{ x: 10, y: 10 },
		{ x: 0, y: 10 }
	];
	assert.equal(pointInPolygon({ x: 5, y: 5 }, square), true);
	assert.equal(pointInPolygon({ x: 15, y: 5 }, square), false);
});
