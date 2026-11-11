import { defineConfig } from '@playwright/test';

const updatingBaseline = Boolean(process.env.A11Y_UPDATE_BASELINE);
// Several checkouts can test side by side on one machine by giving each its own port.
const port = Number(process.env.PW_PORT ?? 5188);
const origin = `http://127.0.0.1:${port}`;
// Tests run against a production build by default: the dev server compiles on demand and,
// with every catalogue component on one page, stalls under parallel load. PW_DEV=1 uses the
// dev server instead, for quick local iterations.
const useDevServer = Boolean(process.env.PW_DEV);
const serverCommand = useDevServer
	? `corepack pnpm exec vite dev --host 127.0.0.1 --port ${port} --strictPort`
	: `corepack pnpm exec vite build && corepack pnpm exec vite preview --host 127.0.0.1 --port ${port} --strictPort`;

export default defineConfig({
	testDir: './tests/browser',
	// Stale (expects 67 components, writes screenshots to a Mac path); kept for reference, not run.
	testIgnore: ['**/trailside-claude-chat.spec.ts'],
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 1 : 0,
	// Baseline regeneration collects results in one process, so it runs on a single worker.
	workers: updatingBaseline ? 1 : process.env.CI ? 2 : undefined,
	timeout: 60000,
	reporter: [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL: origin,
		trace: 'on-first-retry'
	},
	webServer: {
		command: serverCommand,
		url: origin,
		reuseExistingServer: !process.env.CI,
		timeout: useDevServer ? 120000 : 420000
	}
});
