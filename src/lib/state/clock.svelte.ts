import type { TimeInput } from '../core/time';

/**
 * The time a component measures against. Returns `now` when the caller passes one. Otherwise it
 * is `undefined` during server render and the first client render, then the current time once
 * mounted, refreshed every `intervalMs`. Call it while the component initialises.
 */
export function useClock(getNow: () => TimeInput | undefined, intervalMs = 30_000): { readonly value: TimeInput | undefined } {
	let ticking = $state<number | undefined>(undefined);
	$effect(() => {
		if (getNow() !== undefined) return;
		ticking = Date.now();
		const id = setInterval(() => (ticking = Date.now()), intervalMs);
		return () => clearInterval(id);
	});
	return {
		get value() {
			return getNow() ?? ticking;
		}
	};
}
