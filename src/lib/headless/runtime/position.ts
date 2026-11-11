/**
 * Anchored positioning for a popover layer. Started by Layer while the layer is shown;
 * not public.
 *
 * Strategy is chosen per open, not per page load:
 * - NATIVE when the browser supports CSS anchor positioning with try-fallbacks AND the
 *   anchor is an element with an id. Writes `anchor-name` on the anchor and
 *   `toNativeCss()` on the floating element. The browser keeps it placed on
 *   scroll/resize and flips it silently.
 * - FALLBACK otherwise: `position: fixed`, `computePosition()` on open, then on
 *   scroll (capture, passive), resize, and ResizeObserver(anchor, floating), coalesced
 *   to one rAF.
 *
 * Both strategies measure rects after layout and write:
 *   data-side (through onSide)  = the side the surface really ended on
 *   --ak-available-height / --ak-available-width
 *   --ak-anchor-width
 * The native strategy measures once per frame while open, because it flips silently.
 * The chosen strategy is written as `data-ak-position="native|fallback"` for debugging.
 *
 * Where styles go: NEVER `element.style`. Positioning writes rules keyed by element id
 * (`#<id> { … }`) into ONE kit-owned constructed stylesheet adopted by the document on
 * first use. A consumer `style` prop re-rendering the style attribute therefore cannot
 * wipe positions, and the unlayered id rule beats layered utility classes.
 */
import {
	availableSpace,
	computePosition,
	pointRect,
	sideFromRects,
	toNativeCss,
	type Placement,
	type Rect,
	type Side
} from '../logic/placement';

export type PositionStrategy = 'native' | 'fallback' | 'auto';

export interface PositionTarget {
	/** Anchor element, or a point for context menus. */
	anchor: () => HTMLElement | { x: number; y: number } | null;
	placement: Placement;
	/** Receives the measured side. */
	onSide: (side: Side) => void;
	/** Unique dashed ident for `anchor-name`, derived from the layer id. */
	anchorName: string;
}

let forced: PositionStrategy = 'auto';

/**
 * @internal Test hook: force a strategy for every popover opened afterwards. Reachable only
 * from this module path (not the package entry); the headless test page calls it from a
 * `?anchor=native|fallback` flag so browser specs run under both strategies.
 */
export function __setPositionStrategy(strategy: PositionStrategy): void {
	forced = strategy;
}

let nativeSupport: boolean | undefined;

/** Cached feature test; false during SSR (never called there). */
export function supportsNativeAnchoring(): boolean {
	nativeSupport ??=
		typeof CSS !== 'undefined' &&
		CSS.supports('position-anchor: --ak') &&
		CSS.supports('position-try-fallbacks: flip-block');
	return nativeSupport;
}

// ---------------------------------------------------------------- constructed stylesheet

let sheet: CSSStyleSheet | null = null;
/** Declarations per element id; the sheet is re-rendered from these on every change. */
const blocks = new Map<string, Map<string, string>>();
const anchorNames = new Map<string, Set<string>>();

/**
 * Re-render the whole kit sheet with `replaceSync`. Rules are never edited in place:
 * mutating a rule of the adopted sheet (`rule.style.setProperty`) between a forced layout
 * and the next frame was observed in Chromium to leave a just-shown popover at its static
 * position until something else invalidated its style. Replacing the sheet text is a
 * whole-sheet change and is picked up. The sheet holds one small rule per open layer.
 */
function render(): void {
	if (!sheet) {
		sheet = new CSSStyleSheet();
		document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
	}
	let text = '';
	for (const [id, decls] of blocks) {
		text += `#${CSS.escape(id)} { ${[...decls].map(([p, v]) => `${p}: ${v};`).join(' ')} }
`;
	}
	sheet.replaceSync(text);
}

/** Merge `decls` into the rule for `id`; later writes of a property move it last. */
function write(id: string, decls: Record<string, string>): void {
	const block = blocks.get(id) ?? new Map<string, string>();
	let changed = !blocks.has(id);
	blocks.set(id, block);
	for (const [property, value] of Object.entries(decls)) {
		if (block.get(property) === value) continue;
		block.delete(property);
		block.set(property, value);
		changed = true;
	}
	if (changed) render();
}

function dropRule(id: string): void {
	if (blocks.delete(id)) render();
}

/** Several layers may anchor to one element (a menu button with a tooltip): names stack. */
function addAnchorName(anchorId: string, name: string): void {
	const names = anchorNames.get(anchorId) ?? new Set();
	names.add(name);
	anchorNames.set(anchorId, names);
	write(anchorId, { 'anchor-name': [...names].join(', ') });
}

