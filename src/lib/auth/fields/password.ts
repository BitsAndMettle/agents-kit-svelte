/** Pure helpers for `PasswordInput`: the rule checklist. */

/** One requirement the caller wants shown, e.g. "At least 12 characters". The kit does not judge passwords: your `test` does. */
export interface PasswordRule {
	label: string;
	test: (value: string) => boolean;
}

/**
 * Runs every rule against the value. A rule that throws counts as unmet.
 *
 * @param rules - The caller's rules.
 * @param value - The current password text.
 * @returns One flag per rule, true when met.
 */
export function evaluateRules(rules: readonly PasswordRule[], value: string): boolean[] {
	return rules.map((rule) => {
		try {
			return Boolean(rule.test(value));
		} catch {
			return false;
		}
	});
}

/** Default wording for the quiet summary: "2 of 4 requirements met". */
export function defaultRulesSummary(met: number, total: number): string {
	return `${met} of ${total} requirements met`;
}
