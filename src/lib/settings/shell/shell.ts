/**
 * Pure helpers for the Settings shell group. A leaf: type-only imports, no DOM, no runes, so
 * node tests can load it with an explicit `.ts` path.
 */
import type { SettingsNavGroup } from '../shared/types';

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
