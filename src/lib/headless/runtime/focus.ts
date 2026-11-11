/**
 * DOM focus helpers. Internal.
 *
 * There is deliberately NO hand-rolled focus trap. A modal surface is always a `<dialog>`
 * opened with `showModal()`: the browser makes everything outside it inert, so Tab cycles
 * through the dialog and the browser chrome, which is the current APG guidance and what
 * screen readers expect. Sheets, drawers, alert dialogs and the command palette are all
 * `<dialog>`s with different styling.
 */

const FOCUSABLE = [
	'a[href]',
	'area[href]',
	'button',
	'input:not([type="hidden"])',
	'select',
	'textarea',
	'iframe',
	'summary',
	'audio[controls]',
	'video[controls]',
	'[contenteditable]:not([contenteditable="false"])',
	'[tabindex]'
].join(',');

function visible(el: HTMLElement): boolean {
	return typeof el.checkVisibility === 'function' ? el.checkVisibility() : el.getClientRects().length > 0;
}

function disabled(el: HTMLElement): boolean {
	return (el as HTMLButtonElement).disabled === true || el.closest('fieldset:disabled') !== null;
}

/** Tabbable descendants in tab order (skips inert, hidden, disabled, tabindex < 0). */
export function tabbables(root: HTMLElement): HTMLElement[] {
	const found = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
		(el) => el.tabIndex >= 0 && !disabled(el) && !el.closest('[inert]') && visible(el)
	);
	const positive = found.filter((el) => el.tabIndex > 0).sort((a, b) => a.tabIndex - b.tabIndex);
	return [...positive, ...found.filter((el) => el.tabIndex === 0)];
}

/** Focus without scrolling the page under a fixed/top-layer surface. */
export function focusQuietly(el: HTMLElement | null): boolean {
	if (!el || !el.isConnected) return false;
	el.focus({ preventScroll: true });
	return el.ownerDocument.activeElement === el;
}

/** Connected, not inert, not disabled, visible, focusable. Used by focus-return fallbacks. */
export function canFocus(el: Element | null): el is HTMLElement {
	if (!(el instanceof HTMLElement) || !el.isConnected) return false;
	if (el === el.ownerDocument.body) return false;
	const focusable = el.tabIndex >= 0 || el.hasAttribute('tabindex');
	return focusable && !disabled(el) && !el.closest('[inert]') && visible(el);
}

/** Whether `el` is something a keyboard press activates natively (Enter/Space fire click). */
export function activatesNatively(el: Element): boolean {
	return el.matches('button, a[href], input, select, textarea, summary, [contenteditable]:not([contenteditable="false"])');
}
