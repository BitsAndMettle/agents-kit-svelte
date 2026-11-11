/**
 * Pure open-layer ordering. Self-contained (no imports) so `node --test` can load it
 * directly with its `.ts` extension, and svelte-package can ship it unchanged.
 *
 * Model: open layers always form ONE chain, root first. Each layer's parent is the
 * layer before it. There are never two open siblings: opening a layer closes every
 * open layer that is not one of its ancestors (what `popover="auto"` does natively,
 * but owned here so the browser and the kit never disagree). Tooltips are not in the
 * chain; they live in a separate tooltip slot.
 *
 * Every function returns a NEW chain plus the ids to close, top-down. The caller (the
 * LayerStack shell) performs the DOM side effects in that order. Running any operation
 * twice yields the same chain and an empty close list the second time (idempotent).
 */

export type LayerId = string;

export type LayerKind = 'modal' | 'popover';

/** What the chain needs to know about one open layer. DOM-free. */
export interface ChainEntry {
	readonly id: LayerId;
	readonly kind: LayerKind;
	/** Policy snapshot taken when the decision is made, not when the layer opened. */
	readonly dismiss: DismissPolicySnapshot;
}

export interface DismissPolicySnapshot {
	readonly escape: boolean;
	readonly outside: boolean;
	readonly focusOut: boolean;
}

export type Chain = readonly ChainEntry[];

export interface ChainChange {
	readonly chain: Chain;
	/** Ids to close, topmost first. Focus is restored only for the LAST id (the lowest). */
	readonly close: readonly LayerId[];
}

const NO_CHANGE = (chain: Chain): ChainChange => ({ chain, close: [] });

/**
 * Index of the layer that should parent a layer opened from `trigger`.
 * `containing(i)` answers "does chain[i]'s content or trigger contain the trigger element?".
 * The deepest match wins. With no trigger (programmatic open) the new layer stacks on top.
 * Returns -1 for "no parent: root of the chain".
 *
 * A trigger outside every layer while a modal is open cannot be pressed by a person
 * (everything outside the modal is inert); code that opens such a layer must not be able
 * to close the modal by doing so, so the parent is clamped to the top modal.
 */
export function resolveParent(chain: Chain, hasTrigger: boolean, containing: (index: number) => boolean): number {
	if (!hasTrigger) return chain.length - 1;
	for (let i = chain.length - 1; i >= 0; i--) {
		if (containing(i)) return i;
	}
	return topModalIndex(chain);
}

/**
 * Open `entry` under `parentIndex`. Layers above the parent close (top-down), then the
 * entry is pushed. If `entry.id` is already in the chain this is a no-op.
 */
export function openLayer(chain: Chain, entry: ChainEntry, parentIndex: number): ChainChange {
	if (chain.some((e) => e.id === entry.id)) return NO_CHANGE(chain);
	const keep = Math.max(-1, Math.min(parentIndex, chain.length - 1)) + 1;
	return {
		chain: [...chain.slice(0, keep), entry],
		close: chain
			.slice(keep)
			.map((e) => e.id)
			.reverse()
	};
}

/** Close `id` and everything above it. No-op if `id` is not open. */
export function closeLayer(chain: Chain, id: LayerId): ChainChange {
	const index = chain.findIndex((e) => e.id === id);
	if (index < 0) return NO_CHANGE(chain);
	return {
		chain: chain.slice(0, index),
		close: chain
			.slice(index)
			.map((e) => e.id)
			.reverse()
	};
}

/**
 * Escape (or a platform close request such as Android back). Only the topmost layer is a
 * candidate. If it refuses (`dismiss.escape === false`) nothing closes and the key is
 * still consumed, so a lower layer never closes "through" a layer that said no.
 */
export function dismissOnEscape(chain: Chain): ChainChange & { consumed: boolean } {
	const top = chain[chain.length - 1];
	if (!top) return { ...NO_CHANGE(chain), consumed: false };
	if (!top.dismiss.escape) return { ...NO_CHANGE(chain), consumed: true };
	return { ...closeLayer(chain, top.id), consumed: true };
}

/**
 * Pointer-down at a point. `hitIndex` is the deepest chain index whose content or trigger
 * contains the target (-1 = outside everything). Layers above the hit close top-down
 * while each one allows outside dismissal; the walk stops at the first refusal, and
 * never crosses below the topmost modal (things under a modal are inert, so a press
 * there can only be the modal's own backdrop, which the shell maps to hitIndex = -1
 * only when the press is outside the dialog's border box).
 */
export function dismissOnPointer(chain: Chain, hitIndex: number): ChainChange {
	const floor = Math.max(hitIndex, topModalIndex(chain) - 1);
	const close: LayerId[] = [];
	for (let i = chain.length - 1; i > floor; i--) {
		if (!chain[i].dismiss.outside) break;
		close.push(chain[i].id);
	}
	if (close.length === 0) return NO_CHANGE(chain);
	return { chain: chain.slice(0, chain.length - close.length), close };
}

/**
 * Focus left layer `id` for `relatedIndex` (-1 = outside every layer). Only non-modal
 * layers with `focusOut` close; focus moving into the layer itself or a child layer
 * (relatedIndex at or above `id`) keeps it open.
 */
export function dismissOnFocusOut(chain: Chain, id: LayerId, relatedIndex: number): ChainChange {
	const index = chain.findIndex((e) => e.id === id);
	if (index < 0 || relatedIndex >= index) return NO_CHANGE(chain);
	const entry = chain[index];
	if (entry.kind === 'modal' || !entry.dismiss.focusOut) return NO_CHANGE(chain);
	return closeLayer(chain, id);
}

export function topModalIndex(chain: Chain): number {
	for (let i = chain.length - 1; i >= 0; i--) {
		if (chain[i].kind === 'modal') return i;
	}
	return -1;
}

/** True while any modal is open; the shell derives scroll lock from this. */
export function hasModal(chain: Chain): boolean {
	return topModalIndex(chain) >= 0;
}
