import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';
import { CATALOG_ITEMS } from '../src/site/catalog-registry.ts';
import { validateSvelte5ComponentSource } from '../src/site/svelte5-audit.ts';

/**
 * Recursively collects all `.svelte` and `.svelte.ts` files under a directory.
 *
 * @param dir - Directory path to walk.
 * @param ext - File suffix to match.
 * @returns Array of absolute file paths ending in `ext`.
 */
function collectFilesByExtension(dir: string, ext = '.svelte'): string[] {
	const entries = readdirSync(dir);
	const files: string[] = [];
	for (const entry of entries) {
		const fullPath = join(dir, entry);
		const stat = statSync(fullPath);
		if (stat.isDirectory()) {
			files.push(...collectFilesByExtension(fullPath, ext));
		} else if (entry.endsWith(ext)) {
			files.push(fullPath);
		}
	}
	return files;
}

test('all Svelte components in src/ comply with Svelte 5 Runes, Props typing, and semantic token rules', () => {
	const srcDir = join(process.cwd(), 'src');
	const svelteFiles = collectFilesByExtension(srcDir, '.svelte');
	assert.ok(svelteFiles.length >= 87, `Expected at least 87 .svelte files in src/, found ${svelteFiles.length}`);

	for (const filePath of svelteFiles) {
		const source = readFileSync(filePath, 'utf8');
		const violations = validateSvelte5ComponentSource(source);
		assert.deepEqual(violations, [], `Violations in ${filePath}: ${violations.join(', ')}`);

		if (source.includes('$props()')) {
			assert.match(
				source,
				/\b(?:interface|type)\s+Props\b/,
				`Component ${filePath} uses $props() without defining Props interface/type`
			);
		}
	}
});

test('library deeply integrates Svelte 5 motion, transitions, flip animations, reactive collections, and snippets', () => {
	const libDir = join(process.cwd(), 'src', 'lib');
	const allSvelteFiles = [
		...collectFilesByExtension(libDir, '.svelte'),
		...collectFilesByExtension(libDir, '.svelte.ts')
	];
	const combined = allSvelteFiles.map((f) => readFileSync(f, 'utf8')).join('\n');

	assert.match(combined, /from 'svelte\/motion'/, 'Expected svelte/motion imports');
	assert.match(combined, /\bnew Spring\b/, 'Expected Svelte 5 Spring class usage');
	assert.match(combined, /\bnew Tween\b/, 'Expected Svelte 5 Tween class usage');
	assert.match(combined, /\bprefersReducedMotion\b/, 'Expected prefersReducedMotion usage');
	assert.match(combined, /\bcrossfade\b/, 'Expected svelte/transition crossfade usage');
	assert.match(combined, /\banimate:flip\b/, 'Expected svelte/animate flip usage');
	assert.match(combined, /\btransition:slide\b/, 'Expected svelte/transition slide usage');
	assert.match(combined, /\bin:fly\b/, 'Expected svelte/transition fly usage');
	assert.match(combined, /\bin:scale\b/, 'Expected svelte/transition scale usage');
	assert.match(combined, /\bnew SvelteSet\b/, 'Expected svelte/reactivity SvelteSet usage');
	assert.match(combined, /\bnew SvelteMap\b/, 'Expected svelte/reactivity SvelteMap usage');
	assert.match(combined, /\{#snippet\s+\w+/, 'Expected Svelte 5 {#snippet} blocks');
	assert.match(combined, /\{@render\s+\w+/, 'Expected Svelte 5 {@render} calls');
});

test('every single .svelte component in src/lib/ has a dedicated 1-to-1 showcase entry in CATALOG_ITEMS and +page.svelte', () => {
	const rootDir = process.cwd();
	const libDir = join(rootDir, 'src', 'lib');
	const libSvelteFiles = collectFilesByExtension(libDir, '.svelte').map((f) =>
		relative(rootDir, f).replace(/\\/g, '/')
	);

	assert.equal(libSvelteFiles.length, 87, 'Expected 87 .svelte components in src/lib/');
	assert.equal(CATALOG_ITEMS.length, 87, 'Expected 87 catalog items in CATALOG_ITEMS');

	const catalogPaths = new Set(CATALOG_ITEMS.map((item) => item.sveltePath));
	for (const relPath of libSvelteFiles) {
		assert.ok(
			catalogPaths.has(relPath),
			`Component ${relPath} is missing a 1-to-1 entry in CATALOG_ITEMS`
		);
	}

	const pageSource = readFileSync(join(rootDir, 'src', 'routes', '+page.svelte'), 'utf8');
	for (const item of CATALOG_ITEMS) {
		assert.ok(
			pageSource.includes(`item.slug === '${item.slug}'`),
			`Catalog slug '${item.slug}' (${item.sveltePath}) is not rendered in src/routes/+page.svelte`
		);
		const lineCount = item.usageSnippet.trim().split('\n').length;
		assert.ok(
			lineCount >= 6,
			`Catalog item '${item.slug}' usageSnippet is too short (${lineCount} lines); must include full rendering code`
		);
	}
});
