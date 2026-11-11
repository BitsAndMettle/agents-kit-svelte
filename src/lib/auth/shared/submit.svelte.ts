import { tick } from 'svelte';
import type { AuthResult, AuthSubmitHandler } from './types';

/** What `AuthSubmit` reads from its component, each read lazily so props stay live. */
export interface AuthSubmitOptions<V, F extends string> {
	/** The component's `onSubmit` prop. Without one the form submits natively. */
	handler: () => AuthSubmitHandler<V, F> | undefined;
	/** Turns the form's data into the typed values the handler gets. */
	read: (data: FormData) => V;
	/** The `pending` prop: when given it wins over the handler's own pending state. */
	pending?: () => boolean | undefined;
	/** The `error` prop (e.g. from a server form action). */
	error?: () => string | undefined;
	/** The `errors` prop, per field. */
	errors?: () => Partial<Record<F, string>> | undefined;
	/** Text shown when the handler throws or rejects. */
	genericError: () => string;
	/** Called once a handler's submit succeeds (returned or resolved with no error), e.g. to show a "sent" state. */
	onSuccess?: () => void;
}

/**
 * Submit plumbing shared by every auth form, so they all behave the same:
 *
 * - With an `onSubmit` handler the native submit is cancelled and the handler gets typed values.
 *   Without one the form posts natively (to `action`), so a server form action works with no
 *   JavaScript at all.
 * - A returned promise makes the form pending, and submits while pending are ignored. The
 *   `pending` prop does the same for a submit someone else handles (SvelteKit `enhance`):
 *   while it is true the submit is stopped before any later listener sees it. A plain native
 *   post with neither is not guarded; the browser navigates away.
 * - A returned `AuthResult` shows its errors until the next submit; editing a field clears that
 *   field's error. Prop errors show when the handler has not reported any.
 * - After a failed submit, focus moves to the first invalid control, or to the form error.
 * - `clear()` (the form was swapped or reset) drops errors and forgets a submit in flight:
 *   when it settles later, its result is ignored.
 *
 * Construct it while the component initialises; bind `onsubmit` and `oninput` on the `<form>`.
 */
export class AuthSubmit<V, F extends string = string> {
	#options: AuthSubmitOptions<V, F>;
	#running = $state(false);
	#result = $state<AuthResult<F> | undefined>(undefined);
	/** Fields the person has edited since the last result; their errors are hidden. */
	#edited = $state<ReadonlySet<string>>(new Set());
	/** Bumped by every submit and by `clear()`; a settling submit from an older one is ignored. */
	#generation = 0;

	constructor(options: AuthSubmitOptions<V, F>) {
		this.#options = options;
	}

	/** True while a submit is in flight (or the `pending` prop says so). */
	get pending(): boolean {
		return this.#options.pending?.() ?? this.#running;
	}

	/** The form-level error to show, if any. */
	get error(): string | undefined {
		return this.#result ? this.#result.error : this.#options.error?.();
	}

	/**
	 * The error for one field, if any. Hidden once the person edits that field.
	 *
	 * @param name - The field's name.
	 */
	fieldError(name: F): string | undefined {
		if (this.#edited.has(name)) return undefined;
		const source = this.#result ? this.#result.errors : this.#options.errors?.();
		return source?.[name];
	}

	/** Bind to the form's `oninput`: an edited field drops its error. */
	readonly oninput = (event: Event): void => {
		const name = (event.target as { name?: unknown } | null)?.name;
		if (typeof name !== 'string' || !name || this.#edited.has(name)) return;
		this.#edited = new Set([...this.#edited, name]);
	};

	/** Bind to the form's `onsubmit`. */
	readonly onsubmit = (event: SubmitEvent): void => {
		if (this.pending) {
			// Stop listeners added after this one too (SvelteKit's enhance ignores defaultPrevented).
			event.preventDefault();
			event.stopImmediatePropagation();
			return;
		}
		const generation = ++this.#generation;
		// A new submit shows the next errors in full, wherever they come from (a handler, or
		// props set by a server form action that intercepted the native post).
		this.#result = undefined;
		this.#edited = new Set();
		const handler = this.#options.handler();
		if (!handler) return;
		event.preventDefault();
		const form = event.currentTarget as HTMLFormElement;
		const data = new FormData(form, event.submitter);
		let outcome: ReturnType<AuthSubmitHandler<V, F>>;
		try {
			outcome = handler(this.#options.read(data), { data, event });
		} catch {
			void this.#finish(form, { error: this.#options.genericError() });
			return;
		}
		if (!isThenable(outcome)) {
			void this.#finish(form, outcome);
			return;
		}
		this.#running = true;
		const settle = (result: void | AuthResult<F>) => {
			if (generation !== this.#generation) return;
			this.#running = false;
			void this.#finish(form, result);
		};
		outcome.then(settle, () => settle({ error: this.#options.genericError() }));
	};

	/** Clears every error the handler reported (e.g. when the form is reset or swapped). */
	clear(): void {
		this.#generation++;
		this.#running = false;
		this.#result = undefined;
		this.#edited = new Set();
	}

	async #finish(form: HTMLFormElement, result: void | AuthResult<F>): Promise<void> {
		const failed = result && (result.error || Object.values(result.errors ?? {}).some(Boolean));
		this.#result = failed ? result : undefined;
		if (!failed) {
			this.#options.onSuccess?.();
			return;
		}
		await tick();
		const target =
			form.querySelector<HTMLElement>('[aria-invalid="true"]:not([disabled])') ??
			form.querySelector<HTMLElement>('[data-auth-error]');
		target?.focus();
	}
}

function isThenable<T>(value: unknown): value is PromiseLike<T> {
	return typeof (value as PromiseLike<T> | null)?.then === 'function';
}
