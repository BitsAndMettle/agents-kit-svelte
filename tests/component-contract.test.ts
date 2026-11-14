import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';

/**
 * The component contract (see the README's "Customising" notes):
 * - every component forwards extra attributes (aria-*, data-*, id, style, handlers) to its root,
 *   and merges your `class` last through cn(), so your utilities win;
 * - components never fall back to demo data; samples live in src/lib/fixtures.
 */

const root = process.cwd();
const libDir = join(root, 'src', 'lib');

function svelteFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return svelteFiles(path);
		return entry.name.endsWith('.svelte') ? [path] : [];
	});
}

const files = svelteFiles(libDir).map((path) => ({
	rel: relative(root, path).replace(/\\/g, '/'),
	source: readFileSync(path, 'utf8')
}));

/** Components whose markup has no single root element to forward attributes to. */
const NO_SINGLE_ROOT = new Set(['src/lib/agents/AgentDisclosure.svelte']);

test('every component forwards rest props to its root element', () => {
	for (const { rel, source } of files) {
		if (NO_SINGLE_ROOT.has(rel)) continue;
		assert.match(source, /\.\.\.rest\s*\n?\s*\}: Props = \$props\(\)/, `${rel} does not collect ...rest`);
		// A component whose root is another component hands it rest, `class` included; the contract is met there.
		if (/<\/script>\s*<[A-Z]\w* \{\.\.\.rest\}/.test(source)) {
			assert.doesNotMatch(source, /class: className/, `${rel} keeps your class from the component at its root`);
			continue;
		}
		assert.match(source, /<[a-z]+ \{\.\.\.rest\}/, `${rel} does not spread {...rest} on its root`);
		assert.match(source, /interface Props extends Omit<HTML\w*Attributes/, `${rel} Props do not extend HTML attributes`);
		assert.match(source, /class=\{cn\([\s\S]*?, className\)\}/, `${rel} does not merge its class prop with cn()`);
	}
});

/** Collections that ship no demo data: samples live in src/lib/fixtures or with the site's demos. */
const NO_DEMO_DEFAULTS = [
	'src/lib/github/',
	'src/lib/board/',
	'src/lib/agents/',
	'src/lib/ai-elements/',
	'src/lib/runtime/',
	'src/lib/beautiful/',
	'src/lib/skills/',
	'src/lib/intelligent-ui/',
	'src/lib/agents-ui/',
	'src/lib/charts/'
];
/** UI defaults that are not demo data. */
const ALLOWED_DEFAULTS = new Set(['DEFAULT_PHRASES', 'DEFAULT_PROGRESS', 'DEFAULT_FOLLOW_THRESHOLD_PX']);

test('migrated collections have no demo-data defaults', () => {
	for (const { rel, source } of files) {
		if (!NO_DEMO_DEFAULTS.some((dir) => rel.startsWith(dir))) continue;
		for (const [, name] of source.matchAll(/const (DEFAULT_[A-Z_]+)/g)) {
			assert.ok(ALLOWED_DEFAULTS.has(name), `${rel} still defines ${name}; move sample data to src/lib/fixtures`);
		}
		assert.doesNotMatch(source, /RSynapse\/trailside|argon-agent/, `${rel} hard-codes Trailside sample data`);
		assert.doesNotMatch(source, /from '[./]*(fixtures|skills\/fixtures)(\/\w+)?'/, `${rel} imports sample data`);
	}
});

test('library components default demo loops to off', () => {
	for (const { rel, source } of files) {
		assert.doesNotMatch(source, /\blive = true\b/, `${rel} plays a demo loop by default`);
	}
});
