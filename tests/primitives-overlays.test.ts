import assert from 'node:assert/strict';
import test from 'node:test';
import { arrowOffset, cardArrowClass, tipArrowClass } from '../src/lib/primitives/overlays/overlay.ts';
import { toPlacement } from '../src/lib/primitives/placement.ts';

const DEFAULTS = { side: 'bottom', align: 'center', offset: 6 } as const;

test('toPlacement: no input gives the defaults', () => {
	assert.deepEqual(toPlacement(undefined, DEFAULTS), { side: 'bottom', align: 'center', offset: 6 });
});

test('toPlacement: a side alone centres on it', () => {
	assert.deepEqual(toPlacement('top', DEFAULTS), { side: 'top', align: 'center', offset: 6 });
	assert.deepEqual(toPlacement('left', { ...DEFAULTS, align: 'start' }), { side: 'left', align: 'center', offset: 6 });
});

test('toPlacement: side-align shorthand', () => {
	assert.deepEqual(toPlacement('bottom-start', DEFAULTS), { side: 'bottom', align: 'start', offset: 6 });
	assert.deepEqual(toPlacement('right-end', DEFAULTS), { side: 'right', align: 'end', offset: 6 });
});

test('toPlacement: an object keeps its extra fields and fills the rest', () => {
	assert.deepEqual(toPlacement({ side: 'top', flip: false }, DEFAULTS), {
		side: 'top',
		align: 'center',
		offset: 6,
		flip: false
	});
	assert.deepEqual(toPlacement({ offset: 12 }, DEFAULTS), { side: 'bottom', align: 'center', offset: 12 });
});

test('toPlacement: the arrow gap adds to the offset, given or default', () => {
	assert.equal(toPlacement(undefined, DEFAULTS, 5).offset, 11);
	assert.equal(toPlacement({ offset: 0 }, DEFAULTS, 5).offset, 5);
});

test('toPlacement: an unknown shorthand falls back to the default side', () => {
	// Reachable from untyped callers (a CMS string, say).
	assert.deepEqual(toPlacement('middle' as never, DEFAULTS), { side: 'bottom', align: 'center', offset: 6 });
	assert.deepEqual(toPlacement('top-middle' as never, DEFAULTS), { side: 'top', align: 'center', offset: 6 });
});

test('arrow classes: every side has an edge, and alignment picks the cross position', () => {
	for (const cls of [cardArrowClass('center'), tipArrowClass('center')]) {
		for (const side of ['top', 'right', 'bottom', 'left']) assert.match(cls, new RegExp(`data-\\[side=${side}\\]:`));
	}
	assert.match(cardArrowClass('start'), /data-\[side=bottom\]:left-\[clamp/);
	assert.match(cardArrowClass('end'), /data-\[side=top\]:right-\[clamp/);
	assert.match(cardArrowClass('center'), /data-\[side=bottom\]:border-t/);
	assert.doesNotMatch(tipArrowClass('center'), /border-t/);
});

test('arrowOffset points at the anchor centre and stays clear of the corners', () => {
	const surface = { x: 100, y: 200, width: 240, height: 120 };
	// Centred surface: the arrow sits at the middle.
	assert.equal(arrowOffset({ x: 200, y: 150, width: 40, height: 30 }, surface, 'bottom', 12), 115);
	// Surface shifted left of a trigger near the right edge: the arrow follows the trigger.
	assert.equal(arrowOffset({ x: 300, y: 150, width: 30, height: 30 }, surface, 'top', 12), 210);
	// A trigger past the surface's end is clamped inside the rounded edge.
	assert.equal(arrowOffset({ x: 400, y: 150, width: 30, height: 30 }, surface, 'bottom', 12), 218);
	assert.equal(arrowOffset({ x: 0, y: 150, width: 30, height: 30 }, surface, 'bottom', 12), 12);
	// Left and right sides measure along the vertical edge.
	assert.equal(arrowOffset({ x: 20, y: 240, width: 30, height: 40 }, surface, 'right', 12), 55);
	// A surface smaller than two insets keeps the arrow at the inset.
	assert.equal(arrowOffset({ x: 0, y: 0, width: 10, height: 10 }, { x: 0, y: 0, width: 20, height: 20 }, 'bottom', 12), 12);
});
