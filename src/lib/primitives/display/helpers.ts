import type { UiTone } from '../../ui/styles';

/**
 * Up to two uppercase initials from a display name: first and last word, or the first two
 * letters of a single word. Returns `''` for an empty name.
 *
 * @param name - Display name, e.g. "Ada Lovelace".
 * @returns Initials such as `AL`.
 */
export function initialsFromName(name: string): string {
	const words = name.trim().split(/\s+/).filter(Boolean);
	if (words.length === 0) return '';
	const chars = (word: string) => Array.from(word);
	if (words.length === 1) return chars(words[0]).slice(0, 2).join('').toUpperCase();
	return (chars(words[0])[0] + chars(words[words.length - 1])[0]).toUpperCase();
}

/**
 * Deterministic bucket for a name, so the same person always gets the same avatar colour.
 *
 * @param name - Display name.
 * @param buckets - Number of colours to choose from.
 * @returns Integer in `[0, buckets)`.
 */
export function toneIndexFromName(name: string, buckets: number): number {
	let hash = 2166136261;
	for (const ch of name.trim().toLowerCase()) hash = Math.imul(hash ^ ch.codePointAt(0)!, 16777619) >>> 0;
	hash = Math.imul(hash ^ (hash >>> 15), 2246822519) >>> 0;
	hash ^= hash >>> 13;
	hash >>>= 0;
	return buckets > 0 ? hash % buckets : 0;
}

/** Solid fill and text per tone. The fill is mixed toward the text colour so white-on-colour stays readable in both themes. */
export const SOLID_TONE_CLASS: Record<UiTone, string> = {
	neutral: 'bg-fg-main text-fg-inverse',
	accent: 'bg-[color-mix(in_oklch,var(--ak-color-accent)_80%,var(--ak-color-fg))] text-fg-inverse',
	success: 'bg-[color-mix(in_oklch,var(--ak-color-success)_78%,var(--ak-color-fg))] text-fg-inverse',
	warning: 'bg-[color-mix(in_oklch,var(--ak-color-warning)_70%,var(--ak-color-fg))] text-fg-inverse',
	danger: 'bg-[color-mix(in_oklch,var(--ak-color-danger)_80%,var(--ak-color-fg))] text-fg-inverse'
};

/** Legible text per tone for soft and outline looks: the tone mixed toward the foreground so small text clears 4.5:1 in both themes. */
export const READABLE_TONE_TEXT: Record<UiTone, string> = {
	neutral: 'text-fg-light',
	accent: 'text-[color-mix(in_oklch,var(--ak-color-accent)_55%,var(--ak-color-fg))]',
	success: 'text-[color-mix(in_oklch,var(--ak-color-success)_55%,var(--ak-color-fg))]',
	warning: 'text-[color-mix(in_oklch,var(--ak-color-warning)_50%,var(--ak-color-fg))]',
	danger: 'text-[color-mix(in_oklch,var(--ak-color-danger)_55%,var(--ak-color-fg))]'
};

/** Outline text and border per tone. */
export const OUTLINE_TONE_CLASS: Record<UiTone, string> = {
	neutral: 'border border-card-border bg-transparent text-fg-light',
	accent: 'border border-accent-primary/40 bg-transparent',
	success: 'border border-status-success/40 bg-transparent',
	warning: 'border border-status-warning/40 bg-transparent',
	danger: 'border border-status-danger/40 bg-transparent'
};

/** Resolved key cap: what to draw and what a screen reader should say. */
export interface ResolvedKey {
	display: string;
	label: string;
}

const MAC_SYMBOLS: Record<string, ResolvedKey> = {
	cmd: { display: '⌘', label: 'Command' },
	command: { display: '⌘', label: 'Command' },
	meta: { display: '⌘', label: 'Command' },
	ctrl: { display: '⌃', label: 'Control' },
	control: { display: '⌃', label: 'Control' },
	alt: { display: '⌥', label: 'Option' },
	option: { display: '⌥', label: 'Option' },
	shift: { display: '⇧', label: 'Shift' },
	enter: { display: '↵', label: 'Return' },
	return: { display: '↵', label: 'Return' },
	backspace: { display: '⌫', label: 'Delete' },
	esc: { display: 'Esc', label: 'Escape' }
};

/**
 * Resolves a key name to its cap. `Mod` is the platform's primary modifier (⌘ on Mac, Ctrl elsewhere).
 * On Mac the common modifiers become symbols with a spoken label; other keys pass through.
 *
 * @param key - Key name such as `Ctrl`, `K` or `Mod`.
 * @param mac - Whether to use Mac symbols.
 * @returns The text to show and the spoken label.
 */
export function resolveKey(key: string, mac: boolean): ResolvedKey {
	const lower = key.toLowerCase();
	if (lower === 'mod') return mac ? MAC_SYMBOLS.cmd : { display: 'Ctrl', label: 'Control' };
	if (mac && MAC_SYMBOLS[lower]) return MAC_SYMBOLS[lower];
	return { display: key, label: key };
}

/**
 * Clamps a progress value into `[min, max]` and returns its fill percentage.
 *
 * @param value - Current value.
 * @param min - Lower bound.
 * @param max - Upper bound.
 * @returns Percentage from 0 to 100 (0 when the range is empty).
 */
export function progressPercent(value: number, min: number, max: number): number {
	if (!(max > min)) return 0;
	const clamped = Math.min(max, Math.max(min, value));
	return ((clamped - min) / (max - min)) * 100;
}

/** Soft tints for initials avatars, chosen by name. Text stays the foreground colour so contrast holds in both themes. */
export const AVATAR_TINTS = [
	'bg-[color-mix(in_oklch,var(--ak-chart-1)_34%,var(--ak-color-surface))]',
	'bg-[color-mix(in_oklch,var(--ak-chart-2)_34%,var(--ak-color-surface))]',
	'bg-[color-mix(in_oklch,var(--ak-chart-3)_34%,var(--ak-color-surface))]',
	'bg-[color-mix(in_oklch,var(--ak-chart-4)_34%,var(--ak-color-surface))]',
	'bg-[color-mix(in_oklch,var(--ak-chart-5)_34%,var(--ak-color-surface))]',
	'bg-[color-mix(in_oklch,var(--ak-chart-6)_34%,var(--ak-color-surface))]'
] as const;
