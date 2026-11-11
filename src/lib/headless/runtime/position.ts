/**
 * Anchored positioning for a popover layer. Started by Layer while the layer is shown;
 * not public.
 *
 * Strategy is chosen per start (per open, and again whenever the anchor changes):
 * - NATIVE when the browser supports CSS anchor positioning with try-fallbacks AND the
 *   anchor is an element. Writes `anchor-name` on the anchor and `toNativeCss()` on the
 *   floating element. The browser keeps it placed on scroll/resize and flips it silently.
 * - FALLBACK otherwise: `position: fixed`, `computePosition()` on start, then on
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
 * If the anchor element leaves the document while the surface is shown (its trigger was
 * removed), both strategies FREEZE at the last good placement instead of positioning
 * against nothing; the Layer restarts positioning when a new anchor attaches.
 *
 * Where styles go: NEVER `element.style`. Rules go into ONE kit-owned constructed
 * stylesheet adopted by the document on first use: `#<content id>` for the floating
 * element (content parts own their id), and `[data-ak-anchor="<token>"]` for the anchor.
 * The anchor is marked by a script-written data attribute, NOT by its id, because the
 * anchor is often an element whose id belongs to someone else (a ListNav item, a
 * consumer). A consumer `style` prop re-rendering the style attribute therefore cannot
 * wipe positions, and the unlayered rules beat layered utility classes.
 *
 * The sheet, its rules and the anchor tokens live on one `globalThis` object, so two
 * copies of the package on a page share them (as they share the layer stack).
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
	anchor: HTMLElement | { x: number; y: number };
	placement: Placement;
	/** Receives the measured side. */
	onSide: (side: Side) => void;
	/** Unique dashed ident for `anchor-name`, derived from the layer id. */
	anchorName: string;
}

interface PositionStore {
	forced: PositionStrategy;
	sheet: CSSStyleSheet | null;
	/** Declarations per selector; the sheet is re-rendered from these on every change. */
	blocks: Map<string, Map<string, string>>;
	/** Anchor token → the anchor names currently on that element. */
	anchors: Map<string, Set<string>>;
	tokens: WeakMap<Element, string>;
	nextToken: number;
}

const STORE_KEY = Symbol.for('agents-kit-svelte/position@1');

function store(): PositionStore {
	const global = globalThis as typeof globalThis & { [STORE_KEY]?: PositionStore };
	return (global[STORE_KEY] ??= {
		forced: 'auto',
		sheet: null,
		blocks: new Map(),
		anchors: new Map(),
		tokens: new WeakMap(),
		nextToken: 0
	});
}

/**
 * @internal Test hook: force a strategy for every popover positioned afterwards. Reachable
 * only from this module path (not the package entry); the headless test page calls it from
 * a `?anchor=native|fallback` flag so browser specs run under both strategies.
 */
