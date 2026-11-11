/**
 * The open-layer stack: the ONLY owner of layer ordering, Escape, outside pointer-down,
 * focus-out dismissal, scroll lock and focus return. Not exported from the entry: the
 * public way to get a layer is `Dialog` (modal) or `Popover` (non-modal), and later
 * patterns compose the same internal Layer. Nobody else can push onto the stack, so
 * nobody else can get the ordering wrong.
 *
 * Split of truth:
 * - the pattern's open state (controlled getter or internal $state) is the DESIRED state;
 * - this stack's chain is the SHOWN state, and it alone calls showModal/showPopover/
 *   hidePopover/close on the element;
 * - popovers use `popover="manual"` (no native light dismiss, no native auto-stack) and
 *   dialogs have their `cancel` event routed through the stack. When the browser changes
 *   shown state anyway (`dialog.close()` from other code, a close watcher that will not be
 *   cancelled twice, `showPopover()` from outside), the `close`/`toggle` events reconcile
 *   it into the chain with reason 'native'.
 * When the stack closes a layer it calls the layer's `notify(false, reason)`, which
 * updates desired state through the pattern's `onOpenChange`.
 *
 * Closing has a phase: `close` marks the layer `closing` at once (it leaves the chain, so
 * it stops receiving Escape/pointer verdicts, and `data-state` turns "closed"), waits for
 * the content's exit animations (skipped under reduced motion, capped at 400ms), then
 * hides it natively and restores focus. Re-opening while closing cancels the wait.
 */
import { untrack } from 'svelte';
import {
	closeLayer,
	dismissOnEscape,
	dismissOnFocusOut,
	dismissOnPointer,
	hasModal,
	openLayer,
	resolveParent,
	type Chain,
	type ChainChange,
	type ChainEntry,
	type LayerId,
	type LayerKind
} from '../logic/layer-chain';
import type { Placement, Side } from '../logic/placement';
import { canFocus, focusQuietly, tabbables } from './focus';
import { cleanups, listen, read, type ChangeReason, type Dismiss, type MaybeGetter } from './parts';
import { startPositioning } from './position';

/** What a layer needs from the pattern that owns it. */
export interface LayerInit {
	readonly id: string;
	readonly kind: LayerKind;
	readonly dismiss: MaybeGetter<Dismiss>;
	/** Desired open state (reads the pattern's controlled getter or $state). */
	readonly desired: () => boolean;
	/** Tell the pattern the stack changed shown state. */
	readonly notify: (open: boolean, reason: ChangeReason) => void;
	/** Where focus goes when the layer opens. Read once per open. */
	readonly initialFocus: () => FocusTarget;
	/** Popovers only: positioning against the anchor (or trigger). */
	readonly placement?: MaybeGetter<Placement>;
}

/**
 * - 'native': `<dialog>.showModal()` picks `[autofocus]` or the first focusable (modal
 *   default); for popovers the same as 'content' unless `[autofocus]` already took focus
 * - 'content': the content element itself (give it tabindex=-1)
 * - 'first' / 'last': first/last tabbable inside the content (a Menu passes a getter that
 *   asks its ListNav instead, because roving items are not tabbable)
 * - 'none': leave focus where it is (tooltips never take focus; combobox keeps the input)
 * - a getter: a specific element; null falls back to 'native'
 */
export type FocusTarget = 'native' | 'content' | 'first' | 'last' | 'none' | (() => HTMLElement | null);

export type LayerPhase = 'open' | 'closing' | 'closed';

const EXIT_CAP_MS = 400;

/**
 * One layer, owned by one pattern instance. Holds the DOM refs its attachments receive
 * and the attachments themselves (identity-stable, created in the constructor).
 * @internal
 */
