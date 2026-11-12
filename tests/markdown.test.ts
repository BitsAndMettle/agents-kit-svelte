import assert from 'node:assert/strict';
import test from 'node:test';
import { parseInlines, parseMarkdown, safeHref, type MarkdownBlock, type MarkdownInline } from '../src/lib/agents/markdown.ts';

const links = (pieces: MarkdownInline[]) => pieces.filter((piece) => piece.kind === 'link');
const text = (pieces: MarkdownInline[]) => pieces.map((piece) => piece.text).join('');
const inlinesOf = (block: MarkdownBlock) => ('inlines' in block ? block.inlines : []);

test('blocks: headings, lists, quotes, fenced code and paragraphs', () => {
	const blocks = parseMarkdown(
		['# Title #', '', 'Intro line', 'second line', '', '- one', '- two', '  continued', '1. first', '> quoted', '', '```ts', 'const a = 1;', '```', '```', 'plain', '```'].join('\n')
	);
	assert.deepEqual(
		blocks.map((block) => block.kind),
		['heading', 'p', 'ul', 'ol', 'quote', 'code', 'code']
	);
	const heading = blocks[0] as Extract<MarkdownBlock, { kind: 'heading' }>;
	assert.equal(heading.level, 1);
	assert.equal(text(heading.inlines), 'Title');
	assert.equal(text(inlinesOf(blocks[1]!)), 'Intro line\nsecond line');
	assert.deepEqual((blocks[2] as Extract<MarkdownBlock, { items: unknown }>).items.map(text), ['one', 'two continued']);
	assert.deepEqual(blocks[5], { kind: 'code', text: 'const a = 1;', language: 'ts' });
	assert.deepEqual(blocks[6], { kind: 'code', text: 'plain', language: '' });
	assert.equal(parseMarkdown('#hashtag')[0]!.kind, 'p');
});

test('inlines: bold, italic, code and links', () => {
	assert.deepEqual(parseInlines('a **b** _c_ *d* `e` [f](https://x.dev/p?q=1)'), [
		{ kind: 'text', text: 'a ' },
		{ kind: 'strong', text: 'b' },
		{ kind: 'text', text: ' ' },
		{ kind: 'em', text: 'c' },
		{ kind: 'text', text: ' ' },
		{ kind: 'em', text: 'd' },
		{ kind: 'text', text: ' ' },
		{ kind: 'code', text: 'e' },
		{ kind: 'text', text: ' ' },
		{ kind: 'link', text: 'f', href: 'https://x.dev/p?q=1' }
	]);
	assert.deepEqual(parseInlines('snake_case_name and 2 * 3 * 4'), [{ kind: 'text', text: 'snake_case_name and 2 * 3 * 4' }]);
	assert.deepEqual(parseInlines('`**not bold**`'), [{ kind: 'code', text: '**not bold**' }]);
	assert.deepEqual(links(parseInlines('[mail](mailto:a@b.dev)')), [{ kind: 'link', text: 'mail', href: 'mailto:a@b.dev' }]);
	assert.deepEqual(parseInlines('[unclosed and **bold**'), [
		{ kind: 'text', text: '[unclosed and ' },
		{ kind: 'strong', text: 'bold' }
	]);
});

test('unsafe links and raw HTML stay text', () => {
	const hostile = [
		'[x](javascript:alert(1))',
		'[x](JaVaScRiPt:alert(1))',
		'[x](java\tscript:alert(1))',
		'[x](data:text/html;base64,PHNjcmlwdD4=)',
		'[x](vbscript:msgbox)',
		'[x](&#106;avascript:alert(1))',
		'[x](javascript&#58;alert(1))',
		'[x](javascript&colon;alert(1))',
		'[x](/relative)',
		'[x](//evil.dev)',
		'<img src=x onerror=alert(1)>',
		'<a href="javascript:alert(1)">x</a>',
		'<script>alert(1)</script>'
	];
	for (const source of hostile) {
		const blocks = parseMarkdown(source);
		const pieces = blocks.flatMap(inlinesOf);
		assert.deepEqual(links(pieces), [], `${source} became a link`);
		assert.equal(text(pieces), source, `${source} was not kept as text`);
	}
	assert.equal(safeHref('javascript:alert(1)'), null);
	assert.equal(safeHref('HTTPS://Example.com'), 'https://example.com/');
});

test('a 256 KB pathological line parses in linear time', () => {
	const size = 256 * 1024;
	const lines = [
		'*a'.repeat(size / 2),
		'**a'.repeat(size / 3),
		'_a '.repeat(size / 3),
		'['.repeat(size),
		'[a]('.repeat(size / 4),
		'[a](b '.repeat(size / 6),
		'`'.repeat(size),
		'# ' + ' '.repeat(size) + 'x',
		'- ' + '\t'.repeat(size) + 'x',
		'a'.repeat(size) + '**',
		'```' + 'a'.repeat(size)
	];
	for (const line of lines) {
		const started = performance.now();
		parseMarkdown(line);
		const ms = performance.now() - started;
		assert.ok(ms < 500, `${JSON.stringify(line.slice(0, 12))}… took ${ms.toFixed(0)}ms`);
	}
});
