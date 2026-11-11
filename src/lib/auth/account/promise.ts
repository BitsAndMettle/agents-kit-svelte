/** True when a callback handed back a promise, so its button should show loading until it settles. */
export function isThenable(value: unknown): value is PromiseLike<unknown> {
	return typeof (value as PromiseLike<unknown> | null | undefined)?.then === 'function';
}
