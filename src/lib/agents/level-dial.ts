/** Pure helpers for `LevelDial`. */

/** One autonomy level, listed from least to most autonomy. */
export interface AutonomyLevel {
	id: string;
	label: string;
	summary: string;
	/** What the agent does on its own at this level. */
	allows?: string[];
	/** What the agent still asks about at this level. */
	asks?: string[];
}

/** Which way a change moves along the levels. */
export type LevelDirection = 'up' | 'down';

/** What differs between two levels, by list. */
export interface LevelChanges {
	/** Newly done without asking. */
	allowsAdded: string[];
	/** No longer done without asking. */
	allowsRemoved: string[];
	/** Newly asked about. */
	asksAdded: string[];
	/** No longer asked about. */
	asksRemoved: string[];
}

/**
 * Compares two levels' `allows` and `asks` lists.
 *
 * @param from - The current level.
 * @param to - The level being previewed.
 * @returns Items added to and removed from each list, in list order.
 */
export function levelChanges(from: AutonomyLevel, to: AutonomyLevel): LevelChanges {
	const diff = (a: string[] = [], b: string[] = []) => ({
		added: b.filter((item) => !a.includes(item)),
		removed: a.filter((item) => !b.includes(item))
	});
	const allows = diff(from.allows, to.allows);
	const asks = diff(from.asks, to.asks);
	return {
		allowsAdded: allows.added,
		allowsRemoved: allows.removed,
		asksAdded: asks.added,
		asksRemoved: asks.removed
	};
}

/**
 * Tells which way moving between two levels goes.
 *
 * @param levels - Levels in order from least to most autonomy.
 * @param fromId - Current level id.
 * @param toId - Target level id.
 * @returns `up`, `down`, or `null` when the ids are equal or unknown.
 */
export function levelDirection(levels: AutonomyLevel[], fromId: string, toId: string): LevelDirection | null {
	const from = levels.findIndex((level) => level.id === fromId);
	const to = levels.findIndex((level) => level.id === toId);
	if (from < 0 || to < 0 || from === to) return null;
	return to > from ? 'up' : 'down';
}

/**
 * Moves an index by one step without wrapping.
 *
 * @param index - Current index.
 * @param delta - `1` or `-1`.
 * @param length - Number of levels.
 * @returns The clamped index.
 */
export function stepIndex(index: number, delta: number, length: number): number {
	return Math.min(Math.max(index + delta, 0), Math.max(length - 1, 0));
}
