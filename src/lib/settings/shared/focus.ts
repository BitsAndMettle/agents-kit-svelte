/**
 * Focus helpers for settings: where focus goes when a dialog route closes, a bar unmounts or a
 * list item is removed. No DOM access at import time, so node tests can load the pure parts.
 */
import type { Attachment } from 'svelte/attachments';

/** Attribute `rememberOpener` sets, so the opener can be found again after a re-render. */
export const OPENER_ATTRIBUTE = 'data-settings-opener';

const openers = new Map<string, HTMLElement>();

/**
 * Marks an element (usually the link or button that opens a dialog route) as the opener for
 * `key`. Activating it remembers it; `openerFor(key)` gives it back, or a selector for the
 * re-rendered element when the original left the DOM during navigation.
 *
 * @example <a href="?dialog=delete" {@attach rememberOpener('delete')}>Delete…</a>
 */
export function rememberOpener(key: string): Attachment<HTMLElement> {
	return (node) => {
		node.setAttribute(OPENER_ATTRIBUTE, key);
		const remember = () => openers.set(key, node);
		node.addEventListener('click', remember, true);
		node.addEventListener('keydown', remember, true);
		return () => {
			node.removeEventListener('click', remember, true);
			node.removeEventListener('keydown', remember, true);
		};
	};
}

/** The remembered opener for `key` if still connected, else a selector for any element marked with that key. */
export function openerFor(key: string): HTMLElement | string {
	const node = openers.get(key);
	if (node?.isConnected) return node;
	return `[${OPENER_ATTRIBUTE}="${CSS.escape(key)}"]`;
}

function isVisible(node: HTMLElement): boolean {
	if (typeof node.checkVisibility === 'function') return node.checkVisibility({ visibilityProperty: true });
	return node.getClientRects().length > 0;
}

/**
 * Focuses the first candidate that is connected, visible (`checkVisibility`) and not disabled.
 * Strings are selectors, looked up in the document.
 *
 * @returns Whether something took focus.
 */
export function restoreFocus(...candidates: (HTMLElement | string | null | undefined)[]): boolean {
	for (const candidate of candidates) {
		const node = typeof candidate === 'string' ? document.querySelector<HTMLElement>(candidate) : candidate;
		if (!node || !node.isConnected || !isVisible(node) || (node as HTMLButtonElement).disabled) continue;
		node.focus();
		if (document.activeElement === node) return true;
	}
	return false;
}

/**
 * Which item should take focus after the item at `removedIndex` was removed: the one that moved
 * into its place (the next), else the new last one (the previous), else none.
 *
 * @param removedIndex - Index the removed item had.
 * @param remaining - How many items are left.
 * @returns The index to focus, or null when the list is empty.
 */
export function focusIndexAfterRemoval(removedIndex: number, remaining: number): number | null {
	if (remaining <= 0) return null;
	return Math.min(Math.max(removedIndex, 0), remaining - 1);
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The element to focus after a list item was removed and the DOM updated (`await tick()` first):
 * the first focusable element of the next item, else the previous one, else `fallback` (the
 * list's heading, with `tabindex="-1"`).
 *
 * @param list - The list element; its element children are the items (those with `hidden` are skipped: a filter hides them).
 * @param removedIndex - Index the removed item had.
 * @param fallback - Where focus goes when the list is empty.
 */
export function nextFocusAfterRemoval(list: HTMLElement, removedIndex: number, fallback: HTMLElement | null = null): HTMLElement | null {
	const items = (Array.from(list.children) as HTMLElement[]).filter((item) => !item.hidden);
	const index = focusIndexAfterRemoval(removedIndex, items.length);
	if (index === null) return fallback;
	const item = items[index];
	return item.matches(FOCUSABLE) ? item : (item.querySelector<HTMLElement>(FOCUSABLE) ?? fallback);
}

/**
 * True when nobody holds focus any more: it fell back to the page, or its element was removed or
 * disabled (the browser has not moved it yet). Call it in the browser only.
 */
export function focusLost(): boolean {
	const active = document.activeElement as HTMLElement | null;
	return !active || active === document.body || !active.isConnected || active.matches(':disabled');
}

/** Elements that take focus themselves. */
const CONTROL = 'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]';

/**
 * The control to focus after a failed save: the first `[aria-invalid="true"]` that can take
 * focus. A group marked invalid as a whole (a `role="radiogroup"` or a fieldset, which cannot
 * take focus) gives its checked choice, else its first enabled control. Disabled controls and
 * groups with nothing enabled are skipped.
 */
export function firstInvalidControl(root: ParentNode): HTMLElement | null {
	for (const node of root.querySelectorAll<HTMLElement>('[aria-invalid="true"]')) {
		if (node.matches(':disabled')) continue;
		if (node.matches(CONTROL)) return node;
		const inner = node.querySelector<HTMLElement>('input:checked:not([disabled]):not([type="hidden"])') ?? node.querySelector<HTMLElement>(CONTROL);
		if (inner) return inner;
	}
	return null;
}
