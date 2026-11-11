/**
 * The one shape every behaviour hands to markup: a Part.
 *
 * A Part is a plain object you spread onto ONE element. It contains ONLY:
 *   - attributes: id, role, aria-*, data-state/-side/-highlighted, tabindex, type,
 *     popover, hidden — values derived from $state, so the spread stays live;
 *   - exactly one attachment under a symbol key from `createAttachmentKey()`.
 * It contains NO `on*` handlers and NO `class`/`style`. Every listener the behaviour
 * needs is added with addEventListener inside its attachment, and every style it needs
 * (positioning) goes to a kit-owned constructed stylesheet keyed by element id.
 *
 * Why that matters:
 * - spreads never collide on handlers, so order does not matter for behaviour and there
 *   is no `mergeProps` helper to learn or forget: `<dialog {...rest} {...dialog.content}>`
 *   keeps the consumer's `onkeydown` AND the dialog's behaviour;
 * - two parts compose on one element by spreading both, because each behaviour owns its
 *   own attachment key;
 * - a Part flows through any kit component's `...rest` onto its root, attachment
 *   included;
 * - a consumer `style` prop can never clobber computed positions.
 * Attribute order rule: spread `rest` FIRST and the part LAST, so the part's ids and
 * aria-* win.
 *
 * Other invariants (enforced by the internal `part()` builder and its callers):
 * - the attachment function is identity-stable for the life of the behaviour (per item
 *   value for item parts), so re-spreading on every state change never re-runs it;
 * - attachment bodies do their setup inside `untrack` and reconcile reactive state in
 *   nested `$effect`s, so reading state never tears the attachment down;
 * - building a part never touches `window`/`document`: parts are SSR-safe.
 */
import type { Attachment } from 'svelte/attachments';
import type { HTMLAttributes, HTMLButtonAttributes, HTMLDialogAttributes } from 'svelte/elements';

/**
 * Spreadable props for one element of type E. Element types with attributes of their own
 * (a button's `type`) map to Svelte's element attribute types.
 */
export type Part<E extends Element = HTMLElement> = (E extends HTMLButtonElement
	? HTMLButtonAttributes
	: E extends HTMLDialogElement
		? HTMLDialogAttributes
		: HTMLAttributes<E>) & {
	[key: `data-${string}`]: string | boolean | undefined;
};

/** A value or a getter for it. Getters are read inside effects/deriveds, so props stay live. */
export type MaybeGetter<T> = T | (() => T);

/** Why an open state changed. Passed to every `on…Change` callback. */
export type ChangeReason =
	| 'trigger' // the trigger part was activated (click, Enter/Space, ArrowDown on a menu button…)
	| 'escape' // Escape key or platform close request (Android back)
	| 'outside' // pointer-down outside the layer
	| 'focus-out' // focus left a non-modal layer
	| 'select' // an item was chosen and the pattern closes on select
	| 'close-button' // the `close` part
	| 'parent' // an ancestor layer closed, or a sibling chain was replaced
	| 'hover' // tooltip / submenu hover intent
	| 'native' // the browser changed it by itself (dialog.close(), a close watcher, showPopover())
	| 'api'; // `x.open = …` from code

/**
 * Controlled XOR uncontrolled, in the type. Controlled requires a writer, so it is
 * impossible to wire a getter and forget the setter (the "stuck open" bug).
 */
export type OpenState =
	| { open: () => boolean; onOpenChange: (open: boolean, reason: ChangeReason) => void; defaultOpen?: never }
	| { open?: never; defaultOpen?: boolean; onOpenChange?: (open: boolean, reason: ChangeReason) => void };

/** Same discipline for selected values. */
export type ValueState<V> =
	| { value: () => V; onValueChange: (value: V) => void; defaultValue?: never }
	| { value?: never; defaultValue?: V; onValueChange?: (value: V) => void };

/**
 * Per-layer dismissal policy. A function form is a VETO hook: it is consulted before the
 * stack decides and may return false (e.g. "unsaved changes"). `onOpenChange` is only a
 * notification and cannot veto. Vetoes are best-effort for closes the browser performs
 * itself (a close watcher may close a `<dialog>` without asking twice).
 */
export interface Dismiss {
	escape?: boolean | ((event: KeyboardEvent | Event) => boolean);
	outside?: boolean | ((event: PointerEvent | MouseEvent) => boolean);
	/** Non-modal layers only. */
	focusOut?: boolean;
}

/**
 * Internal: build a part. Called from a getter, so the returned object is rebuilt with
 * fresh state each time the template reads it, while `attach` is created once by the
 * behaviour and passed in already stable.
 * @internal not exported from the entry.
 */
export function part<E extends Element>(key: symbol, attach: Attachment<E>, attrs: Part<E>): Part<E> {
	return { ...attrs, [key]: attach } as Part<E>;
}

/** Internal: read a MaybeGetter. Only for non-function option types. @internal */
export function read<T>(value: MaybeGetter<T>): T {
	return typeof value === 'function' ? (value as () => T)() : value;
}

/**
 * Internal: SSR-stable sub-ids. `base` comes from the component's `$props.id()`.
 * Item ids encode the item value so they survive filtering and reorders
 * (aria-activedescendant must point at the same element across renders).
 * @internal
 */
export function subId(base: string, name: string, value?: string): string {
	return value === undefined ? `${base}-${name}` : `${base}-${name}-${encodeIdValue(value)}`;
}

/** [A-Za-z0-9-] pass through; every other code point becomes `_<hex>_`, so values never collide. */
function encodeIdValue(value: string): string {
	let out = '';
	for (const char of value) {
		out += /[A-Za-z0-9-]/.test(char) ? char : `_${(char.codePointAt(0) ?? 0).toString(16)}_`;
	}
	return out;
}

/** Internal: run every cleanup, newest first. @internal */
export function cleanups(...fns: (void | (() => void))[]): () => void {
	return () => {
		for (const fn of [...fns].reverse()) fn?.();
	};
}

/** Internal: addEventListener that returns its remover. @internal */
export function listen<K extends keyof HTMLElementEventMap>(
	target: HTMLElement,
	type: K,
	handler: (event: HTMLElementEventMap[K]) => void,
	options?: AddEventListenerOptions
): () => void;
export function listen(target: EventTarget, type: string, handler: (event: Event) => void, options?: AddEventListenerOptions): () => void;
export function listen(target: EventTarget, type: string, handler: (event: Event) => void, options?: AddEventListenerOptions): () => void {
	target.addEventListener(type, handler, options);
	return () => target.removeEventListener(type, handler, options);
}
