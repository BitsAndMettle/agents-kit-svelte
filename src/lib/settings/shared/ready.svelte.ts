/**
 * False on the server and during hydration, true after the first effect runs (mounted).
 *
 * Rule: only JS-only affordances wait for it: copy, reveal, a matrix column toggle, an instant
 * control with no `action` (nothing to post). A control with a native fallback (a form post, a
 * link) is never disabled by it. Construct it while a component initialises.
 */
export class ReadyGate {
	#mounted = $state(false);
	#override: (() => boolean | undefined) | undefined;

	/** @param override - Reads a `ready` prop; when it returns a boolean, that wins. */
	constructor(override?: () => boolean | undefined) {
		this.#override = override;
		$effect(() => {
			this.#mounted = true;
		});
	}

	get current(): boolean {
		return this.#override?.() ?? this.#mounted;
	}
}
