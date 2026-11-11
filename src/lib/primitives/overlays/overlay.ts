/**
 * Shared pieces of the overlay primitives: placement shorthand, arrow geometry and the
 * motion and surface class strings. Behaviour lives in the headless layer; this file
 * only holds looks and one pure helper.
 */
import type { Align } from '../../headless/logic/placement';

/** Arrow square edge in px; it pokes out by half of that, so offsets grow by this much. */
export const ARROW_GAP = 5;

/**
 * Arrow placement for every side and alignment. The arrow reads `data-side` (the side the
 * surface really ended on after a flip), so these are variant classes; the alignment is a
 * prop, so it picks the row. Start/end on top and bottom point at the middle of the anchor
 * through `--ak-anchor-width` (the headless positioning writes it).
 */
const ARROW_ALIGN: Record<Align, string> = {
	center:
		'data-[side=top]:left-[calc(50%_-_5px)] data-[side=bottom]:left-[calc(50%_-_5px)] data-[side=left]:top-[calc(50%_-_5px)] data-[side=right]:top-[calc(50%_-_5px)]',
	start:
		'data-[side=top]:left-[clamp(8px,calc(var(--ak-anchor-width,24px)/2_-_5px),calc(100%_-_18px))] data-[side=bottom]:left-[clamp(8px,calc(var(--ak-anchor-width,24px)/2_-_5px),calc(100%_-_18px))] data-[side=left]:top-3 data-[side=right]:top-3',
	end: 'data-[side=top]:right-[clamp(8px,calc(var(--ak-anchor-width,24px)/2_-_5px),calc(100%_-_18px))] data-[side=bottom]:right-[clamp(8px,calc(var(--ak-anchor-width,24px)/2_-_5px),calc(100%_-_18px))] data-[side=left]:bottom-3 data-[side=right]:bottom-3'
};

/** The edge the arrow sits on, per side, and which two borders face outward. */
const ARROW_EDGE =
	'data-[side=bottom]:-top-[5px] data-[side=top]:-bottom-[5px] data-[side=right]:-left-[5px] data-[side=left]:-right-[5px]';
const ARROW_BORDERS =
	'data-[side=bottom]:border-t data-[side=bottom]:border-l data-[side=top]:border-b data-[side=top]:border-r data-[side=right]:border-b data-[side=right]:border-l data-[side=left]:border-t data-[side=left]:border-r';

/**
 * Classes for an arrow on a card surface (Popover).
 *
 * @param align - The surface's alignment against its anchor.
 */
export function cardArrowClass(align: Align): string {
	return `pointer-events-none absolute size-2.5 rotate-45 border-0 border-card-border bg-card-bg ${ARROW_EDGE} ${ARROW_BORDERS} ${ARROW_ALIGN[align]}`;
}

/**
 * Classes for an arrow on the inverse tooltip surface.
 *
 * @param align - The tooltip's alignment against its trigger.
 */
export function tipArrowClass(align: Align): string {
	return `pointer-events-none absolute size-2.5 rotate-45 bg-fg-main ${ARROW_EDGE} ${ARROW_ALIGN[align]}`;
}

/**
 * Scrim behind modal surfaces. `--ak-color-scrim` themes it; the fallback is a warm,
 * translucent dark that reads in both colour schemes.
 */
export const BACKDROP =
	'backdrop:bg-[var(--ak-color-scrim)] not-open:backdrop:invisible data-[state=closed]:backdrop:opacity-0 motion-safe:backdrop:transition-[opacity,display,overlay] motion-safe:backdrop:duration-200 motion-safe:backdrop:transition-discrete motion-safe:starting:open:backdrop:opacity-0';

/**
 * Enter and exit for centred surfaces: fade and a slight scale. `data-state` turns
 * "closed" while the element is still shown, and the headless layer waits for these
 * transitions before hiding it, and opening runs from `@starting-style`. `display` and
 * `overlay` transition with allow-discrete, so the browser keeps the surface rendered for
 * the same duration after it is hidden; it is `invisible` once not open, so in that tail
 * nothing in it can take focus or a click. (Not `invisible` while data-state is "closed":
 * `showModal()` runs before data-state turns "open", and it can only focus visible elements.)
 */
export const FADE_SCALE_MOTION =
	'not-open:invisible data-[state=closed]:opacity-0 data-[state=closed]:scale-[0.97] motion-safe:transition-[opacity,scale,display,overlay] motion-safe:duration-200 motion-safe:ease-out motion-safe:transition-discrete motion-safe:starting:open:opacity-0 motion-safe:starting:open:scale-[0.97]';

/** Shared look of modal surfaces (Dialog, AlertDialog, Sheet); the size classes come after. */
export const MODAL_SURFACE =
	'max-h-none max-w-none flex-col overflow-hidden border border-card-border bg-card-bg p-0 text-fg-main ak-shadow-soft open:flex';

/** Header band of a modal: room on the right for the close button. */
export const MODAL_HEADER = 'shrink-0 px-5 pt-5 pb-3 pr-12';
/** Scrolling body of a modal; the header and footer stay put. */
export const MODAL_BODY = 'min-h-0 flex-1 overflow-y-auto px-5 pb-5 text-[13px] leading-5 text-fg-main';
/** Footer band of a modal. */
export const MODAL_FOOTER =
	'flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-canvas-border bg-card-bg px-5 py-3';
export const MODAL_TITLE = 'text-base font-semibold tracking-[-0.01em] text-fg-main';
export const MODAL_DESCRIPTION = 'mt-1 text-[13px] leading-5 text-fg-light';

/** The edge a Sheet slides in from. */
export type SheetSide = 'right' | 'left' | 'bottom' | 'top';

const SLIDE_BASE =
	'not-open:invisible motion-safe:transition-[translate,display,overlay] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.32,0.72,0,1)] motion-safe:transition-discrete';

/** Enter and exit for edge sheets: slide in from their edge, out the same way. */
export const SLIDE_MOTION: Record<SheetSide, string> = {
	right: `${SLIDE_BASE} data-[state=closed]:translate-x-full motion-safe:starting:open:translate-x-full`,
	left: `${SLIDE_BASE} data-[state=closed]:-translate-x-full motion-safe:starting:open:-translate-x-full`,
	bottom: `${SLIDE_BASE} data-[state=closed]:translate-y-full motion-safe:starting:open:translate-y-full`,
	top: `${SLIDE_BASE} data-[state=closed]:-translate-y-full motion-safe:starting:open:-translate-y-full`
};

/**
 * Anchored floating surfaces (Popover, Tooltip): fade and a slight scale. Kept in step with
 * `FADE_SCALE_MOTION`, but shorter.
 */
export const FLOAT_MOTION =
	'not-open:invisible data-[state=closed]:opacity-0 data-[state=closed]:scale-[0.96] motion-safe:transition-[opacity,scale,display,overlay] motion-safe:duration-150 motion-safe:ease-out motion-safe:transition-discrete motion-safe:starting:open:opacity-0 motion-safe:starting:open:scale-[0.96]';

/** The floating card of a Popover. `overflow-visible` lets the arrow out. */
export const POPOVER_SURFACE =
	'w-max max-w-[min(22rem,calc(100vw-1rem))] overflow-visible rounded-card border border-card-border bg-card-bg p-3 text-[13px] leading-5 text-fg-main ak-shadow-soft';

/** The inverse chip of a Tooltip. */
export const TOOLTIP_SURFACE =
	'w-max max-w-[min(18rem,calc(100vw-1rem))] overflow-visible rounded-chip border-0 bg-fg-main px-2 py-1 text-xs leading-4 font-medium text-fg-inverse ak-shadow-soft-sm';
