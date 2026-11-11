/** Pure helpers for `DeviceApprovalCard`. */

const DIGIT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

/**
 * Splits a match code into display groups. Codes without separators are grouped
 * (default three characters per group, so "482913" becomes "482 913"); codes that
 * already contain spaces or hyphens keep their own grouping, so word codes survive.
 *
 * @param code - Raw match code.
 * @param size - Characters per group for ungrouped codes.
 * @returns Display groups, in order.
 */
export function groupCode(code: string, size = 3): string[] {
	const trimmed = code.trim();
	if (!trimmed) return [];
	const parts = trimmed.split(/[\s-]+/).filter(Boolean);
	if (parts.length > 1) return parts;
	const chars = Array.from(parts[0]);
	const groups: string[] = [];
	for (let i = 0; i < chars.length; i += size) groups.push(chars.slice(i, i + size).join(''));
	return groups;
}

/**
 * Text a screen reader reads for a code: digits one at a time ("four eight two"),
 * words as written, groups separated by a pause.
 *
 * @param code - Raw match code.
 * @returns Spoken text.
 */
export function speakCode(code: string): string {
	return groupCode(code)
		.map((group) =>
			Array.from(group)
				.map((ch) => (/[0-9]/.test(ch) ? DIGIT_WORDS[Number(ch)] : ch))
				.join(/^[0-9]+$/.test(group) ? ' ' : '')
		)
		.join(', ');
}

/**
 * Formats a duration in milliseconds as a short phrase ("4 min", "45 sec", "1 h 5 min").
 *
 * @param ms - Duration; negative values count as zero.
 * @returns Short phrase.
 */
export function formatDuration(ms: number): string {
	const total = Math.max(0, Math.round(ms / 1000));
	if (total < 60) return `${total} sec`;
	const minutes = Math.floor(total / 60);
	if (minutes < 60) return `${minutes} min`;
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/**
 * Relative age of a request ("just now", "2 min ago").
 *
 * @param requestedAt - ISO timestamp of the request.
 * @param now - Reference time (ISO string, Date or epoch ms).
 * @returns Phrase; empty when either time is not valid.
 */
export function formatRequestedAgo(requestedAt: string, now: string | number | Date): string {
	const start = Date.parse(requestedAt);
	const end = new Date(now).getTime();
	if (Number.isNaN(start) || Number.isNaN(end)) return '';
	const diff = end - start;
	if (diff < 10_000) return 'just now';
	return `${formatDuration(diff)} ago`;
}

export interface TimeLeft {
	/** Milliseconds left, never negative. */
	ms: number;
	expired: boolean;
	/** "4 min left" or "Expired". */
	label: string;
}

/**
 * Time left until `expiresAt`.
 *
 * @param expiresAt - ISO expiry, or undefined for a request that does not expire.
 * @param now - Reference time (ISO string, Date or epoch ms).
 * @returns Time left, or `null` when there is no valid expiry.
 */
export function timeLeft(expiresAt: string | undefined, now: string | number | Date): TimeLeft | null {
	if (!expiresAt) return null;
	const end = Date.parse(expiresAt);
	const current = new Date(now).getTime();
	if (Number.isNaN(end) || Number.isNaN(current)) return null;
	const ms = end - current;
	if (ms <= 0) return { ms: 0, expired: true, label: 'Expired' };
	return { ms, expired: false, label: `${formatDuration(ms)} left` };
}

export interface ApprovalGate {
	/** The person ticked "the code matches". */
	confirmed: boolean;
	/** A decision was already pressed and the agent has not answered yet. */
	locked: boolean;
	/** The request is still pending (not approving, decided or expired). */
	open: boolean;
	expiresAt: string | undefined;
	/** Current time at the moment of the press. */
	now: string | number | Date;
}

/**
 * Whether Approve may fire right now. Re-checks expiry against the time given, so a
 * stale render cannot approve an expired request.
 *
 * @param gate - Current state of the card.
 * @returns True only when confirmed, unlocked, open and not past expiry.
 */
export function canApproveNow(gate: ApprovalGate): boolean {
	if (!gate.confirmed || gate.locked || !gate.open) return false;
	return !timeLeft(gate.expiresAt, gate.now)?.expired;
}
