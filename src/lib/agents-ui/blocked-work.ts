/** Types and pure helpers for `BlockedWorkList`. */

/** Why an item is stuck. `kind` groups items; `label` is the sentence the person reads. */
export interface BlockedReason {
	/** Stable group key, e.g. `unstarted`, `blocker-closed`, `hold`, `parked`, `needs-person`. */
	kind: string;
	label: string;
	detail?: string;
	/** When it got stuck, as text you format yourself, e.g. "40 min ago". */
	since?: string;
}

/** Something the person may do about one item. The caller decides which actions are allowed. */
export interface BlockedAction {
	id: string;
	label: string;
	tone?: 'default' | 'danger';
	/** When set, the row asks this question inline before the action fires. */
	confirm?: string;
}

export interface BlockedItem {
	id: string;
	title: string;
	/** A short reference, e.g. "#3412". */
	ref?: string;
	reason: BlockedReason;
	/** Only the actions allowed for this item. */
	actions: BlockedAction[];
	/** Shown when there are no actions, instead of the default muted text. */
	note?: string;
	/** True while a call for this item is in flight. */
	busy?: boolean;
}

export interface BlockedGroup {
	kind: string;
	label: string;
	items: BlockedItem[];
}

/** Turns `blocker-closed` into "Blocker closed". */
export function humanizeBlockedKind(kind: string): string {
	const words = kind.replace(/[-_]+/g, ' ').trim();
	return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Other';
}

/**
 * Groups items by reason kind. Groups follow `order` first (kinds not listed come after, in the
 * order they first appear); items keep their input order inside a group.
 *
 * @param items - Stuck items.
 * @param order - Optional kind precedence.
 * @param labels - Optional group headings by kind.
 * @returns Non-empty groups.
 */
export function groupBlockedWork(items: BlockedItem[], order: string[] = [], labels: Record<string, string> = {}): BlockedGroup[] {
	const byKind = new Map<string, BlockedItem[]>();
	for (const item of items) {
		const list = byKind.get(item.reason.kind);
		if (list) list.push(item);
		else byKind.set(item.reason.kind, [item]);
	}
	const firstSeen = [...byKind.keys()];
	const rank = (kind: string): number => {
		const i = order.indexOf(kind);
		return i === -1 ? order.length + firstSeen.indexOf(kind) : i;
	};
	return firstSeen
		.sort((a, b) => rank(a) - rank(b))
		.map((kind) => ({ kind, label: labels[kind] ?? humanizeBlockedKind(kind), items: byKind.get(kind) ?? [] }));
}

/**
 * Whether an item should show as busy: its own `busy` flag or a caller-held set of ids.
 *
 * @param item - The item.
 * @param busyIds - Ids with a call in flight.
 */
export function isBlockedItemBusy(item: BlockedItem, busyIds?: Iterable<string>): boolean {
	if (item.busy) return true;
	if (!busyIds) return false;
	for (const id of busyIds) if (id === item.id) return true;
	return false;
}
