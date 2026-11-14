/** Small readers for submitted form data. A leaf module: safe on a server, no DOM. */

/**
 * Reads a text field from form data: the trimmed string, or '' when absent. Passwords and codes
 * keep their spaces: pass `trim: false`.
 */
export function readText(data: FormData, name: string, trim = true): string {
	const value = data.get(name);
	if (typeof value !== 'string') return '';
	return trim ? value.trim() : value;
}

/** Reads a checkbox from form data: true when it was checked. */
export function readCheck(data: FormData, name: string): boolean {
	return data.has(name);
}

const FALSE_VALUES = new Set(['', 'false', 'off', '0']);

/**
 * Reads a boolean that posts either way: a hidden `false` followed by a checkbox `true` under the
 * same name. The last value wins, so a checked box posts `false,true` and reads true, and an
 * unchecked one posts only `false`. A lone checkbox works too (`on` reads true, absent reads false).
 *
 * @param data - The submitted form data.
 * @param name - The shared field name.
 * @returns False when the name is absent or its last value is '', `false`, `off` or `0`; true otherwise.
 */
export function readBoolean(data: FormData, name: string): boolean {
	const values = data.getAll(name).filter((v): v is string => typeof v === 'string');
	const last = values.at(-1);
	return last !== undefined && !FALSE_VALUES.has(last.trim().toLowerCase());
}
