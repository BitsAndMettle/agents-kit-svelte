/**
 * The rune-free core of the instant model: `readResult` (what a handler's result means, the one
 * reading every Settings group uses), `UndoSlot` (one-level undo with an ownership token) and
 * `InstantCore` (optimistic value, newest-set-wins, revert on failure). A leaf, so node tests
 * cover the race and undo rules; `InstantSetting` in `instant.svelte.ts` wraps it in runes.
 */
import type { SettingStatus, SettingsConflict, SettingsHandler, SettingsResult } from './types';

/** What a settled handler means for the control that ran it. */
export type SettingsOutcome = { ok: true; notice?: string } | { ok: false; error?: string; conflict?: SettingsConflict };

function textOf(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

/**
 * Reads what a settings handler returned, the same way in every group:
 *
 * - A failure is a non-empty `error`, any non-empty field in `errors`, or any `conflict` (even
 *   one without a message). Its `error` is the handler's own text: `error`, else the field
 *   errors joined, else the conflict's message; undefined when there is none (show the
 *   component's generic label).
 * - Anything else (nothing, `{}`, `{notice}`, a value that is not an object) is success.
 *
 * A throw or rejection is a failure without text: never pass the thrown value here.
 */
export function readResult(result: unknown): SettingsOutcome {
	if (!result || typeof result !== 'object') return { ok: true };
	const { error, errors, conflict, notice } = result as SettingsResult;
	const fieldErrors = errors && typeof errors === 'object' ? Object.values(errors).filter((m): m is string => textOf(m) !== undefined) : [];
	if (textOf(error) === undefined && !fieldErrors.length && !conflict) return textOf(notice) !== undefined ? { ok: true, notice } : { ok: true };
	const message = textOf(error) ?? (fieldErrors.length ? fieldErrors.join(' ') : undefined) ?? textOf(conflict?.message);
	const outcome: { ok: false; error?: string; conflict?: SettingsConflict } = { ok: false };
	if (message !== undefined) outcome.error = message;
	if (conflict) outcome.conflict = conflict;
	return outcome;
}

/**
 * `readResult` for a component that submits through the Primitives' `FormSubmit`, which reads
 * only `error` and `errors`: a failure keeps its field errors, and gets a form-level `error` (the
 * handler's own text, else `generic`) whenever no field error would show, so a `{conflict}`
 * fails there too. Success is `undefined`.
 */
export function toFormResult(result: unknown, generic: string): { error?: string; errors?: Record<string, string> } | undefined {
	const outcome = readResult(result);
	if (outcome.ok) return undefined;
	const { error, errors } = result as SettingsResult;
	const fields: Record<string, string> = {};
	for (const [name, message] of Object.entries(errors && typeof errors === 'object' ? errors : {})) {
		const text = textOf(message);
		if (text !== undefined) fields[name] = text;
	}
	const hasFields = Object.keys(fields).length > 0;
	const formError = textOf(error) ?? (hasFields ? undefined : (outcome.error ?? generic));
	return { ...(formError !== undefined ? { error: formError } : {}), ...(hasFields ? { errors: fields } : {}) };
}

/**
 * One-level undo with an ownership token. `remember` stores a snapshot and returns a token; only
 * the newest token can `take` it back, so a stale notice can never undo a newer change.
 */
export class UndoSlot<S> {
	#token = 0;
	#snapshot: { token: number; value: S } | null = null;

	/** Stores the value to go back to, replacing any earlier one, and returns its token. */
	remember(snapshot: S): number {
		this.#token += 1;
		this.#snapshot = { token: this.#token, value: snapshot };
		return this.#token;
	}

	/** The snapshot for `token`, once: null when the token is stale, was taken, or forgotten. */
	take(token: number): S | null {
		if (!this.isCurrent(token)) return null;
		const { value } = this.#snapshot!;
		this.#snapshot = null;
		return value;
	}

	/** True while `token` still owns the slot. */
	isCurrent(token: number | undefined): boolean {
		return token !== undefined && this.#snapshot !== null && this.#snapshot.token === token;
	}

	/** The token that owns the slot now, if any. */
	get token(): number | undefined {
		return this.#snapshot?.token;
	}

	/** Drops the snapshot: any later change supersedes undo. */
	forget(): void {
		this.#snapshot = null;
	}
}

/** Everything the instant model shows, as one immutable snapshot. */
export interface InstantSnapshot<T> {
	/** The optimistic value: what the control shows. */
	current: T;
	/** The last value the handler accepted (or the value it started with). */
	committed: T;
	status: SettingStatus;
	/**
	 * The handler's own error text (`{error}`, the first of `{errors}`, or a conflict message).
	 * Undefined after a throw or rejection: show the component's generic label then, never the thrown text.
	 */
	error?: string;
	/** Token of the change Undo would reverse; undefined when there is nothing to undo. */
	undoToken?: number;
	canUndo: boolean;
}

/** What `InstantCore` reads. Functions are read at call time, so they can follow props. */
export interface InstantCoreOptions<T> {
	/** The starting (saved) value. */
	initial: T;
	/** The commit handler (`onCommit`). Without one, a set applies locally and settles at once. */
	commit: () => SettingsHandler<[T]> | undefined;
	/** The undo handler (`onUndo`), given the value to go back to. Defaults to `commit`. */
	undo?: () => SettingsHandler<[T]> | undefined;
	equals?: (a: T, b: T) => boolean;
	/** How long `saved` shows before the status returns to idle. Default 2000ms. */
	savedForMs?: () => number;
	/** Whether a successful change offers Undo. Default true. */
	undoable?: () => boolean;
	/** Called after every change of the snapshot. */
	onChange?: (snapshot: InstantSnapshot<T>) => void;
}

type Outcome = { result?: void | SettingsResult; rejected?: boolean };

function thenable(value: unknown): value is PromiseLike<unknown> {
	// Same check as core/promise's isThenable, inlined so this file stays a leaf (node tests load it directly).
	return typeof (value as PromiseLike<unknown> | null | undefined)?.then === 'function';
}

/**
 * The instant change model without runes:
 *
 * - `set(v)` shows `v` at once (`current`) and calls the commit handler. A generation counter
 *   means only the newest `set` settles: a slow first call that finishes after a fast second one
 *   is ignored.
 * - A failure (`{error}`, `{errors}`, `{conflict}`, a throw or a rejection) reverts `current` to
 *   the last committed value and sets status `error`. Only a returned message is kept, never
 *   thrown text.
 * - Success commits, shows `saved` for `savedForMs`, then `idle`, and (when `undoable`) remembers
 *   the previous committed value in one `UndoSlot`. Any later `set` supersedes that token.
 * - `undo()` commits the remembered value through the undo handler and creates no new undo point.
 * - A superseded change that succeeds still moves `committed` (unless a newer change already
 *   settled), so a later failure reverts to what the handler last accepted, never to a value it
 *   no longer has.
 */
export class InstantCore<T> {
	#options: InstantCoreOptions<T>;
	#current: T;
	#committed: T;
	#status: SettingStatus = 'idle';
	#error: string | undefined;
	#generation = 0;
	/** The generation `#committed` came from, so an older success never overwrites a newer one. */
	#committedGeneration = 0;
	#attempt: { value: T; undo: boolean } | null = null;
	#slot = new UndoSlot<T>();
	#timer: ReturnType<typeof setTimeout> | undefined;

	constructor(options: InstantCoreOptions<T>) {
		this.#options = options;
		this.#current = options.initial;
		this.#committed = options.initial;
	}

	get snapshot(): InstantSnapshot<T> {
		const undoToken = this.#slot.token;
		return {
			current: this.#current,
			committed: this.#committed,
			status: this.#status,
			error: this.#error,
			undoToken,
			canUndo: undoToken !== undefined && this.#status !== 'pending'
		};
	}

	/** Applies `value` optimistically and commits it. Resolves once this set has settled (or been superseded). */
	set(value: T): Promise<void> {
		return this.#run(value, false).then(() => undefined);
	}

	/** Runs the failed change again. Does nothing unless the status is `error`. */
	retry(): Promise<void> {
		if (this.#status !== 'error' || !this.#attempt) return Promise.resolve();
		return this.#run(this.#attempt.value, this.#attempt.undo).then(() => undefined);
	}

	/**
	 * Reverses the last successful change. With a `token`, only while that token still owns the
	 * undo slot, so a stale notice cannot undo a newer change. Resolves once the undo settled:
	 * true when it was undone; false when there was nothing (or nothing current) to undo, or when
	 * the undo itself failed (status `error`; `error` holds the handler's message if it gave one).
	 */
	async undo(token?: number): Promise<boolean> {
		const owner = token ?? this.#slot.token;
		if (this.#status === 'pending' || owner === undefined || !this.#slot.isCurrent(owner)) return false;
		const value = this.#slot.take(owner) as T;
		return this.#run(value, true);
	}

	/** True while `token` still owns the undo slot. */
	isCurrent(token: number | undefined): boolean {
		return this.#slot.isCurrent(token);
	}

	/** Clears the error state, keeping the reverted value. */
	dismissError(): void {
		if (this.#status !== 'error') return;
		this.#status = 'idle';
		this.#error = undefined;
		this.#emit();
	}

	/**
	 * Adopts a value from outside (the saved value changed elsewhere). Ignored while a change is
	 * pending; otherwise it becomes both current and committed, and drops the undo point.
	 */
	sync(value: T): void {
		if (this.#status === 'pending') return;
		if (this.#equals(value, this.#committed) && this.#equals(value, this.#current)) return;
		this.#generation++;
		this.#clearTimer();
		this.#slot.forget();
		this.#committedGeneration = this.#generation;
		this.#current = value;
		this.#committed = value;
		this.#status = 'idle';
		this.#error = undefined;
		this.#emit();
	}

	/** Stops the saved timer (call when the owner unmounts). */
	dispose(): void {
		this.#clearTimer();
	}

	#equals(a: T, b: T): boolean {
		return this.#options.equals ? this.#options.equals(a, b) : Object.is(a, b);
	}

	/** Resolves true when this change succeeded (even if a newer one superseded it), false when it failed. */
	#run(value: T, isUndo: boolean): Promise<boolean> {
		const generation = ++this.#generation;
		const before = this.#committed;
		this.#clearTimer();
		this.#slot.forget();
		this.#attempt = { value, undo: isUndo };
		this.#current = value;
		this.#status = 'pending';
		this.#error = undefined;
		const handler = isUndo ? (this.#options.undo?.() ?? this.#options.commit()) : this.#options.commit();
		let outcome: void | SettingsResult | Promise<void | SettingsResult>;
		try {
			outcome = handler?.(value);
		} catch {
			return Promise.resolve(this.#settle(generation, value, before, isUndo, { rejected: true }));
		}
		if (!thenable(outcome)) return Promise.resolve(this.#settle(generation, value, before, isUndo, { result: outcome }));
		this.#emit();
		return Promise.resolve(outcome).then(
			(result) => this.#settle(generation, value, before, isUndo, { result }),
			() => this.#settle(generation, value, before, isUndo, { rejected: true })
		);
	}

	/** @returns True when the change succeeded. */
	#settle(generation: number, value: T, before: T, isUndo: boolean, outcome: Outcome): boolean {
		const read: SettingsOutcome = outcome.rejected ? { ok: false } : readResult(outcome.result);
		if (generation !== this.#generation) {
			// Superseded: the newest change owns the status, but the handler did accept this value.
			if (read.ok && generation > this.#committedGeneration) {
				this.#committedGeneration = generation;
				this.#committed = value;
				// Nothing newer is waiting (it already failed and reverted): show what is saved now.
				if (this.#status !== 'pending') this.#current = value;
				this.#emit();
			}
			return read.ok;
		}
		if (!read.ok) {
			this.#current = this.#committed;
			this.#status = 'error';
			this.#error = read.error;
			this.#emit();
			return false;
		}
		this.#committedGeneration = generation;
		this.#committed = value;
		this.#current = value;
		this.#status = 'saved';
		this.#error = undefined;
		this.#attempt = null;
		if (!isUndo && (this.#options.undoable?.() ?? true) && !this.#equals(before, value)) this.#slot.remember(before);
		const ms = this.#options.savedForMs?.() ?? 2000;
		this.#timer = setTimeout(() => {
			this.#timer = undefined;
			if (generation !== this.#generation || this.#status !== 'saved') return;
			this.#status = 'idle';
			this.#emit();
		}, ms);
		this.#emit();
		return true;
	}

	#clearTimer(): void {
		if (this.#timer !== undefined) clearTimeout(this.#timer);
		this.#timer = undefined;
	}

	#emit(): void {
		this.#options.onChange?.(this.snapshot);
	}
}
