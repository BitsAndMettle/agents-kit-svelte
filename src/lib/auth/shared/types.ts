import type { Component, Snippet } from 'svelte';
import type { TimeInput } from '../../core/time';

/**
 * What an auth handler can hand back after a submit. `error` is shown once, above the form,
 * and announced; `errors` lands on the named fields. Return nothing on success.
 */
export interface AuthResult<F extends string = string> {
	error?: string;
	errors?: Partial<Record<F, string>>;
}

/**
 * Everything a submit handler gets beside the typed values: the raw `FormData` (with the
 * submitter's name and value) and the event, for callers that need either.
 */
export interface AuthSubmitContext {
	data: FormData;
	event: SubmitEvent;
}

/**
 * A component's submit callback. Return (or resolve to) an `AuthResult` to show errors; while a
 * returned promise is pending the form shows its pending state and ignores further submits.
 * A rejected promise shows the component's generic error text, never the thrown message.
 */
export type AuthSubmitHandler<V, F extends string = string> = (
	values: V,
	context: AuthSubmitContext
) => void | AuthResult<F> | Promise<void | AuthResult<F>>;

/** A sign-in provider (an OAuth or SSO button). The kit ships no brand logos: pass your own `icon`. */
export interface AuthProvider {
	/** Passed back to `onProvider`. */
	id: string;
	/** Provider name as shown, e.g. "GitHub". The button reads "Continue with GitHub" by default. */
	label: string;
	/** Your logo, as a snippet or a component (e.g. an icon component). Decorative. */
	icon?: Snippet | Component;
	/** Makes the button a link (a server-side redirect start), so it works without JavaScript. */
	href?: string;
	disabled?: boolean;
}

/** The signed-in person, as account UI shows them. */
export interface AuthUser {
	name?: string;
	email?: string;
	/** Image address for the avatar; initials are shown without it. */
	avatarSrc?: string;
}

/** One signed-in device or browser, for a session list. */
export interface AuthSession {
	id: string;
	/** Shown as the session's name, e.g. "Chrome on macOS". */
	label: string;
	/** Picks the icon. */
	kind?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
	/** Free text, e.g. "Berlin, Germany" or an IP address. */
	location?: string;
	lastActive?: TimeInput;
	/** This browser's own session: it cannot be revoked from the list. */
	current?: boolean;
}
