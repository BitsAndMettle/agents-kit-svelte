/**
 * Pure selection math for option lists (Select, Combobox, Listbox). Self-contained (no
 * imports). Values are option values; `order` is the navigable options in CURRENT DOM
 * order, read by the shell at event time (filtered lists change it).
 *
 * Selection is always an array here; single-select patterns hold at most one value.
 * Multi-select arrays keep the order values were selected in.
 */

/** Click / Enter / Space on `value`. Single: it becomes the selection. Multiple: toggles it. */
export function toggleValue(selected: readonly string[], value: string, multiple: boolean): string[] {
	if (!multiple) return [value];
	return selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value];
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
