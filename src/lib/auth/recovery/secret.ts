/** Removes spaces, dashes and line breaks: the key as an authenticator app wants it. */
export function plainSecret(secret: string): string {
	return secret.replace(/[\s-]+/g, '');
}

/**
 * Splits a setup key into groups for reading aloud or typing, e.g. `JBSWY3DPEHPK3PXP` becomes
 * `JBSW Y3DP EHPK 3PXP`. Characters and case are kept.
 *
 * @param secret - The key as given.
 * @param size - Characters per group.
 */
export function groupSecret(secret: string, size = 4): string {
	const plain = plainSecret(secret);
	if (size < 1) return plain;
	const groups: string[] = [];
	for (let i = 0; i < plain.length; i += size) groups.push(plain.slice(i, i + size));
	return groups.join(' ');
}
