/**
 * Pure rules behind SettingsItemList: sub-group placement and the selection a bulk action may
 * touch (the filter match is the shared `filterSettingsItems`). A leaf (type-only imports), so
 * node tests load it directly.
 */
import type { SettingsItem } from '../shared/types';

/**
 * Splits items into the main list and the named sub-groups, in the order the groups are given.
 * An item whose `group` names no known group stays in the main list.
 */
export function groupSettingsItems<T extends SettingsItem>(
	items: readonly T[],
	groups: readonly { id: string }[] = []
): { main: T[]; groups: Map<string, T[]> } {
	const known = new Set(groups.map((g) => g.id));
	const byGroup = new Map<string, T[]>(groups.map((g) => [g.id, []]));
	const main: T[] = [];
	for (const item of items) {
		if (item.group && known.has(item.group)) byGroup.get(item.group)!.push(item);
		else main.push(item);
	}
	return { main, groups: byGroup };
}

/** Selected ids that still exist and are not locked: what a bulk action may act on. */
export function selectableIds<T extends SettingsItem>(items: readonly T[], selected: readonly string[]): string[] {
	const open = new Set(items.filter((item) => !item.lock).map((item) => item.id));
	return selected.filter((id) => open.has(id));
}