export class Layer {
	readonly id: string;
	readonly init: LayerInit;
	/** Set by the attachments; null on the server and before mount. */
	contentEl: HTMLElement | null = null;
	/** Reactive (raw) so positioning re-anchors when a trigger is re-keyed. */
	triggerEl: HTMLElement | null = $state.raw(null);
	anchorEl: HTMLElement | null = $state.raw(null);
	/** Virtual anchor (context menu point). Wins over anchorEl/triggerEl when set. */
	anchorPoint: { x: number; y: number } | null = $state(null);
	/** Written ONLY by LayerStack (through setPhase). */
	phase: LayerPhase = $state('closed');
	/** Shown at all (open or closing): open -> closing must not restart positioning. */
	readonly #visible = $derived(this.phase !== 'closed');
	/** Measured side after positioning, for `data-side`. */
	side: Side | null = $state(null);
	/** What had focus when the layer opened, plus its id for "re-rendered trigger" lookup. */
	returnTo: { el: HTMLElement | null; id: string | null } = { el: null, id: null };
	/** @internal LayerStack: completes a pending close now (native close, unmount). */
	finishClose: (() => void) | null = null;

	readonly attachContent: (el: HTMLElement) => () => void;
	readonly attachTrigger: (el: HTMLElement) => () => void;
	readonly attachAnchor: (el: HTMLElement) => () => void;

