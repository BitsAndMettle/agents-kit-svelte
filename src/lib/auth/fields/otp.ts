/** Pure helpers for `OtpInput`: what a code may contain, how an edit changes it, and which cell is active. */

/**
 * Keeps only the characters a code may hold: digits, or letters and digits when `alphanumeric`.
 * Spaces, dashes and anything else are dropped, so "123 456" and "123-456" both read "123456".
 * Full-width characters ("１２３") are folded to plain ones first (NFKC), so an IME or a phone keyboard works.
 *
 * @param text - Typed, pasted or autofilled text.
 * @param length - The code's length; extra characters are cut.
 * @param alphanumeric - Allow letters as well as digits.
 * @returns The cleaned code, at most `length` characters.
 */
export function normalizeCode(text: string, length: number, alphanumeric = false): string {
	const allowed = alphanumeric ? /[^0-9A-Za-z]/g : /[^0-9]/g;
	return text.normalize('NFKC').replace(allowed, '').slice(0, Math.max(0, length));
}

/** The code and caret after an edit. */
export interface CodeEdit {
	/** The new code: clean, at most `length` characters. */
	value: string;
	/** Where the caret goes: right after the inserted text. */
	caret: number;
}

/**
 * Applies an insert (typed, pasted, dropped or autofilled text) to a code, the one rule every
 * insert path in `OtpInput` goes through.
 *
 * - The inserted text is cleaned first (`normalizeCode`): full-width folded, separators and
 *   disallowed characters dropped.
 * - A whole code (as long as `length` once cleaned) inserted into a full code replaces it, wherever the caret is.
 * - Overwrite mode: with a collapsed caret before the last cell of a full code, the inserted text
 *   replaces the characters after the caret ("123456", caret 2, "9" gives "129456"), so a full code
 *   can be corrected without deleting first.
 * - Otherwise the selection `[start, end)` is replaced by the cleaned text ("123456" with `[2, 3)`
 *   and "999" gives "129994"), and the result is cut to `length`.
 * - An insert that cleans to nothing (a space, a dash, a letter in a numeric code) changes nothing,
 *   so a stray separator never wipes a selection.
 *
 * @param prev - The code before the edit (clean).
 * @param start - `selectionStart` before the edit.
 * @param end - `selectionEnd` before the edit.
 * @param inserted - The raw inserted text.
 * @param length - The code's length.
 * @param alphanumeric - Allow letters as well as digits.
 * @returns The new code, and the caret right after the inserted text (clamped to the code).
 */
export function applyEdit(prev: string, start: number, end: number, inserted: string, length: number, alphanumeric = false): CodeEdit {
	const max = Math.max(0, length);
	const from = Math.min(Math.max(Math.min(start, end), 0), prev.length);
	const to = Math.min(Math.max(start, end, from), prev.length);
	const text = normalizeCode(inserted, max, alphanumeric);
	if (text === '') {
		const value = prev.slice(0, max);
		return { value, caret: Math.min(to, value.length) };
	}
	// A whole code pasted over a full code replaces it wherever the caret is: retrying a wrong code by pasting works.
	if (prev.length >= max && text.length >= max) return { value: text.slice(0, max), caret: max };
	const overwrite = from === to && prev.length >= max && from < max;
	const value = (prev.slice(0, from) + text + prev.slice(overwrite ? from + text.length : to)).slice(0, max);
	return { value, caret: Math.min(from + text.length, value.length) };
}

/**
 * Which cells are drawn as active for a caret or selection in the input.
 *
 * - A caret sits in the cell it is about to fill (the last cell once the code is full).
 * - A selection marks every cell it covers.
 *
 * @param start - `selectionStart` of the input.
 * @param end - `selectionEnd` of the input.
 * @param length - Number of cells.
 * @returns A flag per cell.
 */
export function activeCells(start: number, end: number, length: number): boolean[] {
	const cells = Array<boolean>(length).fill(false);
	if (length <= 0) return cells;
	if (end > start) {
		for (let i = start; i < Math.min(end, length); i++) cells[i] = true;
		return cells;
	}
	cells[Math.min(Math.max(start, 0), length - 1)] = true;
	return cells;
}

/**
 * The caret position a click at `x` should give: the clicked cell's index, but never past the
 * end of the text, so the caret cannot hide in an empty cell beyond the next one to fill.
 *
 * @param x - Pointer offset from the left edge of the cells.
 * @param width - Total width of the cells.
 * @param length - Number of cells.
 * @param valueLength - Characters typed so far.
 * @returns A caret position between 0 and `valueLength`.
 */
export function caretForClick(x: number, width: number, length: number, valueLength: number): number {
	if (width <= 0 || length <= 0) return valueLength;
	const cell = Math.floor((Math.min(Math.max(x, 0), width - 1) / width) * length);
	return Math.min(cell, valueLength);
}

/**
 * True when the cell at `index` starts a new visual group (so it gets a wider gap before it).
 *
 * @param index - Cell index.
 * @param groupSize - Cells per group; 0 or less means no grouping.
 */
export function startsGroup(index: number, groupSize: number): boolean {
	return groupSize > 0 && index > 0 && index % groupSize === 0;
}
