/**
 * Pure placement math for the positioning fallback, plus the pointer grace polygon used
 * by submenus. Self-contained (no imports).
 *
 * The same `Placement` value drives both strategies: the native one translates it to
 * `position-area` + `position-try-fallbacks` (see `toNativeCss`), the fallback runs
 * `computePosition`. One input type, two outputs, so they cannot drift.
 *
 * Sides and alignments here are PHYSICAL. `align: 'start'` on a top/bottom side means
 * "left edges line up". The shell resolves writing direction before calling in (in RTL it
 * swaps start and end on top/bottom sides), so both strategies see the same physical value.
 */

export type Side = 'top' | 'right' | 'bottom' | 'left';
export type Align = 'start' | 'center' | 'end';

export interface Placement {
	readonly side?: Side; // default 'bottom'
	readonly align?: Align; // default 'center'
	/** Gap between anchor and surface, px. Default 4. */
	readonly offset?: number;
	/** Minimum distance from the viewport edge, px. Default 8. */
	readonly padding?: number;
	/** Flip to the opposite side when it does not fit. Default true. */
	readonly flip?: boolean;
	/** Slide along the cross axis to stay in view. Default true. */
	readonly shift?: boolean;
	/** Surface at least as wide as the anchor (Select, Combobox). Default false. */
	readonly matchWidth?: boolean;
}

