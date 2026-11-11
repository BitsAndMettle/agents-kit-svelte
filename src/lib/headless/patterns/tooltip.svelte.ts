/**
 * Tooltip: a hover/focus description with an open delay and a document-wide warm-up.
 *
 * NOT a chain layer. There is ONE tooltip slot per document (same globalThis key scheme as
 * the layer stack). The slot holds at most one visible tooltip and IS the delay group:
 * showing a tooltip replaces any other at once, and a tooltip requested less than
 * `skipDelay` ms after another closed opens at once. So there is no provider to forget,
 * and because tooltips never enter the chain, hovering a trigger never closes an open
 * popover or menu.
 *
 * Content uses `popover="manual"` (top layer) and the shared positioning (native anchor
 * positioning, or the fallback). It never takes focus. It opens after `delay` on pointer
 * hover and on keyboard focus (`:focus-visible`; a mouse press that focuses the trigger
 * does not open it). It closes on:
 *   - pointer leave (after a short grace when `interactive`, so the pointer can cross to
 *     the content: WCAG 1.4.13 hoverable),
 *   - trigger blur,
 *   - a press on the trigger (pointer or keyboard activation); hovering cannot reopen it
 *     until the pointer has left the trigger,
 *   - Escape: the slot listens in the CAPTURE phase on the document and preventDefaults,
 *     so the layer stack's bubble-phase handler (and a dialog's close request) never see
 *     that Escape. A visible tooltip always closes first; the next Escape reaches layers.
 *
 * Touch never opens a tooltip on contact; `longPress` opts into opening on a long press.
 * Closing waits for the content's exit animations unless reduced motion is preferred.
 *
 * Parts:
 *   trigger   aria-describedby → content id while shown. Sets NO id and no data-state, so it
 *             composes with another part on the same element (`{...menu.trigger}
 *             {...tip.trigger}`). Native anchoring marks the trigger with the shared
 *             `data-ak-anchor` token, so the trigger needs no id.
 *   content   popover="manual", role="tooltip", id, data-state, data-side, data-instant
 */
import { untrack } from 'svelte';
import { createAttachmentKey, type Attachment } from 'svelte/attachments';
import { openDelay } from '../logic/delay-group';
import type { Placement, Side } from '../logic/placement';
import { isRestoringFocus } from '../runtime/layers.svelte';
import { cleanups, listen, part, read, subId, type MaybeGetter, type Part } from '../runtime/parts';
import { startPositioning } from '../runtime/position';

export interface TooltipOptions {
	/** From the component's `$props.id()`. */
	id: string;
	/** Default { side: 'top', align: 'center', offset: 6 }. */
	placement?: MaybeGetter<Placement>;
	/** ms before opening while the group is cold (hover and keyboard focus). Default 600. */
	delay?: MaybeGetter<number>;
	/** ms after a tooltip closes during which the next one opens instantly. Default 300. */
	skipDelay?: MaybeGetter<number>;
	/**
	 * The pointer may move from the trigger onto the content without closing it (a 100ms
	 * grace on leave). Default true (WCAG 1.4.13). With false the content should be
	 * `pointer-events: none`.
	 */
	interactive?: MaybeGetter<boolean>;
	/**
	 * Touch: open on a long press (true = 500ms, or a number of ms). Default false: on
	 * touch the tooltip never opens, so it must never be the only way to get information.
	 */
	longPress?: MaybeGetter<boolean | number>;
	disabled?: MaybeGetter<boolean>;
}

export const DEFAULT_TOOLTIP_PLACEMENT: Placement = { side: 'top', align: 'center', offset: 6 };

const GRACE_MS = 100;
const LONG_PRESS_MS = 500;
const TOUCH_LINGER_MS = 1500;
const EXIT_CAP_MS = 400;

/** What the slot drives. @internal */
interface SlotClient {
	/** Make it visible; false if it cannot be shown (not mounted). */
	show(instant: boolean): boolean;
	hide(animate: boolean): void;
}

