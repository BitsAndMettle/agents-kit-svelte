import { toMillis, type TimeInput } from '../core/time.ts';

export type { TimeInput };

/**
 * The time of day as "02:10", in `timeZone` (default UTC so server and browser agree).
 * Returns an empty string when the time is not valid.
 */
export function clockTime(time: TimeInput, timeZone = 'UTC'): string {
	const ms = toMillis(time);
	if (!Number.isFinite(ms)) return '';
	try {
		return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).format(ms);
	} catch {
		return '';
	}
}
