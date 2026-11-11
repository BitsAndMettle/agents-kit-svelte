/**
 * Pure selection rules shared by Accordion and ToggleGroup. Self-contained (no imports).
 * The selection is always a list here; single-mode patterns convert at their boundary.
 */
export interface ToggleRule {
	/** Several values may be selected at once. */
	readonly multiple: boolean;
	/** Single mode: may the selected value be deselected (leaving none)? */
	readonly collapsible: boolean;
}

/** Toggle `value` in `selected`. Returns the same array when nothing changes. */
export function toggleValue(selected: readonly string[], value: string, rule: ToggleRule): readonly string[] {
	const on = selected.includes(value);
	if (rule.multiple) return on ? selected.filter((v) => v !== value) : [...selected, value];
	if (on) return rule.collapsible ? [] : selected;
	return [value];
}

/** Make `value` selected (never deselects): find-in-page reveal, programmatic open. */
export function includeValue(selected: readonly string[], value: string, multiple: boolean): readonly string[] {
	if (selected.includes(value)) return selected;
	return multiple ? [...selected, value] : [value];
}
