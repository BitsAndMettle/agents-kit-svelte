/** Small readers for auth form data. */

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
