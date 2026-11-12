/**
 * Whether this is a development build, read from `esm-env` (the condition Svelte itself uses), so
 * dev-only warnings show under any bundler, not only Vite, and `svelte-package` stays quiet.
 */
import { DEV } from 'esm-env';

/** True in a development build: show dev-only warnings. */
export function isDev(): boolean {
	return DEV;
}
