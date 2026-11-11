/**
 * Pure helpers for the menus and pickers. Import-free, so `node --test` loads this file
 * directly (tests/primitives-menus.test.ts).
 */

/**
 * The default matcher: every whitespace-separated word of `query` appears, ignoring case,
 * in one of `texts`. An empty query matches everything.
 */
export function matchesQuery(texts: readonly (string | undefined)[], query: string): boolean {
	const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
	if (words.length === 0) return true;
	const haystack = texts
		.filter((text): text is string => typeof text === 'string')
		.join(' ')
		.toLowerCase();
	return words.every((word) => haystack.includes(word));
}

/** One run of items under a heading; `name` is null for items without a group. */
export interface Section<T> {
	name: string | null;
	items: T[];
}

/**
 * Groups items by their `group` field, keeping the order in which each group first
 * appears. Items without a group form one unnamed section at the place the first of them
 * appears.
 */
export function groupBy<T extends { group?: string }>(items: readonly T[]): Section<T>[] {
	const sections: Section<T>[] = [];
	const byName = new Map<string | null, Section<T>>();
	for (const item of items) {
		const name = item.group ?? null;
		let section = byName.get(name);
		if (!section) {
			section = { name, items: [] };
			byName.set(name, section);
			sections.push(section);
		}
		section.items.push(item);
	}
	return sections;
}

/** A parsed keyboard shortcut such as `mod+k` or `ctrl+shift+p`. */
export interface Shortcut {
	key: string;
	mod: boolean;
	ctrl: boolean;
	meta: boolean;
	alt: boolean;
	shift: boolean;
}

/**
 * Parses `mod+k`, `ctrl+shift+p`, `alt+/`. `mod` is ⌘ on Apple platforms and Ctrl
 * elsewhere. Returns null for a spec without a key.
 */
export function parseShortcut(spec: string): Shortcut | null {
	const parts = spec
		.toLowerCase()
		.split('+')
		.map((part) => part.trim());
	// "mod++" means the plus key.
	if (spec.endsWith('++')) parts.splice(parts.length - 2, 2, '+');
	const shortcut: Shortcut = { key: '', mod: false, ctrl: false, meta: false, alt: false, shift: false };
	for (const part of parts) {
		if (part === 'mod' || part === 'cmdorctrl') shortcut.mod = true;
		else if (part === 'ctrl' || part === 'control') shortcut.ctrl = true;
		else if (part === 'meta' || part === 'cmd' || part === 'command') shortcut.meta = true;
		else if (part === 'alt' || part === 'option') shortcut.alt = true;
		else if (part === 'shift') shortcut.shift = true;
		else if (part !== '') shortcut.key = part;
	}
	return shortcut.key === '' ? null : shortcut;
}

/** The parts of a KeyboardEvent the matcher reads. */
export interface KeyLike {
	key: string;
	ctrlKey: boolean;
	metaKey: boolean;
	altKey: boolean;
	shiftKey: boolean;
}

/** Whether a key event is exactly this shortcut (no extra modifiers). */
export function matchesShortcut(event: KeyLike, spec: string, apple: boolean): boolean {
	const shortcut = parseShortcut(spec);
	if (!shortcut) return false;
	const ctrl = shortcut.ctrl || (shortcut.mod && !apple);
	const meta = shortcut.meta || (shortcut.mod && apple);
	return (
		event.key.toLowerCase() === shortcut.key &&
		event.ctrlKey === ctrl &&
		event.metaKey === meta &&
		event.altKey === shortcut.alt &&
		event.shiftKey === shortcut.shift
	);
}

const APPLE_SYMBOLS = { ctrl: '⌃', alt: '⌥', shift: '⇧', meta: '⌘' } as const;

/** Human text for a shortcut: `⌘K` on Apple platforms, `Ctrl+K` elsewhere. */
export function formatShortcut(spec: string, apple: boolean): string {
	const shortcut = parseShortcut(spec);
	if (!shortcut) return '';
	const key = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key[0].toUpperCase() + shortcut.key.slice(1);
	const ctrl = shortcut.ctrl || (shortcut.mod && !apple);
	const meta = shortcut.meta || (shortcut.mod && apple);
	if (apple) {
		return [
			ctrl && APPLE_SYMBOLS.ctrl,
			shortcut.alt && APPLE_SYMBOLS.alt,
			shortcut.shift && APPLE_SYMBOLS.shift,
			meta && APPLE_SYMBOLS.meta,
			key
		]
			.filter(Boolean)
			.join('');
	}
	return [ctrl && 'Ctrl', meta && 'Meta', shortcut.alt && 'Alt', shortcut.shift && 'Shift', key].filter(Boolean).join('+');
}

/** Whether a user agent string is an Apple platform (⌘ instead of Ctrl). */
export function isApplePlatform(userAgent: string): boolean {
	return /Mac|iPhone|iPad|iPod/.test(userAgent);
}

/** The parts of an event target the text-entry check reads. */
export interface TargetLike {
	tagName?: string;
	type?: string;
	isContentEditable?: boolean;
}

const NON_TEXT_INPUTS = new Set([
	'button',
	'checkbox',
	'color',
	'file',
	'hidden',
	'image',
	'radio',
	'range',
	'reset',
	'submit'
]);

/** Whether typing into this target enters text (inputs, textareas, selects, contenteditable). */
export function isTextEntry(target: TargetLike | null | undefined): boolean {
	if (!target) return false;
	if (target.isContentEditable) return true;
	const tag = target.tagName?.toUpperCase();
	if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
	return tag === 'INPUT' && !NON_TEXT_INPUTS.has((target.type ?? 'text').toLowerCase());
}
