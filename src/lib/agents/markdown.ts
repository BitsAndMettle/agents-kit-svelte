/**
 * Reads the Markdown a chat reply uses into plain data, which `Markdown.svelte` renders with ordinary
 * elements. Nothing here is HTML: every piece of text reaches the page as escaped text, so a reply cannot
 * inject markup, and a link survives only with an http(s) or mailto address.
 *
 * Every step is linear in the input: block rules are anchored line patterns, and inline spans are found by
 * one left-to-right scan whose closer searches only ever move forward, so a long hostile line costs no
 * more than a long plain one.
 *
 * ponytail: paragraphs, headings, flat lists, quotes, fenced code and inline bold, italic, code and links;
 * no nesting inside bold or italic, nested lists flatten and tables stay text.
 */

export type MarkdownInline =
	| { kind: 'text' | 'strong' | 'em' | 'code'; text: string }
	| { kind: 'link'; text: string; href: string };

export type MarkdownBlock =
	| { kind: 'p' | 'quote'; inlines: MarkdownInline[] }
	| { kind: 'heading'; level: number; inlines: MarkdownInline[] }
	| { kind: 'ul' | 'ol'; items: MarkdownInline[][] }
	| { kind: 'code'; text: string; language: string };

/** A link's address when it is an absolute http(s) or mailto URL; anything else (javascript:, data:, relative) is refused. */
export function safeHref(href: string): string | null {
	try {
		const url = new URL(href);
		return url.protocol === 'https:' || url.protocol === 'http:' || url.protocol === 'mailto:' ? url.href : null;
	} catch {
		return null;
	}
}

const WORD = /[\p{L}\p{N}]/u;
const SPACE = /\s/;
const isWord = (ch: string | undefined) => ch !== undefined && WORD.test(ch);
const isSpace = (ch: string | undefined) => ch === undefined || SPACE.test(ch);

function append(out: MarkdownInline[], piece: MarkdownInline): void {
	const last = out.at(-1);
	if (piece.kind === 'text' && last?.kind === 'text') last.text += piece.text;
	else if (piece.text) out.push(piece);
}

/**
 * The next position at or after `from` where `test` holds, remembered per delimiter. Callers ask with a
 * `from` that never decreases, so each character is examined at most once per delimiter: linear overall.
 */
function forwardFinder(text: string, needle: string, test: (at: number) => boolean = () => true) {
	let found = -2; // -2: not searched yet; -1: none to the end.
	return (from: number): number => {
		if (found === -1 || found >= from) return found;
		let at = from;
		while ((at = text.indexOf(needle, at)) !== -1 && !test(at)) at += 1;
		found = at;
		return found;
	};
}

export function parseInlines(text: string): MarkdownInline[] {
	const out: MarkdownInline[] = [];
	const finders = {
		'`': forwardFinder(text, '`'),
		'**': forwardFinder(text, '**', (at) => !isSpace(text[at - 1])),
		'*': forwardFinder(text, '*', (at) => !isSpace(text[at - 1])),
		'__': forwardFinder(text, '__', (at) => !isSpace(text[at - 1]) && !isWord(text[at + 2])),
		'_': forwardFinder(text, '_', (at) => !isSpace(text[at - 1]) && !isWord(text[at + 1])),
		']': forwardFinder(text, ']'),
		')': forwardFinder(text, ')'),
		space: { at: -2 }
	};
	/** Whether `text[from, to)` holds whitespace, by the same forward-only search. */
	const hasSpace = (from: number, to: number): boolean => {
		const memo = finders.space;
		if (memo.at !== -1 && memo.at < from) {
			let at = from;
			while (at < text.length && !SPACE.test(text[at]!)) at++;
			memo.at = at < text.length ? at : -1;
		}
		return memo.at !== -1 && memo.at < to;
	};

	let plainFrom = 0;
	let i = 0;
	const emit = (piece: MarkdownInline, end: number) => {
		append(out, { kind: 'text', text: text.slice(plainFrom, i) });
		append(out, piece);
		i = plainFrom = end;
	};

	while (i < text.length) {
		const ch = text[i]!;
		if (ch === '`') {
			const close = finders['`'](i + 1);
			if (close > i + 1) {
				emit({ kind: 'code', text: text.slice(i + 1, close) }, close + 1);
				continue;
			}
			i = close === i + 1 ? close + 1 : i + 1;
			continue;
		}
		if (ch === '*' || ch === '_') {
			const double = text[i + 1] === ch;
			const delim = (double ? ch + ch : ch) as '**' | '*' | '__' | '_';
			const size = delim.length;
			const opens = !isSpace(text[i + size]) && (ch === '*' || !isWord(text[i - 1]));
			const close = opens ? finders[delim](i + size + 1) : -1;
			if (close !== -1) {
				emit({ kind: double ? 'strong' : 'em', text: text.slice(i + size, close) }, close + size);
				continue;
			}
			i += size;
			continue;
		}
		if (ch === '[') {
			const labelEnd = finders[']'](i + 1);
			if (labelEnd > i + 1 && text[labelEnd + 1] === '(') {
				const hrefEnd = finders[')'](labelEnd + 2);
				if (hrefEnd > labelEnd + 2 && !hasSpace(labelEnd + 2, hrefEnd)) {
					const href = safeHref(text.slice(labelEnd + 2, hrefEnd));
					const label = text.slice(i + 1, labelEnd);
					emit(href ? { kind: 'link', text: label, href } : { kind: 'text', text: text.slice(i, hrefEnd + 1) }, hrefEnd + 1);
					continue;
				}
			}
			i += 1;
			continue;
		}
		i += 1;
	}
	append(out, { kind: 'text', text: text.slice(plainFrom) });
	return out;
}

