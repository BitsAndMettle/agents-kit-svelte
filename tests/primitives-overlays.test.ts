import assert from 'node:assert/strict';
import test from 'node:test';
import { cardArrowClass, tipArrowClass, toPlacement } from '../src/lib/primitives/overlays/overlay.ts';

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