export interface Rect {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

export interface Size {
	readonly width: number;
	readonly height: number;
}

export interface Position {
	/** Viewport coordinates for `position: fixed` (top layer content is viewport-relative). */
	readonly x: number;
	readonly y: number;
	readonly side: Side;
	readonly align: Align;
	/** Available space on the chosen side; written as `--ak-available-height`. */
	readonly availableHeight: number;
	readonly availableWidth: number;
	/** Anchor width when matchWidth, else null. */
	readonly minWidth: number | null;
}

export const DEFAULT_PLACEMENT: Required<Placement> = {
	side: 'bottom',
	align: 'center',
	offset: 4,
	padding: 8,
	flip: true,
	shift: true,
	matchWidth: false
};

const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

function isVertical(side: Side): boolean {
	return side === 'top' || side === 'bottom';
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * Space for the surface on `side` of `anchor`, after the offset and viewport padding.
 * Also used by the native strategy to write `--ak-available-height` from measured rects.
 */
export function availableSpace(anchor: Rect, viewport: Size, side: Side, placement: Placement = {}): Size {
	const { offset, padding } = { ...DEFAULT_PLACEMENT, ...placement };
	const full = { width: viewport.width - 2 * padding, height: viewport.height - 2 * padding };
	switch (side) {
		case 'bottom':
			return { width: full.width, height: viewport.height - (anchor.y + anchor.height) - offset - padding };
		case 'top':
			return { width: full.width, height: anchor.y - offset - padding };
		case 'right':
			return { width: viewport.width - (anchor.x + anchor.width) - offset - padding, height: full.height };
		case 'left':
			return { width: anchor.x - offset - padding, height: full.height };
	}
}

/**
 * Fallback strategy. Rules:
 * 1. place on `side` with `align`, `offset` away from the anchor
 * 2. if it overflows the viewport on the main axis and `flip`, try the opposite side;
 *    keep whichever side has more room if neither fits
 * 3. if `shift`, clamp the cross axis into [padding, viewport - padding - size]
 * 4. never clamp so far that the surface stops touching the anchor's cross extent
 */
export function computePosition(anchor: Rect, floating: Size, viewport: Size, placement: Placement): Position {
	const p = { ...DEFAULT_PLACEMENT, ...placement };
	const width = p.matchWidth ? Math.max(floating.width, anchor.width) : floating.width;
	const size = { width, height: floating.height };
	const need = (side: Side) => (isVertical(side) ? size.height : size.width);
	const room = (side: Side) => {
		const space = availableSpace(anchor, viewport, side, p);
		return isVertical(side) ? space.height : space.width;
	};

	let side = p.side;
	if (p.flip && room(side) < need(side)) {
		const other = OPPOSITE[side];
		if (room(other) >= need(other) || room(other) > room(side)) side = other;
	}

	let x: number;
	let y: number;
	if (isVertical(side)) {
		y = side === 'bottom' ? anchor.y + anchor.height + p.offset : anchor.y - p.offset - size.height;
		x =
			p.align === 'start'
				? anchor.x
				: p.align === 'end'
					? anchor.x + anchor.width - size.width
					: anchor.x + anchor.width / 2 - size.width / 2;
		if (p.shift) {
			x = clamp(x, p.padding, viewport.width - p.padding - size.width);
			x = clamp(x, anchor.x - size.width, anchor.x + anchor.width);
		}
	} else {
		x = side === 'right' ? anchor.x + anchor.width + p.offset : anchor.x - p.offset - size.width;
		y =
			p.align === 'start'
				? anchor.y
				: p.align === 'end'
					? anchor.y + anchor.height - size.height
					: anchor.y + anchor.height / 2 - size.height / 2;
		if (p.shift) {
			y = clamp(y, p.padding, viewport.height - p.padding - size.height);
			y = clamp(y, anchor.y - size.height, anchor.y + anchor.height);
		}
	}

	const space = availableSpace(anchor, viewport, side, p);
	return {
		x,
		y,
		side,
		align: p.align,
		availableHeight: Math.max(0, space.height),
		availableWidth: Math.max(0, space.width),
		minWidth: p.matchWidth ? anchor.width : null
	};
}

/**
 * Which side the surface actually ended on, from measured rects. Used in BOTH strategies
 * to write `data-side`, because native anchor positioning flips without telling script.
 * Checks the requested axis first; overlapping rects report `requested`.
 */
export function sideFromRects(anchor: Rect, floating: Rect, requested: Side): Side {
	const EPS = 1;
	const below = floating.y >= anchor.y + anchor.height - EPS;
	const above = floating.y + floating.height <= anchor.y + EPS;
	const right = floating.x >= anchor.x + anchor.width - EPS;
	const left = floating.x + floating.width <= anchor.x + EPS;
	const vertical: Side | null = below ? 'bottom' : above ? 'top' : null;
	const horizontal: Side | null = right ? 'right' : left ? 'left' : null;
	return (isVertical(requested) ? (vertical ?? horizontal) : (horizontal ?? vertical)) ?? requested;
}

/** Native strategy declarations for the floating element, as an ordered style map. */
export function toNativeCss(anchorName: string, placement: Placement): Record<string, string> {
	const p = { ...DEFAULT_PLACEMENT, ...placement };
	const vertical = isVertical(p.side);
	// Physical position-area: the side, then a span toward the alignment.
	const cross = vertical
		? p.align === 'start'
			? 'span-right'
			: p.align === 'end'
				? 'span-left'
				: 'span-all'
		: p.align === 'start'
			? 'span-bottom'
			: p.align === 'end'
				? 'span-top'
				: 'span-all';
	const css: Record<string, string> = {
		position: 'fixed',
		inset: 'auto',
		margin: '0',
		'position-anchor': anchorName,
		'position-area': vertical ? `${p.side} ${cross}` : `${cross} ${p.side}`,
		// The margin on the side facing the anchor is the gap; flip tactics mirror it.
		[`margin-${OPPOSITE[p.side]}`]: `${p.offset}px`,
		'position-try-fallbacks': p.flip
			? vertical
				? 'flip-block, flip-inline, flip-block flip-inline'
				: 'flip-inline, flip-block, flip-inline flip-block'
			: 'none'
	};
	if (p.align === 'center') css[vertical ? 'justify-self' : 'align-self'] = 'anchor-center';
	if (p.matchWidth) css['min-width'] = 'anchor-size(width)';
	return css;
}

/** A point, e.g. a context-menu click, as a zero-size anchor rect. */
export function pointRect(x: number, y: number): Rect {
	return { x, y, width: 0, height: 0 };
}

export interface Point {
	readonly x: number;
	readonly y: number;
}

/**
 * Submenu pointer grace area: the polygon from the pointer's exit point (nudged 2px back
 * toward the trigger) across the whole submenu. While the pointer stays inside it,
 * hovering sibling items does not close the open submenu.
 */
export function graceArea(exit: Point, submenu: Rect, side: Side): readonly Point[] {
	const nudge = 2;
	const l = submenu.x;
	const r = submenu.x + submenu.width;
	const t = submenu.y;
	const b = submenu.y + submenu.height;
	switch (side) {
		case 'right':
			return [{ x: exit.x - nudge, y: exit.y }, { x: l, y: t }, { x: r, y: t }, { x: r, y: b }, { x: l, y: b }];
		case 'left':
			return [{ x: exit.x + nudge, y: exit.y }, { x: r, y: b }, { x: l, y: b }, { x: l, y: t }, { x: r, y: t }];
		case 'bottom':
			return [{ x: exit.x, y: exit.y - nudge }, { x: r, y: t }, { x: r, y: b }, { x: l, y: b }, { x: l, y: t }];
		case 'top':
			return [{ x: exit.x, y: exit.y + nudge }, { x: l, y: b }, { x: l, y: t }, { x: r, y: t }, { x: r, y: b }];
	}
}

/** Ray casting; points on an edge may land either way. */
export function pointInPolygon(point: Point, polygon: readonly Point[]): boolean {
	let inside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const a = polygon[i];
		const b = polygon[j];
		if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
			inside = !inside;
		}
	}
	return inside;
}
