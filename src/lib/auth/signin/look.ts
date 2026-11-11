/** Classes and small helpers shared by the sign-in cards. Pure: nothing here touches the DOM. */

/** A text link or link-styled button inside an auth card. */
export const LINK_CLASS =
	'rounded-sm font-medium text-fg-main underline underline-offset-2 hover:text-accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary/70';

/** True when a callback handed back a promise, so its button should show loading until it settles. */
export function isThenable(value: unknown): value is PromiseLike<unknown> {
	return typeof (value as PromiseLike<unknown> | null | undefined)?.then === 'function';
}
