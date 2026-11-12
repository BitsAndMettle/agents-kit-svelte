/**
 * Pure helpers for the Settings shell group. A leaf: type-only imports, no DOM, no runes, so
 * node tests can load it with an explicit `.ts` path.
 */
import type { SettingLock, SettingsNavGroup } from '../shared/types';

/** What a narrow settings container shows: the grouped index, or one section's page. */
export type SettingsLayoutView = 'index' | 'section';

/**
 * Which view a narrow SettingsLayout shows. `auto` shows the index until a section is current.
 *
 * @param mode - The layout's `mode` prop.
 * @param current - The current section id, if any.
 */
export function layoutView(mode: 'auto' | 'section' | 'index', current: string | null | undefined): SettingsLayoutView {
	if (mode === 'auto') return current ? 'section' : 'index';
	return mode;
}

/**
 * Whether a SettingsLayout shows the index on its own at every width: nothing is current and the
 * mode does not insist on the page. A wide rail beside an empty page would hide the attention slot.
 */
export function layoutOverview(mode: 'auto' | 'section' | 'index', current: string | null | undefined): boolean {
	return mode !== 'section' && !current;
}

/** How many links the navigation shows (disabled ones included). */
export function countLinks(groups: readonly SettingsNavGroup[]): number {
	return groups.reduce((total, group) => total + group.items.length, 0);
}

/** A keyboard shortcut, parsed: `mod+k`, `ctrl+shift+f`, `/`. */
export interface SearchShortcut {
	/** Cmd on Apple platforms, Ctrl elsewhere. */
	mod: boolean;
	ctrl: boolean;
	alt: boolean;
	shift: boolean;
	/** The key, lower-cased (`k`, `/`). */
	key: string;
	/** Keys for `Kbd` (`['Mod', 'K']`). */
	keys: string[];
}

const KEY_NAMES: Record<string, string> = { mod: 'Mod', ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift' };

/**
 * Parses a shortcut such as `mod+k` or `/`. Returns undefined for `false`, an empty string or a
 * combination without a key.
 */
export function parseShortcut(shortcut: string | false | undefined): SearchShortcut | undefined {
	if (!shortcut) return undefined;
	const parts = shortcut === '+' ? ['+'] : shortcut.toLowerCase().split('+').map((p) => p.trim());
	const key = parts.at(-1);
	if (!key || key in KEY_NAMES) return undefined;
	const modifiers = new Set(parts.slice(0, -1));
	const keys = [...['mod', 'ctrl', 'alt', 'shift'].filter((m) => modifiers.has(m)).map((m) => KEY_NAMES[m]), key.length === 1 ? key.toUpperCase() : key[0].toUpperCase() + key.slice(1)];
	return { mod: modifiers.has('mod'), ctrl: modifiers.has('ctrl'), alt: modifiers.has('alt'), shift: modifiers.has('shift'), key, keys };
}

/** The parts of a keyboard event a shortcut looks at. */
export interface ShortcutEvent {
	key: string;
	metaKey: boolean;
	ctrlKey: boolean;
	altKey: boolean;
	shiftKey: boolean;
}

/**
 * Whether a key press is the shortcut. `mod` is Cmd when `mac`, else Ctrl. A single printable key
 * (`/`) ignores Shift, since some layouts need it to type the key.
 */
export function matchesShortcut(shortcut: SearchShortcut, event: ShortcutEvent, mac: boolean): boolean {
	if (event.key.toLowerCase() !== shortcut.key) return false;
	const wantMeta = shortcut.mod && mac;
	const wantCtrl = shortcut.ctrl || (shortcut.mod && !mac);
	if (event.metaKey !== wantMeta || event.ctrlKey !== wantCtrl || event.altKey !== shortcut.alt) return false;
	const bare = !shortcut.mod && !shortcut.ctrl && !shortcut.alt;
	return bare && shortcut.key.length === 1 ? true : event.shiftKey === shortcut.shift;
}

/** A lock covering a subtree, with the id of its visible reason (the `SettingsScope['lock']` shape). */
export interface CoveringLock {
	lock: SettingLock;
	reasonId: string;
}

/**
 * The lock a page passes down: the stronger of its own and the one from above. A tie goes to the
 * page's own lock, so its reason (the nearer one) describes the controls.
 *
 * @param own - The page's own lock, if any.
 * @param ownReasonId - Id of the element that shows the page's own reason.
 * @param inherited - The lock from an enclosing scope, if any.
 * @param pick - The shared precedence (`pickLock`); passed in so this file stays a leaf.
 */
export function coveringLock(
	own: SettingLock | undefined,
	ownReasonId: string,
	inherited: CoveringLock | undefined,
	pick: (...locks: (SettingLock | undefined)[]) => SettingLock | undefined
): CoveringLock | undefined {
	const strongest = pick(own, inherited?.lock);
	if (!strongest) return undefined;
	return own && strongest === own ? { lock: own, reasonId: ownReasonId } : inherited;
}

/**
 * The message a settings callback's result asks to show: its `error`, else its field `errors`
 * joined, else nothing. Anything that is not a `SettingsResult` shows nothing.
 */
export function resultMessage(result: unknown): string | undefined {
	if (!result || typeof result !== 'object') return undefined;
	const { error, errors } = result as { error?: unknown; errors?: unknown };
	if (typeof error === 'string' && error.trim()) return error;
	if (errors && typeof errors === 'object') {
		const messages = Object.values(errors).filter((m): m is string => typeof m === 'string' && m.trim() !== '');
		if (messages.length) return messages.join(' ');
	}
	return undefined;
}

/**
 * The full stop a spoken part needs so a screen reader pauses after it: `'.'`, or `''` when the
 * part is empty or already ends in punctuation.
 */
export function sentenceStop(part: string): '' | '.' {
	const trimmed = part.trim();
	return trimmed === '' || /[.!?…:;]$/.test(trimmed) ? '' : '.';
}

/** A spoken part as its own sentence: trimmed, with a full stop unless it already has one. */
export function asSentence(part: string): string {
	return `${part.trim()}${sentenceStop(part)}`;
}

/** Spoken text for a navigation badge: a number is a count, a word is read as it is. */
export function badgeLabel(value: string | number): string {
	return typeof value === 'number' ? `Count: ${value}` : value;
}
