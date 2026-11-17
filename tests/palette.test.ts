import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

/** The Studio palette's contract, read from src/app.css: the same colour tokens as the default, last in the layer, readable in both themes. */

const css = readFileSync(new URL('../src/app.css', import.meta.url), 'utf8');
const STUDIO = ':where([data-palette="studio"]),';

/** The body of the `{ ... }` block that opens at or after `from`. */
function block(from: number): { body: string; end: number } {
	const open = css.indexOf('{', from);
	let depth = 0;
	for (let i = open; i < css.length; i++) {
		if (css[i] === '{') depth++;
		else if (css[i] === '}' && --depth === 0) return { body: css.slice(open + 1, i), end: i };
	}
	throw new Error('unclosed block');
}

const colourTokens = (body: string) => [...body.matchAll(/(--ak-(?:color|chart|chat)-[\w-]+):/g)].map(([, name]) => name);
const studio = block(css.indexOf(STUDIO));
const dark = block(css.indexOf(':where(.dark, [data-theme="dark"]),'));

test('Studio sets every colour token the default dark palette sets, and no other', () => {
	assert.deepEqual(colourTokens(studio.body).sort(), colourTokens(dark.body).sort());
	assert.equal(colourTokens(studio.body).length, 34);
});

test('Studio is the last rule in the agents-kit layer, so it wins over the theme rules', () => {
	const layer = block(css.indexOf('@layer agents-kit'));
	assert.ok(studio.end < layer.end);
	assert.match(css.slice(studio.end + 1, layer.end), /^\s*$/);
});

/** token -> [light, dark], for the hex values; the scrim's alpha is no text pair. */
const tokens: Record<string, [string, string]> = {};
for (const [, name, value] of studio.body.matchAll(/--ak-([\w-]+):\s*([^;]+);/g)) {
	const pair = /^light-dark\((#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\)$/i.exec(value.trim());
	const one = /^(#[0-9a-f]{6})$/i.exec(value.trim());
	if (pair) tokens[name] = [pair[1], pair[2]];
	else if (one) tokens[name] = [one[1], one[1]];
}

const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const lum = (hex: string) => {
	const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
	const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
};
const t = (name: string) => tokens[name] ?? assert.fail(`Studio has no hex value for --ak-${name}`);

const TONES = ['accent', 'success', 'warning', 'danger', 'info'];
const SURFACES = ['color-canvas', 'color-canvas-subtle', 'color-surface', 'chat-bubble-user'];
const TEXT = [
	...SURFACES.flatMap((bg) => [['color-fg', bg], ['color-fg-muted', bg]]),
	['color-fg-inverse', 'color-fg'],
	...TONES.flatMap((tone) => ['color-surface', 'color-canvas', 'color-canvas-subtle', `color-${tone}-subtle`].map((bg) => [`color-${tone}`, bg])),
	['color-diff-add-fg', 'color-diff-add-bg'],
	['color-diff-del-fg', 'color-diff-del-bg'],
	['color-terminal-fg', 'color-terminal-bg'],
	['color-terminal-muted', 'color-terminal-bg']
];
const MARKS = [1, 2, 3, 4, 5, 6].flatMap((n) => ['color-surface', 'color-canvas'].map((bg) => [`chart-${n}`, bg]));

for (const [index, theme] of ['light', 'dark'].entries()) {
	test(`Studio ${theme}: every text pair holds 4.5:1 and every chart mark 3:1`, () => {
		const under = [
			...TEXT.map(([fg, bg]) => [fg, bg, 4.5] as const),
			...MARKS.map(([fg, bg]) => [fg, bg, 3] as const)
		].flatMap(([fg, bg, floor]) => {
			const r = ratio(t(fg)[index], t(bg)[index]);
			return r < floor ? [`${fg} on ${bg}: ${r.toFixed(2)} < ${floor}`] : [];
		});
		// A label on a fill: white in light; in dark the accent Button swaps to fg-inverse (primitives/actions/shared.ts).
		const labels = index === 0 ? ['accent', 'danger', 'info'].map((tone) => ['#ffffff', t(`color-${tone}`)[0]]) : [[t('color-fg-inverse')[1], t('color-accent')[1]]];
		for (const [fg, bg] of labels) if (ratio(fg, bg) < 4.5) under.push(`${fg} on ${bg}: ${ratio(fg, bg).toFixed(2)} < 4.5`);
		assert.deepEqual(under, []);
	});
}
