/**
 * Pure rules behind SettingsItemList: the filter match, sub-group placement and the selection a
 * bulk action may touch. A leaf (type-only imports), so node tests load it directly.
 */
import type { SettingsItem } from '../shared/types';

function fold(text: string): string {
	return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/**
 * Items whose label, description, meta, badges or status contain every word of `query`
 * (case and accents ignored). An empty query keeps everything, in order.
 */
export function filterSettingsItems<T extends SettingsItem>(items: readonly T[], query: string): T[] {
	const words = fold(query).split(/\s+/).filter(Boolean);
	if (words.length === 0) return [...items];
	return items.filter((item) => {
		const haystack = fold(
			[item.label, item.description, ...(item.meta ?? []), ...(item.badges ?? []).map((b) => b.label), item.status?.label].filter(Boolean).join(' ')
		);
		return words.every((word) => haystack.includes(word));
	});
}

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
