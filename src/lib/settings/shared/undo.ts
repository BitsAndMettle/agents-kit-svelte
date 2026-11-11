/**
 * The rune-free core of the instant model: `UndoSlot` (one-level undo with an ownership token)
 * and `InstantCore` (optimistic value, newest-set-wins, revert on failure). A leaf, so node tests
 * cover the race and undo rules; `InstantSetting` in `instant.svelte.ts` wraps it in runes.
 */
import type { SettingStatus, SettingsHandler, SettingsResult } from './types';

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

function failureText(result: SettingsResult): string | undefined {
	return result.error || Object.values(result.errors ?? {}).find(Boolean) || result.conflict?.message || undefined;
}

function isFailure(result: void | SettingsResult): result is SettingsResult {
	return Boolean(result && (result.error || result.conflict || Object.values(result.errors ?? {}).some(Boolean)));
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
 */
export class InstantCore<T> {
	#options: InstantCoreOptions<T>;
	#current: T;
	#committed: T;
	#status: SettingStatus = 'idle';
	#error: string | undefined;
	#generation = 0;
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
		return this.#run(value, false);
	}

	/** Runs the failed change again. Does nothing unless the status is `error`. */
	retry(): Promise<void> {
		if (this.#status !== 'error' || !this.#attempt) return Promise.resolve();
		return this.#run(this.#attempt.value, this.#attempt.undo);
	}

	/**
	 * Reverses the last successful change. With a `token`, only while that token still owns the
	 * undo slot, so a stale notice cannot undo a newer change. Resolves once the undo settled;
	 * false when there was nothing (or nothing current) to undo.
	 */
	async undo(token?: number): Promise<boolean> {
		const owner = token ?? this.#slot.token;
		if (this.#status === 'pending' || owner === undefined || !this.#slot.isCurrent(owner)) return false;
		const value = this.#slot.take(owner) as T;
		await this.#run(value, true);
		return true;
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

	#run(value: T, isUndo: boolean): Promise<void> {
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
			this.#settle(generation, value, before, isUndo, { rejected: true });
			return Promise.resolve();
		}
		if (!thenable(outcome)) {
			this.#settle(generation, value, before, isUndo, { result: outcome });
			return Promise.resolve();
		}
		this.#emit();
		return Promise.resolve(outcome).then(
			(result) => this.#settle(generation, value, before, isUndo, { result }),
			() => this.#settle(generation, value, before, isUndo, { rejected: true })
		);
	}

	#settle(generation: number, value: T, before: T, isUndo: boolean, outcome: Outcome): void {
		if (generation !== this.#generation) return;
		if (outcome.rejected || isFailure(outcome.result)) {
			this.#current = this.#committed;
			this.#status = 'error';
			this.#error = outcome.result ? failureText(outcome.result) : undefined;
			this.#emit();
			return;
		}
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
	}

	#clearTimer(): void {
		if (this.#timer !== undefined) clearTimeout(this.#timer);
		this.#timer = undefined;
	}

	#emit(): void {
		this.#options.onChange?.(this.snapshot);
	}
}
