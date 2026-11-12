/**
 * Element ids built from app ids. A leaf (no imports), so node tests load it directly.
 */

/**
 * Turns any string into a part of an element id with no `-` in it, one-to-one: letters and digits
 * stay, every other character becomes `_<code point in base 36>_`. Join parts with `-` and two
 * different inputs can never give the same id ("a-b" + "c" and "a" + "b-c" stay apart).
 */
export function idPart(text: string): string {
	return text.replace(/[^A-Za-z0-9]/gu, (char) => `_${(char.codePointAt(0) ?? 0).toString(36)}_`);
}
