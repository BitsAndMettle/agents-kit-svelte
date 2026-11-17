import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const fontsDir = join(root, 'src', 'lib', 'fonts');
const css = readFileSync(join(fontsDir, 'fonts.css'), 'utf8');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

test('fonts.css is a package export that svelte-package builds from src/lib/fonts', () => {
	const entry = pkg.exports['./fonts.css'];
	assert.deepEqual(entry, { style: './dist/fonts/fonts.css', default: './dist/fonts/fonts.css' });
	assert.ok(existsSync(join(root, entry.default.replace('./dist/', 'src/lib/'))));
	assert.match(pkg.license, /\bOFL-1\.1\b/, 'the package licence names the fonts’ licence');
});

test('every @font-face points at a woff2 file next to it, with its licence beside it', () => {
	const urls = [...css.matchAll(/url\("([^"]+)"\)/g)].map(([, url]) => url);
	assert.equal(urls.length, 4);
	for (const url of urls) {
		assert.match(url, /^\.\/[\w-]+\.woff2$/, `${url} is relative, so bundlers resolve it`);
		assert.equal(readFileSync(join(fontsDir, url)).subarray(0, 4).toString('latin1'), 'wOF2', `${url} is woff2`);
	}
	for (const licence of ['Inter-OFL.txt', 'JetBrainsMono-OFL.txt'])
		assert.match(readFileSync(join(fontsDir, licence), 'utf8'), /SIL Open Font License, Version 1\.1/);
	assert.equal(css.match(/font-display: swap;/g)?.length, 4);
	assert.deepEqual([...new Set(css.match(/font-family: "[^"]+"/g))], ['font-family: "Inter"', 'font-family: "JetBrains Mono"']);
});

test('the Inter files keep every OpenType feature the theme turns on for the body', () => {
	const script = readFileSync(join(root, 'scripts', 'build-fonts.sh'), 'utf8');
	const kept = script.match(/^subset .* inter --layout-features\+=(\S+)$/m)?.[1].split(',') ?? [];
	const appCss = readFileSync(join(root, 'src', 'app.css'), 'utf8');
	const settings = appCss.match(/\bbody \{[^}]*font-feature-settings: ([^;]+);/)?.[1] ?? '';
	const on = [...settings.matchAll(/"(\w{4})"(?!\s*0)/g)].map(([, tag]) => tag);
	assert.ok(on.length > 0, 'src/app.css turns features on for the body');
	for (const tag of on) assert.ok(kept.includes(tag), `${tag} is on in src/app.css but not kept by build-fonts.sh`);
});

test('each face claims exactly the characters scripts/build-fonts.sh kept in its file', () => {
	const script = readFileSync(join(root, 'scripts', 'build-fonts.sh'), 'utf8');
	const kept = (name: string) => script.match(new RegExp(`^${name}='([^']+)'`, 'm'))?.[1].split(',');
	const faces = [...css.matchAll(/url\("\.\/([\w-]+)\.woff2"\)[^}]*unicode-range: ([^;]+);/g)];
	assert.equal(faces.length, 4);
	for (const [, file, range] of faces) {
		assert.deepEqual(range.split(', '), kept(file.endsWith('latin-ext') ? 'LATIN_EXT' : 'LATIN'), file);
	}
});
