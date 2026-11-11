/**
 * How many characters before `maxlength` a counter starts speaking: 10% of the limit,
 * at least 10, never more than the limit itself.
 */
export function nearLimitThreshold(max: number): number {
	return Math.min(max, Math.max(10, Math.ceil(max * 0.1)));
}

/**
 * What a character counter announces: nothing while the text is far from the limit, then
 * how many characters are left, then that the limit is reached.
 *
 * @param length - Characters typed.
 * @param max - The `maxlength`.
 * @param threshold - Characters left at which announcing starts.
 * @returns The message, or '' when there is nothing to say.
 */
export function counterMessage(length: number, max: number, threshold: number): string {
	const left = max - length;
	if (left > threshold) return '';
	if (left <= 0) return `Character limit reached, ${max} of ${max} used`;
	return left === 1 ? '1 character left' : `${left} characters left`;
}
