/**
 * Typed confirmation ("type the name to delete it"). `phrasePattern` gates the submit natively
 * through `pattern=`, so it works without JavaScript; `matchesPhrase` is the same rule in code.
 * The server must check the phrase again. A leaf.
 */

/** How a typed phrase is compared. Defaults: case-sensitive, surrounding spaces ignored. */
export interface PhraseOptions {
	caseSensitive?: boolean;
	trim?: boolean;
}

/**
 * True when `typed` is the confirmation phrase. Both sides are Unicode-normalised (NFC), so the
 * same letters typed with a different keyboard still match.
 */
export function matchesPhrase(typed: string, phrase: string, options: PhraseOptions = {}): boolean {
	const { caseSensitive = true, trim = true } = options;
	let a = typed.normalize('NFC');
	let b = phrase.normalize('NFC');
	if (trim) {
		a = a.trim();
		b = b.trim();
	}
	if (!caseSensitive) {
		a = a.toLowerCase();
		b = b.toLowerCase();
	}
	return b.length > 0 && a === b;
}

/** Characters with a meaning in a pattern; escaped with a backslash, which is valid in both `u` and `v` mode. */
const SYNTAX = /[\\^$.*+?()[\]{}|/]/g;

/**
 * An escaped pattern for an input's native `pattern` attribute (matched against the whole value,
 * in `v` mode), so the form will not submit until the phrase is typed. Case-insensitive letters
 * become `[aA]` classes; `trim` allows surrounding whitespace. Characters whose upper case is not
 * a single character (such as ß) must be typed as given.
 *
 * @param phrase - The phrase to require.
 * @param options - Same as `matchesPhrase`.
 */
export function phrasePattern(phrase: string, options: PhraseOptions = {}): string {
	const { caseSensitive = true, trim = true } = options;
	const text = trim ? phrase.normalize('NFC').trim() : phrase.normalize('NFC');
	let body = '';
	for (const char of text) {
		const lower = char.toLowerCase();
		const upper = char.toUpperCase();
		if (!caseSensitive && lower !== upper && [...lower].length === 1 && [...upper].length === 1) body += `[${lower}${upper}]`;
		else body += char.replace(SYNTAX, '\\$&');
	}
	return trim ? `\\s*${body}\\s*` : body;
}