const FENCE = /^ {0,3}(`{3,}|~{3,})[ \t]*([\w+.#-]*)/;
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]+|$)/;
const ITEM = /^[ \t]*(?:[-*+]|(\d{1,9})[.)])[ \t]+/;
const QUOTE = /^ {0,3}> ?/;

/** A heading's text without its optional closing run of `#`. */
function headingText(rest: string): string {
	const trimmed = rest.trimEnd();
	let end = trimmed.length;
	while (end > 0 && trimmed[end - 1] === '#') end--;
	return end === 0 || isSpace(trimmed[end - 1]) ? trimmed.slice(0, end).trimEnd() : trimmed;
}

export function parseMarkdown(source: string): MarkdownBlock[] {
	const lines = source.replace(/\r\n?/g, '\n').split('\n');
	const blocks: MarkdownBlock[] = [];
	let paragraph: string[] = [];
	let quote: string[] = [];
	const flush = () => {
		if (paragraph.length) blocks.push({ kind: 'p', inlines: parseInlines(paragraph.join('\n')) });
		if (quote.length) blocks.push({ kind: 'quote', inlines: parseInlines(quote.join('\n')) });
		paragraph = [];
		quote = [];
	};
	for (let index = 0; index < lines.length; index++) {
		const line = lines[index]!;
		const fence = FENCE.exec(line);
		if (fence) {
			flush();
			const marker = fence[1]!;
			const body: string[] = [];
			while (++index < lines.length && !lines[index]!.trimStart().startsWith(marker)) body.push(lines[index]!);
			blocks.push({ kind: 'code', text: body.join('\n'), language: fence[2] ?? '' });
			continue;
		}
		if (!line.trim()) {
			flush();
			continue;
		}
		const heading = HEADING.exec(line);
		if (heading) {
			flush();
			blocks.push({ kind: 'heading', level: heading[1]!.length, inlines: parseInlines(headingText(line.slice(heading[0].length))) });
			continue;
		}
		const item = ITEM.exec(line);
		if (item) {
			flush();
			const kind = item[1] === undefined ? 'ul' : 'ol';
			const content = parseInlines(line.slice(item[0].length));
			const last = blocks.at(-1);
			if (last?.kind === kind) last.items.push(content);
			else blocks.push({ kind, items: [content] });
			continue;
		}
		const quoted = QUOTE.exec(line);
		if (quoted) {
			if (paragraph.length) flush();
			quote.push(line.slice(quoted[0].length));
			continue;
		}
		// An indented line straight after a list item continues that item.
		const last = blocks.at(-1);
		if (/^\s/.test(line) && !paragraph.length && !quote.length && (last?.kind === 'ul' || last?.kind === 'ol')) {
			for (const piece of parseInlines(` ${line.trim()}`)) append(last.items.at(-1)!, piece);
			continue;
		}
		if (quote.length) flush();
		paragraph.push(line);
	}
	flush();
	return blocks;
}