function removeAnchorName(anchorId: string, name: string): void {
	const names = anchorNames.get(anchorId);
	if (!names) return;
	names.delete(name);
	if (names.size === 0) {
		anchorNames.delete(anchorId);
		dropRule(anchorId);
	} else {
		write(anchorId, { 'anchor-name': [...names].join(', ') });
	}
}

// ---------------------------------------------------------------- strategies

function viewport(): { width: number; height: number } {
	const root = document.documentElement;
	return { width: root.clientWidth, height: root.clientHeight };
}

function toRect(r: DOMRect): Rect {
	return { x: r.left, y: r.top, width: r.width, height: r.height };
}

/** Placement sides are physical: in RTL, start/end swap on top/bottom sides. */
function physical(placement: Placement, anchor: Element | null): Placement {
	const side = placement.side ?? 'bottom';
	const align = placement.align;
	if ((side === 'top' || side === 'bottom') && (align === 'start' || align === 'end') && anchor) {
		if (getComputedStyle(anchor).direction === 'rtl') return { ...placement, align: align === 'start' ? 'end' : 'start' };
	}
	return placement;
}

function sizeVars(anchor: Rect, side: Side, placement: Placement): Record<string, string> {
	const space = availableSpace(anchor, viewport(), side, placement);
	return {
		'--ak-available-height': `${Math.max(0, Math.floor(space.height))}px`,
		'--ak-available-width': `${Math.max(0, Math.floor(space.width))}px`,
		'--ak-anchor-width': `${Math.round(anchor.width)}px`
	};
}

/**
 * Start positioning `floating` while it is open. Returns a stop function that removes
 * every rule and listener it added.
 */
export function startPositioning(floating: HTMLElement, target: PositionTarget): () => void {
	const anchor = target.anchor();
	const id = floating.id;
	if (!anchor || !id) return () => {};
	const anchorEl = anchor instanceof HTMLElement ? anchor : null;
	const point = anchor instanceof HTMLElement ? null : anchor;
	const placement = physical(target.placement, anchorEl);
	const requested = placement.side ?? 'bottom';
	const native = anchorEl !== null && anchorEl.id !== '' && forced !== 'fallback' && supportsNativeAnchoring();
	floating.setAttribute('data-ak-position', native ? 'native' : 'fallback');

	let raf = 0;
	let stopped = false;
	const stops: (() => void)[] = [];

	if (native) {
		const anchorId = anchorEl.id;
		addAnchorName(anchorId, target.anchorName);
		write(id, toNativeCss(target.anchorName, placement));
		const measure = () => {
			if (stopped || !anchorEl.isConnected) return;
			const a = toRect(anchorEl.getBoundingClientRect());
			const side = sideFromRects(a, toRect(floating.getBoundingClientRect()), requested);
			write(id, sizeVars(a, side, placement));
			target.onSide(side);
		};
		const loop = () => {
			measure();
			raf = requestAnimationFrame(loop);
		};
		measure();
		raf = requestAnimationFrame(loop);
		stops.push(() => removeAnchorName(anchorId, target.anchorName));
	} else {
		const anchorRect = (): Rect => (anchorEl ? toRect(anchorEl.getBoundingClientRect()) : pointRect(point?.x ?? 0, point?.y ?? 0));
		const update = () => {
			if (stopped) return;
			// One measure, then ONE write: never an intermediate write between them (see render()).
			const a = anchorRect();
			const pos = computePosition(a, { width: floating.offsetWidth, height: floating.offsetHeight }, viewport(), placement);
			write(id, {
				position: 'fixed',
				inset: 'auto',
				margin: '0',
				left: `${Math.round(pos.x)}px`,
				top: `${Math.round(pos.y)}px`,
				'min-width': pos.minWidth === null ? 'auto' : `${Math.round(pos.minWidth)}px`,
				...sizeVars(a, pos.side, placement)
			});
			target.onSide(pos.side);
		};
		const schedule = () => {
			if (!raf) {
				raf = requestAnimationFrame(() => {
					raf = 0;
					update();
				});
			}
		};
		update();
		window.addEventListener('scroll', schedule, { capture: true, passive: true });
		window.addEventListener('resize', schedule);
		const observer = new ResizeObserver(schedule);
		observer.observe(floating);
		if (anchorEl) observer.observe(anchorEl);
		stops.push(() => {
			window.removeEventListener('scroll', schedule, { capture: true });
			window.removeEventListener('resize', schedule);
			observer.disconnect();
		});
	}

	return () => {
		stopped = true;
		cancelAnimationFrame(raf);
		for (const stop of stops) stop();
		dropRule(id);
		floating.removeAttribute('data-ak-position');
	};
}
