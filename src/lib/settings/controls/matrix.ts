/**
 * Pure rules behind NotificationMatrix: cell keys, column state and column toggles, event groups.
 * A leaf (no imports), so node tests load it directly.
 */

/** The value one cell posts: `${event}:${channel}`. */
export function matrixCellKey(event: string, channel: string): string {
	return `${event}:${channel}`;
}

/** Splits a cell key at its last colon (event ids may contain colons; channel ids should not). */
export function parseMatrixCellKey(key: string): { event: string; channel: string } | null {
	const at = key.lastIndexOf(':');
	if (at <= 0 || at === key.length - 1) return null;
	return { event: key.slice(0, at), channel: key.slice(at + 1) };
}

/** How many of a column's changeable cells are on: all, some (the toggle shows mixed) or none. */
export type MatrixColumnState = 'all' | 'some' | 'none';

/**
 * The state of a column toggle.
 *
 * @param keys - The column's changeable cell keys (locked and disabled cells left out).
 * @param selected - The keys that are on.
 */
export function matrixColumnState(keys: readonly string[], selected: Iterable<string>): MatrixColumnState {
	if (keys.length === 0) return 'none';
	const on = new Set(selected);
	const count = keys.filter((key) => on.has(key)).length;
	return count === 0 ? 'none' : count === keys.length ? 'all' : 'some';
}

/**
 * Turns every changeable cell of a column on or off, keeping the order of the rest.
 *
 * @param selected - The keys that are on now.
 * @param keys - The column's changeable cell keys.
 * @param on - The new state for those cells.
 * @returns The new list of keys that are on.
 */
export function toggleMatrixColumn(selected: readonly string[], keys: readonly string[], on: boolean): string[] {
	if (!on) {
		const column = new Set(keys);
		return selected.filter((key) => !column.has(key));
	}
	const present = new Set(selected);
	return [...selected, ...keys.filter((key) => !present.has(key))];
}

/** Events in groups, in the order each group first appears; ungrouped events form a group without a label. */
export function groupMatrixEvents<E extends { group?: string }>(events: readonly E[]): { group?: string; events: E[] }[] {
	const groups: { group?: string; events: E[] }[] = [];
	const byName = new Map<string | undefined, { group?: string; events: E[] }>();
	for (const event of events) {
		let entry = byName.get(event.group);
		if (!entry) {
			entry = { group: event.group, events: [] };
			byName.set(event.group, entry);
			groups.push(entry);
		}
		entry.events.push(event);
	}
	return groups;
}