export function __setPositionStrategy(strategy: PositionStrategy): void {
	store().forced = strategy;
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

/**
 * Re-render the whole kit sheet with `replaceSync`. Rules are never edited in place:
 * mutating a rule of the adopted sheet (`rule.style.setProperty`) between a forced layout
 * and the next frame was observed in Chromium to leave a just-shown popover at its static
 * position until something else invalidated its style. Replacing the sheet text is a
 * whole-sheet change and is picked up. The sheet holds one small rule per open layer.
 */
function render(): void {
	const s = store();
	if (!s.sheet) {
		s.sheet = new CSSStyleSheet();
		document.adoptedStyleSheets = [...document.adoptedStyleSheets, s.sheet];
	}
	let text = '';
	for (const [selector, decls] of s.blocks) {
		text += `${selector} { ${[...decls].map(([p, v]) => `${p}: ${v};`).join(' ')} }\n`;
	}
	s.sheet.replaceSync(text);
}

/** Merge `decls` into the rule for `selector`; later writes of a property move it last. */
function write(selector: string, decls: Record<string, string>, replace = false): void {
	const { blocks } = store();
	const block = replace ? new Map<string, string>() : (blocks.get(selector) ?? new Map<string, string>());
	let changed = replace || !blocks.has(selector);
	blocks.set(selector, block);
	for (const [property, value] of Object.entries(decls)) {
		if (block.get(property) === value) continue;
		block.delete(property);
		block.set(property, value);
		changed = true;
	}
	if (changed) render();
}

function dropRule(selector: string): void {
	if (store().blocks.delete(selector)) render();
}

function anchorSelector(token: string): string {
	return `[data-ak-anchor="${token}"]`;
}

/** Several layers may anchor to one element (a menu button with a tooltip): names stack. */
function addAnchorName(el: HTMLElement, name: string): void {
	const s = store();
	let token = s.tokens.get(el);
	if (!token) {
		token = `a${s.nextToken++}`;
		s.tokens.set(el, token);
	}
	el.setAttribute('data-ak-anchor', token);
	const names = s.anchors.get(token) ?? new Set();
	names.add(name);
	s.anchors.set(token, names);
	write(anchorSelector(token), { 'anchor-name': [...names].join(', ') });
}

function removeAnchorName(el: HTMLElement, name: string): void {
	const s = store();
	const token = s.tokens.get(el);
	const names = token ? s.anchors.get(token) : undefined;
	if (!token || !names) return;
	names.delete(name);
	if (names.size === 0) {
		s.anchors.delete(token);
		dropRule(anchorSelector(token));
		el.removeAttribute('data-ak-anchor');
	} else {
		write(anchorSelector(token), { 'anchor-name': [...names].join(', ') });
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

/** Effective CSS zoom of an element (1 where `currentCSSZoom` is not supported). */
function zoomOf(el: HTMLElement): number {
	return (el as HTMLElement & { currentCSSZoom?: number }).currentCSSZoom || 1;
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

/** Size variables in the floating element's own CSS pixels (measured rects are zoomed). */
function sizeVars(anchor: Rect, side: Side, placement: Placement, zoom: number): Record<string, string> {
	const space = availableSpace(anchor, viewport(), side, placement);
	return {
		'--ak-available-height': `${Math.max(0, Math.floor(space.height / zoom))}px`,
		'--ak-available-width': `${Math.max(0, Math.floor(space.width / zoom))}px`,
		'--ak-anchor-width': `${Math.round(anchor.width / zoom)}px`
	};
}

/**
 * Start positioning `floating` while it is open. Returns a stop function that removes
 * every rule and listener it added.
 */
export function startPositioning(floating: HTMLElement, target: PositionTarget): () => void {
	const { anchor } = target;
	const id = floating.id;
	if (!id) return () => {};
	const selector = `#${CSS.escape(id)}`;
	const anchorEl = anchor instanceof HTMLElement ? anchor : null;
	const point = anchor instanceof HTMLElement ? null : anchor;
	const placement = physical(target.placement, anchorEl);
	const requested = placement.side ?? 'bottom';
	const native = anchorEl !== null && store().forced !== 'fallback' && supportsNativeAnchoring();
	floating.setAttribute('data-ak-position', native ? 'native' : 'fallback');

	let raf = 0;
	let stopped = false;
	let frozen = false;
	const stops: (() => void)[] = [];

	/** Anchor gone: pin the surface where it last was, as plain fixed coordinates. */
	const freeze = (last: Rect | null) => {
		if (frozen || !last) return;
		frozen = true;
		const z = zoomOf(floating);
		const vars = Object.fromEntries(
			[...(store().blocks.get(selector) ?? [])].filter(([property]) => property.startsWith('--'))
		);
		write(
			selector,
			{
				position: 'fixed',
				inset: 'auto',
				margin: '0',
				left: `${Math.round(last.x / z)}px`,
				top: `${Math.round(last.y / z)}px`,
				...vars
			},
			true
		);
	};

	if (native && anchorEl) {
		addAnchorName(anchorEl, target.anchorName);
		write(selector, toNativeCss(target.anchorName, placement));
		let last: Rect | null = null;
		const measure = () => {
			if (stopped || frozen) return;
			if (!anchorEl.isConnected) return freeze(last);
			const a = toRect(anchorEl.getBoundingClientRect());
			const f = toRect(floating.getBoundingClientRect());
			last = f;
			const side = sideFromRects(a, f, requested);
			write(selector, sizeVars(a, side, placement, zoomOf(floating)));
			target.onSide(side);
		};
		const loop = () => {
			measure();
			if (!frozen) raf = requestAnimationFrame(loop);
		};
		measure();
		raf = requestAnimationFrame(loop);
		stops.push(() => removeAnchorName(anchorEl, target.anchorName));
	} else {
		const anchorRect = (): Rect => (anchorEl ? toRect(anchorEl.getBoundingClientRect()) : pointRect(point?.x ?? 0, point?.y ?? 0));
		const update = () => {
			// A removed anchor keeps the last rule (its rect would be all zeros).
			if (stopped || (anchorEl && !anchorEl.isConnected)) return;
			// One measure, then ONE write. Measured rects are zoomed; CSS lengths are not.
			const z = zoomOf(floating);
			const a = anchorRect();
			const size = { width: floating.offsetWidth * z, height: floating.offsetHeight * z };
			const pos = computePosition(a, size, viewport(), placement);
			write(selector, {
				position: 'fixed',
				inset: 'auto',
				margin: '0',
				left: `${Math.round(pos.x / z)}px`,
				top: `${Math.round(pos.y / z)}px`,
				'min-width': pos.minWidth === null ? 'auto' : `${Math.round(pos.minWidth / z)}px`,
				...sizeVars(a, pos.side, placement, z)
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
		dropRule(selector);
		floating.removeAttribute('data-ak-position');
	};
}
