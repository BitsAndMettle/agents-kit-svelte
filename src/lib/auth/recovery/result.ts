/** What a submit handler may hand back (the shape of `AuthResult`, kept local so this file stays a leaf). */
type Outcome = void | { error?: string; errors?: Partial<Record<string, string | undefined>> };

/** True when a handler result reports an error, form-level or per field. */
export function failed(result: Outcome): boolean {
	if (!result) return false;
	return Boolean(result.error) || Object.values(result.errors ?? {}).some(Boolean);
}

/**
 * Passes a handler's outcome through unchanged and runs `onSuccess` once it is known to be a
 * success: now for a plain result, after it settles for a promise. A rejection or an error result
 * never runs it.
 */
export function afterSuccess<T extends Outcome | PromiseLike<Outcome>>(outcome: T, onSuccess: () => void): T {
	if (typeof (outcome as PromiseLike<Outcome> | undefined | null)?.then === 'function') {
		return (outcome as PromiseLike<Outcome>).then((result) => {
			if (!failed(result)) onSuccess();
			return result;
		}) as T;
	}
	if (!failed(outcome as Outcome)) onSuccess();
	return outcome;
}