	constructor(init: LayerInit) {
		this.id = init.id;
		this.init = init;
		this.attachContent = (el) =>
			untrack(() => {
				this.contentEl = el;
				const stack = layerStack();
				const unwire = stack.wire(this, el);
				// Desired → shown. Idempotent both ways, so re-runs are harmless.
				$effect(() => {
					const want = init.desired();
					untrack(() => (want ? stack.open(this) : stack.close(this, 'api')));
				});
				// Positioning runs while shown and restarts when the anchor or placement changes.
				// When the anchor goes away (trigger removed) the last placement is kept rather
				// than re-positioning against nothing.
				let stopPositioning: (() => void) | null = null;
				const stop = () => {
					stopPositioning?.();
					stopPositioning = null;
				};
				if (init.placement !== undefined) {
					const placement = init.placement;
					$effect(() => {
						if (!this.#visible) return untrack(stop);
						const value = read(placement);
						const anchor = this.anchorPoint ?? this.anchorEl ?? this.triggerEl;
						untrack(() => {
							if (!anchor) return;
							stop();
							stopPositioning = startPositioning(el, {
								anchor,
								placement: value,
								onSide: (side) => (this.side = side),
								anchorName: `--ak-anchor-${this.id.replace(/[^A-Za-z0-9_-]/g, '_')}`
							});
						});
					});
				}
				return () => {
					stop();
					stack.detach(this);
					unwire();
					if (this.contentEl === el) this.contentEl = null;
				};
			});
		this.attachTrigger = (el) => {
			this.triggerEl = el;
			return () => {
				if (this.triggerEl === el) this.triggerEl = null;
			};
		};
		this.attachAnchor = (el) => {
			this.anchorEl = el;
			return () => {
				if (this.anchorEl === el) this.anchorEl = null;
			};
		};
	}

	/** Shown open state as `data-state` ('closed' already while the exit animation runs). */
	get state(): 'open' | 'closed' {
		return this.phase === 'open' ? 'open' : 'closed';
	}

	/**
	 * @internal LayerStack only. Writes the DOM attribute too: exit animations must start
	 * before the next render flush, and a re-open must not be skipped by Svelte's diff.
	 */
	setPhase(phase: LayerPhase): void {
		this.phase = phase;
		this.contentEl?.setAttribute('data-state', phase === 'open' ? 'open' : 'closed');
	}

	/**
	 * Close this layer (and every layer above it) NOW, for `reason`, and let the stack tell
	 * the pattern through `notify(false, reason)`. Patterns call this instead of writing
	 * their desired state whenever the reason matters for focus: writing desired state goes
	 * through the reconcile effect as reason 'api', which returns focus to the trigger.
	 *
	 * Focus return by reason: 'focus-out' NEVER returns focus (the person moved it: Tab,
	 * Shift+Tab, blur); 'outside' returns it only if it is still inside the closing layer;
	 * every other reason returns it when it is inside the layer or on <body>.
	 * `{ restoreFocus: false }` suppresses focus return for any reason.
	 * Idempotent; a no-op before mount and while already closing or closed.
	 */
	close(reason: ChangeReason, options: CloseOptions = {}): void {
		if (!this.contentEl) return;
		layerStack().close(this, reason, options);
	}
}

/** Options for `Layer.close`. */
export interface CloseOptions {
	/** false: never move focus after this close. Default: decided by the reason. */
	restoreFocus?: boolean;
}

interface ApplyOptions {
	/** Restore focus for the lowest closed layer. Default true. */
	restoreFocus?: boolean;
	/**
	 * Whether focus on <body> counts as lost (and is restored). Default true; false after an
	 * outside press, where the person deliberately put focus elsewhere.
	 */
	bodyIsLost?: boolean;
	/** Layers already hidden by the browser or being removed: no exit wait. */
	immediate?: ReadonlySet<LayerId>;
}

type DismissValue = boolean | ((event: never) => boolean) | undefined;

function allows(value: DismissValue, event: Event, fallback: boolean): boolean {
	if (value === undefined) return fallback;
	return typeof value === 'function' ? (value as (e: Event) => boolean)(event) : value;
}

function reducedMotion(): boolean {
	return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function exitAnimations(el: HTMLElement): Animation[] {
	if (typeof el.getAnimations !== 'function') return [];
	return el
		.getAnimations({ subtree: true })
		.filter((a) => a.playState !== 'finished' && a.effect?.getComputedTiming().iterations !== Infinity);
}

/**
 * Document-wide singleton. Created lazily on the first client attachment and stored under
 * `globalThis[Symbol.for('agents-kit-svelte/layers@1')]`, so two copies of the package on
 * one page (a duplicated dependency) still share one stack.
 * @internal
 */
export class LayerStack {
	/** The pure chain (logic/layer-chain.ts); the live Layer for each id (open or closing). */
	#chain: Chain = [];
	#layers = new Map<LayerId, Layer>();
	#pendingTouch = false;
	/** An Escape keydown is being dispatched (cleared on the next task). */
	#escapeKeyPending = false;
	/** One policy snapshot per event, so a veto function runs once per decision. */
	#snap: { event: Event; chain: Chain; snapshot: Chain } | null = null;
	#scrollLock: { overflow: string; gutter: string } | null = null;
	/** Elements this stack just focused while returning focus; cleared on the next task. */
	readonly restored = new WeakSet<Element>();

	install(doc: Document): void {
		doc.addEventListener('keydown', this.#onKeydownCapture, true);
		doc.addEventListener('keydown', this.#onKeydown);
		doc.addEventListener('pointerdown', this.#onPointerdown, true);
		doc.addEventListener('pointercancel', this.#onPointercancel, true);
		doc.addEventListener('click', this.#onClick, true);
	}

	/**
	 * CAPTURE phase, for one job only: when the top layer REFUSES Escape, consume the key
	 * before anything can stop its propagation, so the browser's close watcher never closes
	 * a vetoing <dialog>. Allowed Escapes are still decided in the bubble phase below.
	 */
	#onKeydownCapture = (event: KeyboardEvent) => {
		if (event.key !== 'Escape' || event.isComposing || this.#chain.length === 0) return;
		this.#escapeKeyPending = true;
		setTimeout(() => (this.#escapeKeyPending = false), 0);
		const snapshot = this.#snapshot(event);
		if (!snapshot[snapshot.length - 1].dismiss.escape) event.preventDefault();
	};

	/**
	 * BUBBLE phase, so an element's own Escape handling runs first and can claim the key
	 * with preventDefault (a combobox input clearing its text).
	 */
	#onKeydown = (event: KeyboardEvent) => {
		if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return;
		this.#escape(event);
	};

	/** CAPTURE phase, so app code that stops propagation cannot break outside dismissal. */
	#onPointerdown = (event: PointerEvent) => {
		if (this.#chain.length === 0) return;
		// Touch decides on click, so a scroll gesture that starts outside does not dismiss.
		this.#pendingTouch = event.pointerType === 'touch';
		if (!this.#pendingTouch) this.#outside(event);
	};

	#onPointercancel = () => {
		this.#pendingTouch = false;
	};

	#onClick = (event: MouseEvent) => {
		if (!this.#pendingTouch) return;
		this.#pendingTouch = false;
		this.#outside(event);
	};

	/**
	 * Open `layer`: resolve its parent from trigger containment, close non-ancestors,
	 * push, show natively, focus. Idempotent: opening an open layer does nothing.
	 */
	open(layer: Layer): void {
		const el = layer.contentEl;
		if (!el || layer.phase === 'open') return;
		const reopening = layer.phase === 'closing';
		layer.finishClose = null;
		if (!reopening) layer.returnTo = captureFocus();
		this.#push(layer);
		if (!reopening && !this.#show(layer, el)) {
			this.#chain = closeLayer(this.#chain, layer.id).chain;
			this.#layers.delete(layer.id);
			this.#notify(layer, false, 'native');
			return;
		}
		layer.setPhase('open');
		this.#syncScrollLock();
		if (!reopening || !el.contains(document.activeElement)) this.#focusInitial(layer, el);
	}

	/**
	 * Close `layer` and every layer above it. Idempotent. Focus return follows the reason
	 * (see `Layer.close`): 'focus-out' never restores, 'outside' does not treat <body> as lost.
	 */
	close(layer: Layer, reason: ChangeReason, options: CloseOptions = {}): void {
		if (layer.phase !== 'open') return;
		this.#apply(closeLayer(this.#chain, layer.id), (id) => (id === layer.id ? reason : 'parent'), {
			restoreFocus: options.restoreFocus ?? reason !== 'focus-out',
			bodyIsLost: reason !== 'outside'
		});
	}

	/** Content unmounted: close it (and everything above) without waiting. */
	detach(layer: Layer): void {
		if (layer.phase === 'closing') layer.finishClose?.();
		if (layer.phase === 'open') {
			this.#apply(closeLayer(this.#chain, layer.id), () => 'parent', { immediate: new Set([layer.id]) });
		}
		if (layer.phase === 'closed') this.#layers.delete(layer.id);
	}

	/** Is `layer` the topmost open layer? */
	isTop(layer: Layer): boolean {
		return this.#chain[this.#chain.length - 1]?.id === layer.id;
	}

	/** Is `node` inside `layer` or any layer above it? */
	containsDeep(layer: Layer, node: Node | null): boolean {
		const index = this.#chain.findIndex((e) => e.id === layer.id);
		if (index < 0) return false;
		return this.#chain.slice(index).some((e) => this.#holds(e.id, node));
	}

	/**
	 * Wire per-content events: `focusout` → dismissOnFocusOut, `close`/`toggle` → reconcile
	 * what the browser did by itself, and dialog `cancel` → preventDefault, then:
	 * - during an Escape keydown whose propagation app code stopped: the TOP layer's escape
	 *   path, as for any Escape;
	 * - otherwise (`dialog.requestClose()`, Android back): close THIS dialog, and with it
	 *   the layers above it, under its own escape policy.
	 */
	wire(layer: Layer, el: HTMLElement): () => void {
		const reconcile = () => this.#reconcileNative(layer);
		if (layer.init.kind === 'modal') {
			return cleanups(
				listen(el, 'cancel', (event) => {
					event.preventDefault();
					if (this.#escapeKeyPending) return this.#escape(event);
					if (layer.phase !== 'open') return;
					if (!allows(read(layer.init.dismiss).escape, event, true)) return;
					this.#apply(closeLayer(this.#chain, layer.id), (id) => (id === layer.id ? 'escape' : 'parent'));
				}),
				listen(el, 'close', reconcile),
				listen(el, 'toggle', reconcile)
			);
		}
		return cleanups(
			listen(el, 'focusout', (event) => this.#focusOut(layer, event)),
			listen(el, 'toggle', reconcile)
		);
	}

	// ------------------------------------------------------------------ decisions

	#escape(event: Event): void {
		if (this.#chain.length === 0) return;
		const change = dismissOnEscape(this.#snapshot(event));
		if (change.consumed) event.preventDefault();
		this.#apply(change, () => 'escape');
	}

	#outside(event: MouseEvent): void {
		const target = event.target instanceof Node ? event.target : null;
		const hit = this.#hitIndex(target, event.clientX, event.clientY);
		this.#apply(dismissOnPointer(this.#snapshot(event), hit), () => 'outside', { bodyIsLost: false });
	}

	#focusOut(layer: Layer, event: FocusEvent): void {
		const related = event.relatedTarget instanceof Node ? event.relatedTarget : null;
		// No related target: the window lost focus or focus went nowhere; not a dismissal.
		if (!related || layer.phase !== 'open') return;
		let index = -1;
		for (let i = this.#chain.length - 1; i >= 0; i--) {
			if (this.#holds(this.#chain[i].id, related)) {
				index = i;
				break;
			}
		}
		// Focus already went where the person sent it (Tab out): never pull it back.
		this.#apply(dismissOnFocusOut(this.#snapshot(event), layer.id, index), () => 'focus-out', {
			restoreFocus: false
		});
	}

	#reconcileNative(layer: Layer): void {
		const el = layer.contentEl;
		if (!el) return;
		const shown = layer.init.kind === 'modal' ? (el as HTMLDialogElement).open : el.matches(':popover-open');
		if (shown && layer.phase === 'closed') {
			// Someone called showModal()/showPopover() directly: adopt it.
			layer.returnTo = captureFocus();
			this.#push(layer);
			layer.setPhase('open');
			this.#syncScrollLock();
			this.#notify(layer, true, 'native');
		} else if (!shown && layer.phase === 'open') {
			this.#apply(closeLayer(this.#chain, layer.id), (id) => (id === layer.id ? 'native' : 'parent'), {
				immediate: new Set([layer.id])
			});
		} else if (!shown && layer.phase === 'closing') {
			layer.finishClose?.();
		}
	}

	/**
	 * The chain as the pure functions see it, with each layer's policy evaluated lazily at
	 * decision time, so a veto function runs only for layers the walk actually reaches.
	 */
	#snapshot(event: Event): Chain {
		if (this.#snap?.event === event && this.#snap.chain === this.#chain) return this.#snap.snapshot;
		const snapshot = this.#chain.map((entry): ChainEntry => {
			const layer = this.#layers.get(entry.id);
			let policy: Dismiss | undefined;
			const get = () => (policy ??= layer ? read(layer.init.dismiss) : {});
			const verdicts: Partial<Record<'escape' | 'outside' | 'focusOut', boolean>> = {};
			return {
				...entry,
				dismiss: {
					get escape() {
						return (verdicts.escape ??= allows(get().escape, event, true));
					},
					get outside() {
						return (verdicts.outside ??= allows(get().outside, event, true));
					},
					get focusOut() {
						return (verdicts.focusOut ??= allows(get().focusOut, event, false));
					}
				}
			};
		});
		this.#snap = { event, chain: this.#chain, snapshot };
		return snapshot;
	}

