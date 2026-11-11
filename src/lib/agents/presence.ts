export type TimeInput = string | number | Date;

function toMs(input: TimeInput): number {
	return input instanceof Date ? input.getTime() : typeof input === 'number' ? input : Date.parse(input);
}

/**
 * How long ago something was, as short text: "under a minute", "12 min", "3 h 10 min", "2 days".
 * Returns an empty string when either time is not valid. A time in the future counts as now.
 */
export function relativeTime(since: TimeInput, now: TimeInput): string {
	const a = toMs(since);
	const b = toMs(now);
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

/**
 * The time of day as "02:10", in `timeZone` (default UTC so server and browser agree).
 * Returns an empty string when the time is not valid.
 */
export function clockTime(time: TimeInput, timeZone = 'UTC'): string {
	const ms = toMs(time);
	if (!Number.isFinite(ms)) return '';
	try {
		return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).format(ms);
	} catch {
		return '';
	}
}
