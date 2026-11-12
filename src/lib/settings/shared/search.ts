/**
 * Settings search and filtering. Matching ignores case and diacritics ("resume" finds "Résumé"),
 * and highlight ranges point into the original text. A leaf: type-only imports, no DOM.
 */
import type { PaletteCommand } from '../../primitives/menus/types';
import type { SettingsItem, SettingsNavGroup, SettingsSearchEntry } from './types';

/** A half-open range `[start, end)` of UTF-16 indices into the original string. */
export type TextRange = [number, number];

/** One search hit. Lower `score` ranks higher. */
export interface SettingsSearchResult {
	entry: SettingsSearchEntry;
	/** Matched parts of `entry.label`, sorted and merged. */
	ranges: TextRange[];
	/** Matched parts of `entry.description`, sorted and merged. */
	descriptionRanges: TextRange[];
	score: number;
}

interface Folded {
	text: string;
	/** Original start index of each folded character. */
	start: number[];
	/** Original end index (exclusive) of each folded character, including trailing combining marks. */
	end: number[];
}

/** Lower-cases and strips diacritics, remembering where each folded character came from. */
function fold(source: string): Folded {
	let text = '';
	const start: number[] = [];
	const end: number[] = [];
	for (let i = 0; i < source.length; ) {
		const char = String.fromCodePoint(source.codePointAt(i)!);
		const folded = char.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
		const next = i + char.length;
		if (folded === '' && end.length) end[end.length - 1] = next;
		for (const unit of folded.split('')) {
			text += unit;
			start.push(i);
			end.push(next);
		}
		i = next;
	}
	return { text, start, end };
}

/** The search words of a query, folded. */
export function queryTokens(query: string): string[] {
	return fold(query).text.split(/\s+/).filter(Boolean);
}

const WORD = /[\p{L}\p{N}]/u;

function isWordStart(text: string, index: number): boolean {
	return index === 0 || !WORD.test(text[index - 1]);
}

/** Every index where `token` occurs in `text`. */
function occurrences(text: string, token: string): number[] {
	const out: number[] = [];
	for (let i = text.indexOf(token); i !== -1; i = text.indexOf(token, i + 1)) out.push(i);
	return out;
}

/** The best place to highlight: the first word-start occurrence, else the first one. */
function bestOccurrence(text: string, token: string): number {
	const all = occurrences(text, token);
	return all.find((i) => isWordStart(text, i)) ?? all[0] ?? -1;
}

function toRange(folded: Folded, index: number, length: number): TextRange {
	return [folded.start[index], folded.end[index + length - 1]];
}

/** Sorts and merges overlapping or touching ranges. */
export function mergeRanges(ranges: TextRange[]): TextRange[] {
	const sorted = [...ranges].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
	const out: TextRange[] = [];
	for (const [from, to] of sorted) {
		const last = out.at(-1);
		if (last && from <= last[1]) last[1] = Math.max(last[1], to);
		else out.push([from, to]);
	}
	return out;
}

/**
 * Splits text at the ranges, for rendering matches in `<mark>`.
 *
 * @returns Pieces in order; `match` is true for highlighted ones.
 */
export function highlightSegments(text: string, ranges: readonly TextRange[]): { text: string; match: boolean }[] {
	const out: { text: string; match: boolean }[] = [];
	let at = 0;
	for (const [from, to] of mergeRanges([...ranges])) {
		if (from > at) out.push({ text: text.slice(at, from), match: false });
		if (to > from) out.push({ text: text.slice(from, to), match: true });
		at = Math.max(at, to);
	}
	if (at < text.length) out.push({ text: text.slice(at), match: false });
	return out;
}

/**
 * Tier of one token for one entry, lower is better; undefined when it matches nowhere.
 * 0: the label starts with it. 1: a label word starts with it. 2: a keyword word starts with it.
 * 3: it appears anywhere else (inside a label word, a keyword, the description or the section).
 */
function tierOf(token: string, label: string, keywords: string[], rest: string[]): number | undefined {
	if (label.startsWith(token)) return 0;
	if (occurrences(label, token).some((i) => isWordStart(label, i))) return 1;
	if (keywords.some((k) => occurrences(k, token).some((i) => isWordStart(k, i)))) return 2;
	if (label.includes(token) || keywords.some((k) => k.includes(token)) || rest.some((r) => r.includes(token))) return 3;
	return undefined;
}

