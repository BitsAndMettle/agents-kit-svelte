import type { TimeInput } from '../../core/time';

/**
 * Whole seconds left until `until`, never negative. 0 when there is no valid time.
 *
 * @param until - When the wait ends.
 * @param now - The current time in milliseconds.
 */
export function secondsLeft(until: TimeInput | undefined, now: number): number {
	if (until === undefined) return 0;
	// Same reading as core/time's toMillis, inlined so this file stays a leaf (node tests load it directly).
	const end = until instanceof Date ? until.getTime() : typeof until === 'number' ? until : Date.parse(until);
	if (!Number.isFinite(end)) return 0;
	return Math.max(0, Math.ceil((end - now) / 1000));
}
