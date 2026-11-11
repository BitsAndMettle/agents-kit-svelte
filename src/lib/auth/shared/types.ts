import type { Component } from 'svelte';
import type { TimeInput } from '../../core/time';
import type { FormResult, FormSubmitContext, FormSubmitHandler } from '../../primitives/form/submit.svelte';

/**
 * What an auth handler can hand back after a submit: the kit-wide `FormResult`. `error` is shown
 * once, above the form, and announced; `errors` lands on the named fields. Return nothing on success.
 */
export type AuthResult<F extends string = string> = FormResult<F>;

/** Everything a submit handler gets beside the typed values: the kit-wide `FormSubmitContext`. */
export type AuthSubmitContext = FormSubmitContext;

/**
 * A component's submit callback: the kit-wide `FormSubmitHandler`. Return (or resolve to) an
 * `AuthResult` to show errors; while a returned promise is pending the form shows its pending
 * state and ignores further submits. A rejected promise shows the generic error text.
 */
export type AuthSubmitHandler<V, F extends string = string> = FormSubmitHandler<V, F>;

/** A sign-in provider (an OAuth or SSO button). The kit ships no brand logos: pass your own `icon`. */
export interface AuthProvider {
	/** Passed back to `onProvider`. */
	id: string;
	/** Provider name as shown, e.g. "GitHub". The button reads "Continue with GitHub" by default. */
	label: string;
	/**
	 * Your logo as a component (an icon component, or a small Svelte file with your SVG), so a
	 * provider list can live in plain data. Decorative. For a one-off snippet, use the button's
	 * own `icon` snippet instead.
	 */
	icon?: Component;
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
