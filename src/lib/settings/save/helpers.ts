/**
 * Pure helpers of the save group: change summaries, undo ownership, conflict choices,
 * consequence groups and reassignment fields. A leaf (type-only imports), so node tests load it.
 */
import type { ConflictField, ConsequenceGroup, ConsequenceItem, ReassignOption, ReassignSpec, SettingsChange } from '../shared/types';

/** Which side of an edit conflict to keep for one field. */
export type ConflictKeep = 'mine' | 'theirs' | 'both';

/** The tone words a consequence can carry, mapped to the kit's colour tones. */
export const CONSEQUENCE_TONES = {
	ok: 'success',
	no: 'danger',
	warn: 'warning',
	info: 'neutral'
} as const satisfies Record<ConsequenceItem['tone'], 'success' | 'danger' | 'warning' | 'neutral'>;

/**
 * The first `max` changes to show, and how many are left over ("+N more").
 *
 * @param changes - Every unsaved change, in field order.
 * @param max - How many to list (at least 0).
 */
export function summarizeChanges(changes: readonly SettingsChange[], max: number): { shown: SettingsChange[]; more: number } {
	const limit = Math.max(0, Math.floor(max));
	const shown = changes.slice(0, limit);
	return { shown, more: changes.length - shown.length };
}

/**
 * True when a notice's undo token no longer owns the undo point: the app passed a different
 * current token, or `null` (nothing can be undone now). An unknown current token (`undefined`)
 * never supersedes.
 */
export function isSuperseded(undoToken: string | number | undefined, currentToken: string | number | null | undefined): boolean {
	if (undoToken === undefined || currentToken === undefined) return false;
	return currentToken === null || currentToken !== undoToken;
}

/**
 * The choice per conflicting field: the given value, else the default, else "theirs" (the latest
 * saved version). "Both" falls back to "theirs" where the field does not allow it.
 */
export function conflictChoices(
	fields: readonly ConflictField[],
	value?: Readonly<Record<string, ConflictKeep>>,
	defaultValue?: Readonly<Record<string, ConflictKeep>>
): Record<string, ConflictKeep> {
	const out: Record<string, ConflictKeep> = {};
	for (const field of fields) {
		const wanted = value?.[field.name] ?? defaultValue?.[field.name] ?? 'theirs';
		out[field.name] = wanted === 'both' && !field.allowBoth ? 'theirs' : wanted;
	}
	return out;
}

/** True when the consequences are titled groups rather than one flat list. */
export function isGroupList(consequences: readonly ConsequenceItem[] | readonly ConsequenceGroup[]): consequences is readonly ConsequenceGroup[] {
	return consequences.length > 0 && 'items' in consequences[0];
}

/**
 * A flat consequence list as titled groups: its effects under `happens`, then its `ok` items (what
 * keeps working) under `stays`. One group when the list has only one kind.
 */
export function groupFlatConsequences(items: readonly ConsequenceItem[], happens: string, stays: string): ConsequenceGroup[] {
	const effects = items.filter((item) => item.tone !== 'ok');
	const kept = items.filter((item) => item.tone === 'ok');
	if (effects.length === 0 || kept.length === 0) return [{ label: happens, items: [...items] }];
	return [
		{ label: happens, items: effects },
		{ label: stays, items: kept }
	];
}

/**
 * The heading level `steps` below `level`, kept within h2 to h6.
 *
 * @param level - The starting level.
 * @param steps - How many levels down (default 1).
 */
export function headingBelow(level: number, steps = 1): 2 | 3 | 4 | 5 | 6 {
	return Math.min(6, Math.max(2, Math.floor(level) + steps)) as 2 | 3 | 4 | 5 | 6;
}

/** The posted name of one dependent's replacement: `reassign.<id>` (or `<name>.<id>`). */
export function reassignFieldName(spec: Pick<ReassignSpec, 'name'>, id: string): string {
	return `${spec.name ?? 'reassign'}.${id}`;
}

/** The choices offered for one dependent. */
export function reassignOptions(spec: Pick<ReassignSpec, 'options'>, id: string): ReassignOption[] {
	return typeof spec.options === 'function' ? spec.options(id) : spec.options;
}

/**
 * The starting replacement for every dependent: `defaultFor(id)` when it names an enabled option,
 * else the first enabled option, else an empty string.
 */
export function reassignDefaults(spec: Pick<ReassignSpec, 'dependents' | 'options' | 'defaultFor'>): Record<string, string> {
	const out: Record<string, string> = {};
	for (const dependent of spec.dependents) {
		const options = reassignOptions(spec, dependent.id).filter((o) => !o.disabled);
		const wanted = spec.defaultFor?.(dependent.id);
		out[dependent.id] = options.some((o) => o.value === wanted) ? (wanted as string) : (options[0]?.value ?? '');
	}
	return out;
}

/** Reads each dependent's replacement from posted form data (anything with `get`). */
export function readReassign(data: { get(name: string): unknown }, spec: Pick<ReassignSpec, 'name' | 'dependents'>): Record<string, string> {
	const out: Record<string, string> = {};
	for (const dependent of spec.dependents) {
		const value = data.get(reassignFieldName(spec, dependent.id));
		out[dependent.id] = typeof value === 'string' ? value : '';
	}
	return out;
}

/**
 * The failure a settings callback reported, as one sentence: its `error`, else its first field
 * error, else its conflict's message, else `fallback` for a conflict without one. Undefined for
 * a success (nothing, `{}`, a notice) and for values that are not a result at all.
 */
export function resultFailure(result: unknown, fallback: string): string | undefined {
	if (!result || typeof result !== 'object') return undefined;
	const { error, errors, conflict } = result as { error?: unknown; errors?: Record<string, unknown>; conflict?: { message?: unknown } };
	const message = error || Object.values(errors ?? {}).find(Boolean) || conflict?.message;
	if (message) return String(message);
	return conflict ? fallback : undefined;
}

/**
 * Room to keep at the bottom of one scroller for every bar covering it: the tallest wins. Each
 * SaveBar that sticks or floats over a scroller adds its height under its own key and removes it
 * when it hides, so focus scrolling (`scroll-padding-bottom`) never parks a field under a bar.
 */
export class ScrollRoom {
	#rooms = new Map<symbol, number>();

	/** Sets (or, with `undefined`, removes) the room one bar needs. Returns the room to apply now. */
	set(key: symbol, px: number | undefined): number {
		if (px === undefined) this.#rooms.delete(key);
		else this.#rooms.set(key, Math.max(0, px));
		return this.current;
	}

	/** The room to apply: the largest any bar needs, or 0. */
	get current(): number {
		let most = 0;
		for (const px of this.#rooms.values()) most = Math.max(most, px);
		return most;
	}

	get empty(): boolean {
		return this.#rooms.size === 0;
	}
}
