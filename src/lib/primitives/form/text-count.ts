/** Where a character count stands, as given to a Textarea's `formatCount` and `formatRemaining`. */
export interface CharacterCount {
	/** Characters typed. */
	length: number;
	/** The `maxlength`. */
	max: number;
	/** Characters left (0 at the limit). */
	left: number;
}

/** Turns a character count into words. */
export type CharacterCountFormatter = (count: CharacterCount) => string;

/** English default for the count read with the textarea's description. */
export const formatCharacterCount: CharacterCountFormatter = ({ length, max }) => `${length} of ${max} characters used`;

/** English default for the announcement near the limit. */
export const formatCharactersLeft: CharacterCountFormatter = ({ left, max }) =>
	left <= 0 ? `Character limit reached, ${max} of ${max} used` : left === 1 ? '1 character left' : `${left} characters left`;

/**
 * How many characters before `maxlength` a counter starts speaking: 10% of the limit,
 * at least 10, never more than the limit itself.
 */
export function nearLimitThreshold(max: number): number {
	return Math.min(max, Math.max(10, Math.ceil(max * 0.1)));
}

/**
 * What a character counter announces: nothing while the text is far from the limit, then
 * the formatted count of what is left.
 *
 * @param length - Characters typed.
 * @param max - The `maxlength`.
 * @param threshold - Characters left at which announcing starts.
 * @param format - Words for the count (English by default).
 * @returns The message, or '' when there is nothing to say.
 */
export function counterMessage(
	length: number,
	max: number,
	threshold: number,
	format: CharacterCountFormatter = formatCharactersLeft
): string {
	const left = Math.max(0, max - length);
	if (left > threshold) return '';
	return format({ length, max, left });
}
