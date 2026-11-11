/**
 * Pure selection rules shared by every pattern that selects values: Select, Combobox and
 * Listbox (option lists) and Accordion and ToggleGroup (groups). Self-contained (no imports).
 * The selection is always an array; single-value patterns hold at most one value and convert
 * at their boundary. Multi-select arrays keep the order values were selected in. `order` is
 * the navigable items in CURRENT DOM order, read by the shell at event time.
 */

export interface ToggleRule {
	/** Several values may be selected at once. */
	readonly multiple: boolean;
	/** Single mode: may the selected value be deselected (leaving none)? Option lists: no. */
	readonly collapsible: boolean;
}

/** Click / Enter / Space on `value`. Returns the same array when nothing changes. */
export function toggleValue(selected: readonly string[], value: string, rule: ToggleRule): readonly string[] {
	const on = selected.includes(value);
	if (rule.multiple) return on ? selected.filter((v) => v !== value) : [...selected, value];
	if (on) return rule.collapsible ? [] : selected;
	return [value];
}

/** Make `value` selected, never deselecting: find-in-page reveal, programmatic open. */
export function includeValue(selected: readonly string[], value: string, multiple: boolean): readonly string[] {
	if (selected.includes(value)) return selected;
	return multiple ? [...selected, value] : [value];
}

/**
 * Values from `from` to `to` inclusive, in `order`, whichever comes first. A `from` that is
 * null or no longer rendered gives just `[to]`; a `to` that is not rendered gives `[]`.
 */
export function rangeValues(order: readonly string[], from: string | null, to: string): string[] {
	const end = order.indexOf(to);
	if (end < 0) return [];
	const start = from === null ? -1 : order.indexOf(from);
	if (start < 0) return [to];
	return order.slice(Math.min(start, end), Math.max(start, end) + 1);
}

/** Union that keeps `selected` first, then the new values in their given order. */
export function addValues(selected: readonly string[], add: readonly string[]): string[] {
	const out = [...selected];
	for (const value of add) if (!out.includes(value)) out.push(value);
	return out;
}

/** Ctrl/Cmd+A: select every value in `all`, or clear them all when they already are. */
export function toggleAll(selected: readonly string[], all: readonly string[]): string[] {
	const every = all.length > 0 && all.every((v) => selected.includes(v));
	return every ? selected.filter((v) => !all.includes(v)) : addValues(selected, all);
}

/** Same values in the same order (selection order is observable through `value`). */
export function sameValues(a: readonly string[], b: readonly string[]): boolean {
	return a.length === b.length && a.every((v, i) => v === b[i]);
}