/**
 * @internal The document tooltip slot: at most one visible tooltip, and the delay group.
 * Lives under `globalThis[Symbol.for('agents-kit-svelte/tooltip@1')]`.
 */
export class TooltipSlot {
	#current: SlotClient | null = null;
	#pending: { client: SlotClient; timer: ReturnType<typeof setTimeout> } | null = null;
	#closing: { client: SlotClient; timer: ReturnType<typeof setTimeout> } | null = null;
	#lastClosedAt = -Infinity;

	install(doc: Document): void {
		doc.addEventListener('keydown', this.#onKeydown, true);
	}

	/** CAPTURE phase: runs before every element handler and the layer stack. */
	#onKeydown = (event: KeyboardEvent) => {
		if (event.key !== 'Escape' || event.isComposing) return;
		this.#cancelPending();
		if (!this.#current) return;
		event.preventDefault();
		this.close(this.#current, true);
	};

	/** Is `client` the visible tooltip? */
	isCurrent(client: SlotClient): boolean {
		return this.#current === client;
	}

	/** Ask to show `client` after the group's delay (0 when warm). Idempotent. */
	request(client: SlotClient, delay: number, skipDelay: number): void {
		this.#cancelClosing(client);
		if (this.#current === client || this.#pending?.client === client) return;
		this.#cancelPending();
		const { wait, instant } = openDelay(
			{ showing: this.#current !== null, lastClosedAt: this.#lastClosedAt },
			{ now: performance.now(), delay, skipDelay }
		);
		if (wait === 0) {
			this.#show(client, instant);
			return;
		}
		const timer = setTimeout(() => {
			this.#pending = null;
			this.#show(client, false);
		}, wait);
		this.#pending = { client, timer };
	}

	/** The pointer left: close after `grace` ms unless it comes back (request/keep). */
	release(client: SlotClient, grace: number): void {
		if (this.#pending?.client === client) this.#cancelPending();
		if (this.#current !== client) return;
		if (grace <= 0) return this.close(client, true);
		this.#cancelClosing(client);
		this.#closing = { client, timer: setTimeout(() => this.close(client, true), grace) };
	}

	/** The pointer reached the content: keep it open. */
	keep(client: SlotClient): void {
		this.#cancelClosing(client);
	}

	/** Close now (cancels a pending open of the same tooltip). Idempotent. */
	close(client: SlotClient, animate: boolean): void {
		if (this.#pending?.client === client) this.#cancelPending();
		this.#cancelClosing(client);
		if (this.#current !== client) return;
		this.#current = null;
		this.#lastClosedAt = performance.now();
		client.hide(animate);
	}

	#show(client: SlotClient, instant: boolean): void {
		const previous = this.#current;
		if (previous && previous !== client) {
			this.#cancelClosing(previous);
			this.#current = null;
			previous.hide(false); // replaced: no exit animation, the next one is already there
		}
		if (client.show(instant)) this.#current = client;
	}

	#cancelPending(): void {
		if (!this.#pending) return;
		clearTimeout(this.#pending.timer);
		this.#pending = null;
	}

	#cancelClosing(client: SlotClient): void {
		if (this.#closing?.client !== client) return;
		clearTimeout(this.#closing.timer);
		this.#closing = null;
	}
}

const SLOT_KEY = Symbol.for('agents-kit-svelte/tooltip@1');

/** Client-only accessor; only attachments call it. @internal */
export function tooltipSlot(): TooltipSlot {
	const store = globalThis as typeof globalThis & { [SLOT_KEY]?: TooltipSlot };
	let slot = store[SLOT_KEY];
	if (!slot) {
		slot = new TooltipSlot();
		slot.install(document);
		store[SLOT_KEY] = slot;
	}
	return slot;
}

function reducedMotion(): boolean {
	return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export class Tooltip {
	readonly #id: string;
	readonly #options: TooltipOptions;
	#shown = $state(false);
	#instant = $state(false);
	#side: Side | null = $state(null);

	#triggerEl: HTMLElement | null = null;
	#contentEl: HTMLElement | null = null;
	#stopPositioning: (() => void) | null = null;
	#cancelExit: (() => void) | null = null;
	/** The trigger was pressed; hover cannot reopen until the pointer leaves it. */
	#pressed = false;
	/** Shown by a long press (touch). */
	#touchShown = false;
	#longPressTimer: ReturnType<typeof setTimeout> | undefined;
	#lingerTimer: ReturnType<typeof setTimeout> | undefined;

	readonly #client: SlotClient = {
		show: (instant) => this.#showNow(instant),
		hide: (animate) => this.#hideNow(animate)
	};
	readonly #keys = { trigger: createAttachmentKey(), content: createAttachmentKey() };
	readonly #attachTrigger: Attachment<HTMLElement>;
	readonly #attachContent: Attachment<HTMLElement>;

	constructor(options: TooltipOptions) {
		this.#id = options.id;
		this.#options = options;
		this.#attachTrigger = (el) => untrack(() => this.#wireTrigger(el));
		this.#attachContent = (el) => untrack(() => this.#wireContent(el));
	}

	/** Shown state. Read-only: tooltips follow hover and focus, not app state. */
	get open(): boolean {
		return this.#shown;
	}

	/** Measured side after flip (both positioning strategies); null until first shown. */
	get side(): Side | null {
		return this.#side;
	}

	get trigger(): Part {
		return part(this.#keys.trigger, this.#attachTrigger, this.#shown ? { 'aria-describedby': this.#contentId } : {});
	}

	get content(): Part {
		return part(this.#keys.content, this.#attachContent, {
			id: this.#contentId,
			popover: 'manual',
			role: 'tooltip',
			'data-state': this.#shown ? 'open' : 'closed',
			'data-side': this.#side ?? this.#placement.side ?? 'top',
			'data-instant': this.#shown && this.#instant ? '' : undefined
		});
	}

	get #contentId(): string {
		return subId(this.#id, 'content');
	}

	get #placement(): Placement {
		return this.#options.placement === undefined ? DEFAULT_TOOLTIP_PLACEMENT : read(this.#options.placement);
	}

	get #disabled(): boolean {
		return read(this.#options.disabled ?? false);
	}

	#request(delay = read(this.#options.delay ?? 600)): void {
		if (this.#disabled) return;
		tooltipSlot().request(this.#client, delay, read(this.#options.skipDelay ?? 300));
	}

	#close(animate = true): void {
		tooltipSlot().close(this.#client, animate);
	}

	#wireTrigger(el: HTMLElement): () => void {
		this.#triggerEl = el;
		const slot = tooltipSlot();
		const isTouch = (event: PointerEvent) => event.pointerType === 'touch';
		const clearTouch = () => {
			clearTimeout(this.#longPressTimer);
			clearTimeout(this.#lingerTimer);
		};
		return cleanups(
			listen(el, 'pointerenter', (event) => {
				if (!isTouch(event) && !this.#pressed) this.#request();
			}),
			listen(el, 'pointerleave', (event) => {
				if (isTouch(event)) return;
				this.#pressed = false;
				slot.release(this.#client, read(this.#options.interactive ?? true) ? GRACE_MS : 0);
			}),
			listen(el, 'focus', () => {
				// Keyboard focus only: a mouse press focuses the trigger too, and must not reopen.
				// Focus the layer stack restores (Escape closed a popover on this trigger) is not
				// the person arriving here, so it does not open either.
				if (el.matches(':focus-visible') && !isRestoringFocus(el)) this.#request();
			}),
			listen(el, 'blur', () => this.#close()),
			listen(el, 'pointerdown', (event) => {
				clearTouch();
				this.#touchShown = false;
				this.#close();
				if (!isTouch(event)) {
					this.#pressed = true;
					return;
				}
				const longPress = read(this.#options.longPress ?? false);
				if (longPress === false) return;
				const ms = longPress === true ? LONG_PRESS_MS : longPress;
				this.#longPressTimer = setTimeout(() => {
					this.#touchShown = true;
					this.#request(0);
				}, ms);
			}),
			listen(el, 'pointerup', (event) => {
				if (!isTouch(event)) return;
				clearTimeout(this.#longPressTimer);
				if (this.#touchShown) this.#lingerTimer = setTimeout(() => this.#close(), TOUCH_LINGER_MS);
			}),
			listen(el, 'pointercancel', () => {
				clearTimeout(this.#longPressTimer);
				if (this.#touchShown) this.#close();
			}),
			// A long press would also open the platform's context menu or text selection.
			listen(el, 'contextmenu', (event) => {
				if (this.#touchShown) event.preventDefault();
			}),
			// Keyboard activation (Enter/Space fire click) is a press too.
			listen(el, 'click', () => {
				if (!this.#touchShown) this.#close();
			}),
			() => {
				clearTouch();
				this.#close(false);
				if (this.#triggerEl === el) this.#triggerEl = null;
			}
		);
	}

	#wireContent(el: HTMLElement): () => void {
		this.#contentEl = el;
		const slot = tooltipSlot();
		return cleanups(
			listen(el, 'pointerenter', (event) => {
				if (event.pointerType !== 'touch' && read(this.#options.interactive ?? true)) slot.keep(this.#client);
			}),
			listen(el, 'pointerleave', (event) => {
				if (event.pointerType !== 'touch') slot.release(this.#client, GRACE_MS);
			}),
			() => {
				this.#close(false);
				this.#finishHide();
				if (this.#contentEl === el) this.#contentEl = null;
			}
		);
	}

	#showNow(instant: boolean): boolean {
		const el = this.#contentEl;
		const anchor = this.#triggerEl;
		if (!el || !anchor || !el.isConnected) return false;
		this.#cancelExit?.();
		this.#instant = instant;
		this.#shown = true;
		// Written now as well: a re-show during the exit wait must not be skipped by Svelte's diff.
		el.setAttribute('data-state', 'open');
		try {
			if (!el.matches(':popover-open')) el.showPopover();
		} catch {
			this.#shown = false;
			el.setAttribute('data-state', 'closed');
			return false;
		}
		this.#stopPositioning ??= startPositioning(el, {
			anchor,
			placement: this.#placement,
			onSide: (side) => (this.#side = side),
			anchorName: `--ak-tip-${this.#id.replace(/[^A-Za-z0-9_-]/g, '_')}`
		});
		return true;
	}

	#hideNow(animate: boolean): void {
		this.#shown = false;
		this.#touchShown = false;
		const el = this.#contentEl;
		if (!el) return this.#finishHide();
		el.setAttribute('data-state', 'closed');
		const running =
			!animate || reducedMotion() || typeof el.getAnimations !== 'function'
				? []
				: el.getAnimations({ subtree: true }).filter((a) => a.playState !== 'finished');
		if (running.length === 0) return this.#finishHide();
		let cancelled = false;
		const timer = setTimeout(() => this.#finishHide(), EXIT_CAP_MS);
		this.#cancelExit = () => {
			cancelled = true;
			clearTimeout(timer);
			this.#cancelExit = null;
		};
		void Promise.allSettled(running.map((a) => a.finished)).then(() => {
			if (!cancelled) this.#finishHide();
		});
	}

	#finishHide(): void {
		this.#cancelExit?.();
		if (this.#shown) return;
		this.#stopPositioning?.();
		this.#stopPositioning = null;
		const el = this.#contentEl;
		try {
			if (el?.matches(':popover-open')) el.hidePopover();
		} catch {
			// Disconnected: nothing left to hide.
		}
	}
}
