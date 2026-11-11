/** A time as an ISO string, a millisecond timestamp or a Date. */
export type TimeInput = string | number | Date;

/** Milliseconds since the epoch, or `NaN` when the input is not a valid time. */
export function toMillis(input: TimeInput): number {
	return input instanceof Date ? input.getTime() : typeof input === 'number' ? input : Date.parse(input);
}

/**
 * How much time has passed since `since`, as short text with no "ago": "under a minute", "12 min",
 * "3 h 10 min", "1 day", "2 days". Callers add their own wording ("seen 12 min ago").
 * Floors to whole minutes. Returns an empty string when either time is not valid.
 * A time in the future counts as now.
 */
export function formatElapsed(since: TimeInput, now: TimeInput): string {
	const a = toMillis(since);
	const b = toMillis(now);
	if (!Number.isFinite(a) || !Number.isFinite(b)) return '';
	const minutes = Math.floor(Math.max(0, b - a) / 60_000);
	if (minutes < 1) return 'under a minute';
	if (minutes < 60) return `${minutes} min`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) {
		const rest = minutes % 60;
		return rest ? `${hours} h ${rest} min` : `${hours} h`;
	}
	const days = Math.floor(hours / 24);
	return days === 1 ? '1 day' : `${days} days`;
}
