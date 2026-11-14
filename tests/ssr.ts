import { after } from 'node:test';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import type { Component, createRawSnippet as CreateRawSnippet } from 'svelte';
import type { render as Render } from 'svelte/server';
import { createServer, type ViteDevServer } from 'vite';

type AnyComponent = Component<Record<string, unknown>>;

/**
 * Server-renders library components through Vite, so a test can check props against markup.
 * Call it once at the top of a test file. The server starts at once and stops after the file's
 * tests; `html` and `snippet` work once a `load` has resolved.
 */
export function ssr() {
	let vite: ViteDevServer;
	// Svelte's runtime comes through Vite too, so the components and the renderer share one copy.
	let render: typeof Render;
	let createRawSnippet: typeof CreateRawSnippet;

	const started = (async () => {
		vite = await createServer({
			configFile: false,
			logLevel: 'error',
			plugins: [svelte()],
			server: { middlewareMode: true, hmr: false, ws: false },
			appType: 'custom',
			optimizeDeps: { noDiscovery: true, include: [] }
		});
		({ render } = await vite.ssrLoadModule('svelte/server'));
		({ createRawSnippet } = await vite.ssrLoadModule('svelte'));
	})();

	after(() => vite?.close());

	return {
		/** The component at a path from the repository root, e.g. `/src/lib/board/CardFace.svelte`. */
		async load(path: string): Promise<AnyComponent> {
			await started;
			return (await vite.ssrLoadModule(path)).default;
		},

		/** Rendered markup without Svelte's hydration comments, removed until none are left. */
		html(component: AnyComponent, props: Record<string, unknown> = {}): string {
			let out = render(component, { props }).body;
			for (let previous = ''; previous !== out; ) {
				previous = out;
				out = out.replace(/<!--[\s\S]*?-->/g, '');
			}
			return out;
		},

		/** A snippet prop that renders `markup`, which is given the snippet's arguments. */
		snippet: <Args extends unknown[]>(markup: (...args: Args) => string) =>
			createRawSnippet<Args>((...args) => ({ render: () => markup(...(args.map((arg) => arg()) as Args)) }))
	};
}