	#hitIndex(target: Node | null, x: number, y: number): number {
		for (let i = this.#chain.length - 1; i >= 0; i--) {
			const layer = this.#layers.get(this.#chain[i].id);
			if (!layer) continue;
			if (layer.init.kind === 'modal' && target === layer.contentEl && layer.contentEl) {
				// A press on the <dialog> itself is either its padding or its ::backdrop.
				const r = layer.contentEl.getBoundingClientRect();
				const inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
				return inside ? i : -1;
			}
			if (this.#holds(layer.id, target)) return i;
		}
		return -1;
	}

	/** Content, trigger and anchor all belong to a layer (a combobox input is an anchor). */
	#holds(id: LayerId, node: Node | null): boolean {
		const layer = this.#layers.get(id);
		if (!layer || !node) return false;
		return !!(
			layer.contentEl?.contains(node) ||
			layer.triggerEl?.contains(node) ||
			layer.anchorEl?.contains(node)
		);
	}

	// ------------------------------------------------------------------ effects

	#push(layer: Layer): void {
		// The trigger decides the parent; an anchor-only layer (combobox) uses its anchor.
		const origin = layer.triggerEl ?? layer.anchorEl;
		const parent = resolveParent(this.#chain, origin !== null, (i) => this.#holds(this.#chain[i].id, origin));
		this.#layers.set(layer.id, layer);
		const entry: ChainEntry = {
			id: layer.id,
			kind: layer.init.kind,
			dismiss: { escape: true, outside: true, focusOut: false }
		};
		this.#apply(openLayer(this.#chain, entry, parent), () => 'parent', { restoreFocus: false });
	}

	#show(layer: Layer, el: HTMLElement): boolean {
		try {
			if (layer.init.kind === 'modal') {
				const dialog = el as HTMLDialogElement;
				if (!dialog.open) dialog.showModal();
			} else if (!el.matches(':popover-open')) {
				el.showPopover();
			}
			return true;
		} catch (error) {
			console.error('[agents-kit-svelte/headless] could not show layer', layer.id, error);
			return false;
		}
	}

	#hide(layer: Layer): void {
		const el = layer.contentEl;
		if (!el) return;
		try {
			if (layer.init.kind === 'modal') {
				const dialog = el as HTMLDialogElement;
				if (dialog.open) dialog.close();
			} else if (el.matches(':popover-open')) {
				el.hidePopover();
			}
		} catch {
			// Disconnected or already hidden: nothing left to hide.
		}
	}

	/**
	 * Apply a ChainChange: for each id in `close` (top-down) start the close, then notify;
	 * restore focus ONLY for the lowest closed layer, after it is hidden, and only if focus
	 * is inside a closing layer or on <body> (an outside click that moved focus to another
	 * control keeps it there).
	 */
	#apply(change: ChainChange, reasonFor: (id: LayerId) => ChangeReason, options: ApplyOptions = {}): void {
		this.#chain = change.chain;
		const closed = change.close
			.map((id) => this.#layers.get(id))
			.filter((layer): layer is Layer => layer !== undefined && layer.phase === 'open');
		if (closed.length === 0) return;
		const lowest = closed[closed.length - 1];
		const elements = closed.map((layer) => layer.contentEl);
		const bodyIsLost = options.bodyIsLost ?? true;
		for (const layer of closed) {
			const after =
				layer === lowest && options.restoreFocus !== false
					? () => this.#restoreFocus(layer, elements, bodyIsLost)
					: undefined;
			this.#beginClose(layer, options.immediate?.has(layer.id) ?? false, after);
		}
		this.#syncScrollLock();
		for (const layer of closed) this.#notify(layer, false, reasonFor(layer.id));
	}

	/**
	 * Tell the pattern, then let the controlled value win: a microtask re-reads desired()
	 * and re-applies it, so a consumer whose onOpenChange refuses a change (stays open on
	 * Escape, or rejects a native open) is reconciled back instead of desyncing. Structural
	 * 'parent' closes are not re-applied (two refusing siblings would ping-pong).
	 */
	#notify(layer: Layer, open: boolean, reason: ChangeReason): void {
		try {
			layer.init.notify(open, reason);
		} catch (error) {
			// A throwing callback must not leave the stack half-applied.
			queueMicrotask(() => {
				throw error;
			});
		}
		if (reason === 'parent') return;
		queueMicrotask(() =>
			untrack(() => {
				const want = layer.init.desired();
				if (want && layer.phase !== 'open') this.open(layer);
				else if (!want && layer.phase === 'open') this.close(layer, 'api');
			})
		);
	}

	#beginClose(layer: Layer, immediate: boolean, after?: () => void): void {
		layer.setPhase('closing');
		let done = false;
		const finish = () => {
			if (done || layer.finishClose !== finish) return;
			done = true;
			layer.finishClose = null;
			this.#hide(layer);
			layer.setPhase('closed');
			if (!this.#chain.some((e) => e.id === layer.id)) this.#layers.delete(layer.id);
			after?.();
		};
		layer.finishClose = finish;
		const el = layer.contentEl;
		const running = immediate || !el || reducedMotion() ? [] : exitAnimations(el);
		if (running.length === 0) return finish();
		let timer: ReturnType<typeof setTimeout> | undefined;
		const cap = new Promise<void>((resolve) => (timer = setTimeout(resolve, EXIT_CAP_MS)));
		void Promise.race([Promise.allSettled(running.map((a) => a.finished)), cap]).then(() => {
			clearTimeout(timer);
			finish();
		});
	}

	/**
	 * Focus return with fallbacks, first connected+focusable wins:
	 * 1. returnTo.el
	 * 2. document.getElementById(returnTo.id): the SAME trigger re-rendered by a keyed
	 *    {#each} or {#if}; ids are stable because they come from $props.id()
	 * 3. the layer's current trigger element
	 * 4. the new top layer's first tabbable, else its content
	 * 5. nothing (leave the browser default); never document.body.focus()
	 */
	#restoreFocus(layer: Layer, closed: readonly (HTMLElement | null)[], bodyIsLost: boolean): void {
		const active = document.activeElement;
		const onBody = !active || active === document.body;
		const lost = (bodyIsLost && onBody) || closed.some((el) => el?.contains(active));
		if (!lost) return;
		const top = this.#layers.get(this.#chain[this.#chain.length - 1]?.id ?? '');
		const topContent = top?.contentEl ?? null;
		const candidates = [
			layer.returnTo.el,
			layer.returnTo.id ? document.getElementById(layer.returnTo.id) : null,
			layer.triggerEl,
			topContent ? (tabbables(topContent)[0] ?? topContent) : null
		];
		for (const candidate of candidates) {
			if (!canFocus(candidate)) continue;
			// Mark before focusing: focus/focusin handlers run inside focus().
			// The mark ends when that focus does (blur), or at the next task, whichever is first:
			// a timer alone can fire late under load and mislabel the person's next focus.
			this.restored.add(candidate);
			const clear = () => this.restored.delete(candidate);
			candidate.addEventListener('blur', clear, { once: true });
			setTimeout(clear, 0);
			if (focusQuietly(candidate)) return;
			candidate.removeEventListener('blur', clear);
			clear();
		}
	}

	#focusInitial(layer: Layer, el: HTMLElement): void {
		const target = layer.init.initialFocus();
		if (target === 'none') return;
		if (typeof target === 'function' && focusQuietly(target())) return;
		if (target === 'first' || target === 'last') {
			const list = tabbables(el);
			if (focusQuietly((target === 'first' ? list[0] : list[list.length - 1]) ?? null)) return;
		}
		if (layer.init.kind === 'modal' && target !== 'content') return; // showModal() already focused
		if (target !== 'content' && el.contains(document.activeElement)) return; // [autofocus] inside
		focusQuietly(el);
	}

	/** `overflow: hidden` on <html> while a modal is open; a stable gutter only if a scrollbar was showing. */
	#syncScrollLock(): void {
		const html = document.documentElement;
		if (hasModal(this.#chain)) {
			if (this.#scrollLock) return;
			this.#scrollLock = { overflow: html.style.overflow, gutter: html.style.scrollbarGutter };
			const scrollbar = window.innerWidth > html.clientWidth;
			html.style.overflow = 'hidden';
			if (scrollbar) html.style.scrollbarGutter = 'stable';
		} else if (this.#scrollLock) {
			html.style.overflow = this.#scrollLock.overflow;
			html.style.scrollbarGutter = this.#scrollLock.gutter;
			this.#scrollLock = null;
		}
	}
}

function captureFocus(): { el: HTMLElement | null; id: string | null } {
	const active = document.activeElement;
	if (!(active instanceof HTMLElement) || active === document.body) return { el: null, id: null };
	return { el: active, id: active.id || null };
}


const STACK_KEY = Symbol.for('agents-kit-svelte/layers@1');

/**
 * @internal For the Tooltip pattern (not in the public entry): true while `el` is
 * receiving focus because the stack returned it after a close (from inside focus/focusin
 * handlers until the next task). A tooltip must not open for focus the stack restored,
 * or Escape-closing a menu re-opens the tooltip on its shared trigger.
 */
export function isRestoringFocus(el: Element | null): boolean {
	const stack = (globalThis as typeof globalThis & { [STACK_KEY]?: LayerStack })[STACK_KEY];
	return !!el && !!stack?.restored.has(el);
}

/** Client-only accessor; only attachments call it. @internal */
export function layerStack(): LayerStack {
	const store = globalThis as typeof globalThis & { [STACK_KEY]?: LayerStack };
	let stack = store[STACK_KEY];
	if (!stack) {
		stack = new LayerStack();
		stack.install(document);
		store[STACK_KEY] = stack;
	}
	return stack;
}
