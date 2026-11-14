// End-to-end install check: packs the library exactly as npm would ship it, installs the
// tarball into a brand-new Vite + Svelte 5 + Tailwind v4 app with npm, then type-checks and
// builds that app. Fails if the published files, exports, types or theme are broken.
//
//   node scripts/smoke-install.mjs            (runs `pnpm package` first)
//   node scripts/smoke-install.mjs --keep     (leave the temp app on disk for inspection)
import { execSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const keep = process.argv.includes('--keep');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const dev = pkg.devDependencies;

const run = (cmd, cwd) => {
	console.log(`\n$ ${cmd}`);
	execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, CI: 'true' } });
};

const work = mkdtempSync(join(tmpdir(), 'aks-smoke-'));
const app = join(work, 'app');
mkdirSync(join(app, 'src'), { recursive: true });

try {
	run('corepack pnpm package', root);
	run(`corepack pnpm pack --pack-destination "${work}"`, root);
	const tarball = readdirSync(work).find((f) => f.endsWith('.tgz'));
	if (!tarball) throw new Error('pnpm pack produced no tarball');

	const files = {
		'package.json': JSON.stringify(
			{
				name: 'aks-smoke-app',
				private: true,
				type: 'module',
				scripts: { build: 'vite build', check: 'svelte-check --fail-on-warnings' },
				dependencies: { 'agents-kit-svelte': `file:../${tarball}` },
				devDependencies: {
					svelte: dev.svelte,
					vite: dev.vite,
					'@sveltejs/vite-plugin-svelte': dev['@sveltejs/vite-plugin-svelte'],
					tailwindcss: dev.tailwindcss,
					'@tailwindcss/vite': dev['@tailwindcss/vite'],
					'svelte-check': dev['svelte-check'],
					typescript: dev.typescript
				}
			},
			null,
			2
		),
		'vite.config.js': `import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ plugins: [tailwindcss(), svelte()] });
`,
		'svelte.config.js': `export default {};\n`,
		// A second build that imports one component from the package root, to check tree-shaking.
		'vite.single.config.js': `import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
export default defineConfig({
	plugins: [svelte()],
	build: { outDir: 'dist-single', rollupOptions: { input: 'single.html' } }
});
`,
		'single.html': `<!doctype html><html><body><div id="app"></div><script type="module" src="/src/single.ts"></script></body></html>\n`,
		'src/single.ts': `import { mount } from 'svelte';
import { TodoList } from 'agents-kit-svelte';
mount(TodoList, { target: document.getElementById('app')!, props: { items: [] } });
`,
		'tsconfig.json': JSON.stringify(
			{
				compilerOptions: {
					target: 'ES2022',
					module: 'ESNext',
					moduleResolution: 'bundler',
					strict: true,
					skipLibCheck: false,
					noEmit: true,
					verbatimModuleSyntax: true,
					types: ['svelte', 'vite/client']
				},
				include: ['src/**/*']
			},
			null,
			2
		),
		'index.html': `<!doctype html><html><body><div id="app"></div><script type="module" src="/src/main.ts"></script></body></html>\n`,
		'src/app.css': `@import "tailwindcss";
@import "agents-kit-svelte/theme.css";
@source "../node_modules/agents-kit-svelte/dist";
`,
		'src/main.ts': `import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
mount(App, { target: document.getElementById('app')! });
`,
		'src/App.svelte': `<script lang="ts">
	import { CodeBlock, ThinkingShimmer, TodoList, type TodoItem } from 'agents-kit-svelte';
	import { ChatWorkbench, Markdown, TrailsideClaudeChat, type ChatWorkbenchMessage, type PromptAttachment } from 'agents-kit-svelte/chat';
	import { GitHubIssueCard } from 'agents-kit-svelte/github';
	import { StatusStrip } from 'agents-kit-svelte/board';
	import { SettingsForm } from 'agents-kit-svelte/settings';
	import { SkillCard } from 'agents-kit-svelte/skills';
	import { AgentOrchestrator } from 'agents-kit-svelte/workflows';
	import { IntelligentUIRenderer } from 'agents-kit-svelte/generative';
	import { InsightCards } from 'agents-kit-svelte/data';
	import { BorderBeam } from 'agents-kit-svelte/effects';
	import { buttonClass } from 'agents-kit-svelte/primitives';
	import { SignInCard } from 'agents-kit-svelte/auth';
	import { AgentSession, parseUnifiedDiff } from 'agents-kit-svelte/core';
	import { SAMPLE_ISSUE, SAMPLE_SKILLS, SAMPLE_SUB_AGENTS } from 'agents-kit-svelte/fixtures';

	const session = new AgentSession();
	const diff = parseUnifiedDiff(['@@ -1 +1 @@', '-a', '+b'].join(String.fromCharCode(10)));

	let messages = $state<ChatWorkbenchMessage[]>([{ id: 'a', role: 'assistant', text: 'Hello **there**' }]);

	const items: TodoItem[] = [
		{ id: '1', label: 'Install agents-kit-svelte', status: 'completed' },
		{ id: '2', label: 'Render a component', status: 'in-progress' }
	];
</script>

<main class="bg-canvas-primary text-fg-main p-6">
	<ThinkingShimmer label="Thinking…" />
	<TodoList {items} data-testid="plan" aria-label="Plan" />
	<CodeBlock code="pnpm add agents-kit-svelte" language="bash" />
	<GitHubIssueCard issue={SAMPLE_ISSUE} compact />
	<StatusStrip status="Running" tone="success" stats={[{ id: 'slots', label: 'Slots', value: 4, max: 6 }]} />
	<SettingsForm settings={[{ id: 'holds', label: 'Hold protected changes', value: true }]} onChange={() => undefined} />
	<div class="h-[600px]">
		<ChatWorkbench
			title="Referee"
			status={{ text: 'Online', tone: 'success' }}
			{messages}
			conversations={[{ id: 'c1', title: 'First', active: true }]}
			models={[{ id: 'sonnet', label: 'Sonnet' }]}
			model="sonnet"
			onSend={(text: string, sent: PromptAttachment[]) => messages.push({ id: String(messages.length), role: 'user', text: text + sent.length })}
		>
			{#snippet headerActions({ button })}<button class={button}>Pause</button>{/snippet}
		</ChatWorkbench>
	</div>
	<ChatWorkbench demo />
	<Markdown text="**bold** [link](https://example.com)" />
	<!-- The deprecated alias still works until the next major. -->
	<TrailsideClaudeChat />
	<SkillCard skill={SAMPLE_SKILLS[0]} />
	<AgentOrchestrator orchestratorName="Release run" subAgents={SAMPLE_SUB_AGENTS} />
	<IntelligentUIRenderer nodes={[]} />
	<InsightCards />
	<SignInCard onSubmit={() => undefined} />
	<BorderBeam><button class={buttonClass('primary')}>{session.state.status} {diff.additions}</button></BorderBeam>
</main>
`
	};
	for (const [name, content] of Object.entries(files)) writeFileSync(join(app, name), content);

	// Every catalogue usage snippet is a complete component: type-check each one against the
	// packed package, so the docs can't drift from the real props.
	const { CATALOG_ITEMS } = await import(join(root, 'src', 'site', 'catalog-registry.ts'));
	mkdirSync(join(app, 'src', 'snippets'), { recursive: true });
	for (const item of CATALOG_ITEMS) writeFileSync(join(app, 'src', 'snippets', `${item.slug}.svelte`), item.usageSnippet);
	console.log(`Wrote ${CATALOG_ITEMS.length} catalogue snippets for type-checking.`);

	run('npm install --no-audit --no-fund --loglevel=error', app);
	run('npm run check', app);
	run('npm run build', app);

	const assets = join(app, 'dist', 'assets');
	const css = readdirSync(assets)
		.filter((f) => f.endsWith('.css'))
		.map((f) => readFileSync(join(assets, f), 'utf8'))
		.join('\n');
	const expected = ['--ak-color-surface', '.bg-card-bg', '.text-fg-main', '.ak-shimmer-text'];
	const missing = expected.filter((needle) => !css.includes(needle));
	if (missing.length) throw new Error(`Built CSS is missing: ${missing.join(', ')}`);

	// Tree-shaking: one component from the root barrel must not pull in the rest of the kit.
	run('npx vite build --config vite.single.config.js', app);
	const singleDir = join(app, 'dist-single', 'assets');
	const singleJs = readdirSync(singleDir)
		.filter((f) => f.endsWith('.js'))
		.map((f) => readFileSync(join(singleDir, f), 'utf8'))
		.join('\n');
	const leaked = ['Hold queue', 'argon-agent', 'RSynapse/trailside'].filter((needle) =>
		singleJs.includes(needle)
	);
	if (leaked.length) throw new Error(`Importing TodoList alone bundled other components: ${leaked.join(', ')}`);
	const kb = (Buffer.byteLength(singleJs) / 1024).toFixed(1);
	console.log(`\nSingle-component bundle (TodoList + Svelte runtime + icons): ${kb} KB`);
	const SINGLE_LIMIT_KB = 120;
	if (Number(kb) > SINGLE_LIMIT_KB) throw new Error(`Single-component bundle is ${kb} KB, over ${SINGLE_LIMIT_KB} KB`);

	console.log('\n✔ agents-kit-svelte installs, type-checks and builds in a fresh Svelte 5 + Tailwind v4 app.');
} finally {
	if (keep) console.log(`Temp app kept at ${app}`);
	else rmSync(work, { recursive: true, force: true });
}
