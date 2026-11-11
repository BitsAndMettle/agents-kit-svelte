/**
 * Pure timing rule for the document tooltip slot (the delay group). Self-contained (no
 * imports); time is an input, so it is tested without fake timers.
 *
 * - Another tooltip is showing: the next one replaces it at once (moving along a toolbar).
 * - A tooltip closed less than `skipDelay` ms ago: the next one opens at once (skip-delay).
 * - Otherwise the group is cold: wait `delay` ms (warm-up).
 */
export interface DelayGroupState {
	/** Some tooltip is visible right now. */
	readonly showing: boolean;
	/** performance.now() of the last close of a visible tooltip; -Infinity if none. */
	readonly lastClosedAt: number;
}

export interface OpenTiming {
	readonly now: number;
	/** Warm-up before the first tooltip opens, ms. */
	readonly delay: number;
	/** Window after a close in which the next tooltip skips the delay, ms. */
	readonly skipDelay: number;
}

/** ms to wait before showing; 0 means show now. `instant` marks a skip (no enter animation needed). */
export function openDelay(state: DelayGroupState, timing: OpenTiming): { wait: number; instant: boolean } {
	const warm = state.showing || timing.now - state.lastClosedAt < timing.skipDelay;
	if (warm) return { wait: 0, instant: true };
	return { wait: Math.max(0, timing.delay), instant: false };
}
