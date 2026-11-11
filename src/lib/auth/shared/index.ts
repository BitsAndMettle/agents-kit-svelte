/** Shared plumbing of the Auth collection: submit handling, resend cooldowns and the shared types. */

export { AuthSubmit } from './submit.svelte';
export { readText, readCheck } from './form-data';
export type { AuthSubmitOptions } from './submit.svelte';
export { Cooldown } from './cooldown.svelte';
export { secondsLeft } from './wait';
export type { AuthResult, AuthSubmitContext, AuthSubmitHandler, AuthProvider, AuthUser, AuthSession } from './types';