/**
 * Finds settings matching every word of `query`. Ranking: the label starts with a word, then a
 * label word starts with it, then a keyword does, then it appears anywhere (the description or
 * section included); scores add up across words, ties keep the entries' order.
 *
 * @param entries - One entry per searchable setting.
 * @param query - What the person typed.
 * @param limit - Most results to return (default 20).
 */
export function searchSettings(entries: readonly SettingsSearchEntry[], query: string, limit = 20): SettingsSearchResult[] {
	const tokens = queryTokens(query);
	if (!tokens.length || limit <= 0) return [];
	const hits: (SettingsSearchResult & { order: number })[] = [];
	entries.forEach((entry, order) => {
		const label = fold(entry.label);
		const description = fold(entry.description ?? '');
		const keywords = (entry.keywords ?? []).map((k) => fold(k).text);
		const rest = [description.text, fold(entry.section).text];
		let score = 0;
		const ranges: TextRange[] = [];
		const descriptionRanges: TextRange[] = [];
		for (const token of tokens) {
			const tier = tierOf(token, label.text, keywords, rest);
			if (tier === undefined) return;
			score += tier;
			const inLabel = bestOccurrence(label.text, token);
			if (inLabel !== -1) ranges.push(toRange(label, inLabel, token.length));
			const inDescription = bestOccurrence(description.text, token);
			if (inDescription !== -1) descriptionRanges.push(toRange(description, inDescription, token.length));
		}
		hits.push({ entry, ranges: mergeRanges(ranges), descriptionRanges: mergeRanges(descriptionRanges), score, order });
	});
	hits.sort((a, b) => a.score - b.score || a.order - b.order);
	return hits.slice(0, limit).map(({ order: _order, ...hit }) => hit);
}

/**
 * Keeps the links whose label, description, meta, keywords or group label contain every word of
 * `query` (case and diacritics ignored), and drops groups left empty. An empty query returns
 * `groups` itself.
 */
export function filterSettingsLinks(groups: SettingsNavGroup[], query: string): SettingsNavGroup[] {
	const tokens = queryTokens(query);
	if (!tokens.length) return groups;
	const out: SettingsNavGroup[] = [];
	for (const group of groups) {
		const groupText = fold(group.label ?? '').text;
		const items = group.items.filter((link) => {
			const haystack = [link.label, link.description, link.meta, ...(link.keywords ?? [])]
				.filter(Boolean)
				.map((t) => fold(t as string).text)
				.concat(groupText)
				.join('\n');
			return tokens.every((token) => haystack.includes(token));
		});
		if (items.length) out.push({ ...group, items });
	}
	return out;
}

/**
 * Items whose label, description, meta, badges or status contain every word of `query`, with the
 * same folding as `filterSettingsLinks` and `searchSettings` (case and diacritics ignored), so a
 * list filter and the navigation filter agree on a query. An empty query keeps everything, in order.
 */
export function filterSettingsItems<T extends SettingsItem>(items: readonly T[], query: string): T[] {
	const tokens = queryTokens(query);
	if (!tokens.length) return [...items];
	return items.filter((item) => {
		const haystack = fold(
			[item.label, item.description, ...(item.meta ?? []), ...(item.badges ?? []).map((b) => b.label), item.status?.label].filter(Boolean).join(' ')
		).text;
		return tokens.every((token) => haystack.includes(token));
	});
}

/**
 * The same entries as CommandPalette commands, grouped by section, so one index serves both the
 * settings search and a Cmd-K palette.
 *
 * @param navigate - Follows an entry's `href` (your router's `goto`).
 */
export function toPaletteCommands(entries: readonly SettingsSearchEntry[], navigate: (href: string) => void): PaletteCommand[] {
	return entries.map((entry) => ({
		id: entry.id,
		label: entry.label,
		description: entry.description,
		icon: entry.icon,
		group: entry.section,
		keywords: [...(entry.keywords ?? []), entry.section],
		onRun: () => navigate(entry.href)
	}));
}
