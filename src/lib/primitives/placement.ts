/**
 * Placement shorthand shared by every anchored primitive (Popover, Tooltip, DropdownMenu,
 * ContextMenu, Select, Combobox): `'top'`, `'bottom-start'`, or a full headless `Placement`.
 */
import type { Align, Placement, Side } from '../headless/logic/placement';

/**
 * Where an anchored surface sits: a side (`'top'`), a side and an edge alignment
 * (`'bottom-start'`), or a full headless `Placement` object (offset, flip, shift, …).
 */
export type OverlayPlacement = Side | `${Side}-start` | `${Side}-end` | Placement;

const SIDES: readonly string[] = ['top', 'right', 'bottom', 'left'];
const ALIGNS: readonly string[] = ['start', 'center', 'end'];

/**
 * Resolves a placement shorthand into the headless `Placement`.
 *
 * @param input - The caller's placement; undefined uses `defaults`.
 * @param defaults - Side, align and offset used where `input` gives none.
 * @param extraOffset - Added to the offset (room for an arrow).
 * @returns A placement with side, align and offset always set.
 */
export function toPlacement(
	input: OverlayPlacement | undefined,
	defaults: { side: Side; align: Align; offset: number },
	extraOffset = 0
): Placement & { side: Side; align: Align; offset: number } {
	let given: Placement = {};
	if (typeof input === 'string') {
		const [side, align] = input.split('-');
		given = {
			side: SIDES.includes(side) ? (side as Side) : defaults.side,
			align: align !== undefined && ALIGNS.includes(align) ? (align as Align) : 'center'
		};
	} else if (input) {
		given = input;
	}
	return {
		...given,
		side: given.side ?? defaults.side,
		align: given.align ?? defaults.align,
		offset: (given.offset ?? defaults.offset) + extraOffset
	};
}
