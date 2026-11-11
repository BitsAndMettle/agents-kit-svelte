/**
 * Pure typeahead. Self-contained (no imports). Time is an input, so tests need no timers.
 */

export interface TypeaheadState {
	readonly buffer: string;
	/** ms timestamp of the last accepted character. */
	readonly at: number;
}

export const TYPEAHEAD_IDLE: TypeaheadState = { buffer: '', at: 0 };

export const TYPEAHEAD_TIMEOUT = 500;

export interface TypeaheadInput {
	/** Normalised (lower-cased, trimmed) text of each item in DOM order. */
	readonly labels: readonly string[];
	readonly disabled: readonly boolean[];
	readonly current: number;
	readonly char: string;
	readonly now: number;
	/** Pause after which the buffer resets. Default 500ms. */
	readonly timeout?: number;
}

export interface TypeaheadResult {
	readonly state: TypeaheadState;
	/** Index to highlight, or -1 for "no match: keep the current highlight". */
	readonly index: number;
}

/**
 * Whether a buffer is still live at `now`. The shell uses it to decide whether Space is
 * a typeahead character (buffer live) or activates the highlighted item.
 */
export function isBuffering(state: TypeaheadState, now: number, timeout = TYPEAHEAD_TIMEOUT): boolean {
	return state.buffer !== '' && now - state.at <= timeout;
}

/**
 * Rules:
 * - buffer = (now - at > timeout ? '' : buffer) + char
 * - if the buffer is one letter, or one repeated letter ("aaa"), cycle through items
 *   starting with that letter, beginning AFTER the current item (so repeated presses step
 *   through, and a first press moves to the NEXT match, per APG)
 * - otherwise search for the first item starting with the whole buffer, beginning AT the
 *   current item (so typing "ap" after "a" landed on "apple" stays there)
 * - disabled items never match; search wraps once
 * - space is a character only when the buffer is non-empty (else it activates the item)
 */
export function typeahead(state: TypeaheadState, input: TypeaheadInput): TypeaheadResult {
	const timeout = input.timeout ?? TYPEAHEAD_TIMEOUT;
	const live = isBuffering(state, input.now, timeout) ? state.buffer : '';
	const char = input.char.toLowerCase();
	if (char === ' ' && live === '') return { state: TYPEAHEAD_IDLE, index: -1 };

	const buffer = live + char;
	const next: TypeaheadState = { buffer, at: input.now };
	const repeated = buffer.length > 1 && [...buffer].every((c) => c === buffer[0]);
	const needle = repeated ? buffer[0] : buffer;
	const count = input.labels.length;
	// A single repeated letter steps past the current item; a growing prefix may stay on it.
	const start = input.current < 0 ? 0 : repeated || buffer.length === 1 ? input.current + 1 : input.current;

	for (let n = 0; n < count; n++) {
		const i = (start + n) % count;
		if (!input.disabled[i] && input.labels[i].startsWith(needle)) return { state: next, index: i };
	}
	return { state: next, index: -1 };
}

/** Whether a key event is a typeahead character (single printable char, no ctrl/meta/alt). */
export function isTypeaheadKey(key: string, ctrl: boolean, meta: boolean, alt: boolean): boolean {
	return [...key].length === 1 && !ctrl && !meta && !alt;
}
