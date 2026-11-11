import { untrack } from 'svelte';
import type { SettingStatus, SettingsHandler } from './types';
import { InstantCore, type InstantSnapshot } from './undo';

/** What `InstantSetting` reads from its component, each lazily so props stay live. */
export interface InstantOptions<T> {
	/** The saved value (a prop). When it changes from outside while nothing is pending, it is adopted. */
	value: () => T;
	/** The `onCommit` prop. Without one, a change applies locally. */
	commit: () => SettingsHandler<[T]> | undefined;
	/** The `onUndo` prop, given the value to go back to. Defaults to `commit`. */
	undo?: () => SettingsHandler<[T]> | undefined;
	equals?: (a: T, b: T) => boolean;
	/** How long `saved` shows. Default 2000ms. */
	savedForMs?: () => number;
	/** Whether a successful change offers Undo. Default true. */
	undoable?: () => boolean;
}

/**
 * The instant change model, the only one: a control outside a SettingsForm that has `onCommit`
 * runs through this. The rules live in `InstantCore` (`undo.ts`):
 *
 * - `current` changes at once; only the newest `set()` settles.
 * - A failure reverts to the last committed value. `error` holds only a message the handler
 *   returned; show `error ?? labels.failed` (the generic "Couldn't save. Changed back.").
 * - `saved` for 2s, then idle. One undo point, superseded by any later `set()`; undo makes none.
 *
 * Show `current` in the control. If the component has a bindable value, mirror `committed` into
 * it (never `current`), so the app's state only ever holds saved values. Construct it while the
 * component initialises.
 */
export class InstantSetting<T> {
	#core: InstantCore<T>;
	// Set in the constructor, before anything reads it.
	#snapshot = $state.raw<InstantSnapshot<T>>(undefined as never);

	constructor(options: InstantOptions<T>) {
		this.#core = new InstantCore<T>({
			initial: untrack(options.value),
			commit: options.commit,
			undo: options.undo,
			equals: options.equals,
			savedForMs: options.savedForMs,
			undoable: options.undoable,
			onChange: (snapshot) => (this.#snapshot = snapshot)
		});
		this.#snapshot = this.#core.snapshot;
		$effect.pre(() => {
			const value = options.value();
			untrack(() => this.#core.sync(value));
		});
		$effect(() => () => this.#core.dispose());
	}

	/** The optimistic value: what the control shows. */
	get current(): T {
		return this.#snapshot.current;
	}

	/** The last value the handler accepted. */
	get committed(): T {
		return this.#snapshot.committed;
	}

	get status(): SettingStatus {
		return this.#snapshot.status;
	}

	/** A message the handler returned; undefined after a rejection (show the generic label). */
	get error(): string | undefined {
		return this.#snapshot.error;
	}

	get canUndo(): boolean {
		return this.#snapshot.canUndo;
	}

	/** Token of the change Undo would reverse (hand it to a ChangeNotice). */
	get undoToken(): number | undefined {
		return this.#snapshot.undoToken;
	}

	/** True while a pending commit is in flight. A second change is still allowed: the newest wins. */
	get pending(): boolean {
		return this.#snapshot.status === 'pending';
	}

	/** Applies and commits a new value. */
	set(value: T): Promise<void> {
		return this.#core.set(value);
	}

	/** Runs the failed change again. */
	retry(): Promise<void> {
		return this.#core.retry();
	}

	/** Reverses the last change; with a token, only while that token is current. */
	undo(token?: number): Promise<boolean> {
		return this.#core.undo(token);
	}

	/** True while `token` still owns the undo point (a ChangeNotice shows "superseded" otherwise). */
	isCurrent(token: number | undefined): boolean {
		// Read the snapshot so callers re-run when the undo point changes.
		void this.#snapshot.undoToken;
		return this.#core.isCurrent(token);
	}

	dismissError(): void {
		this.#core.dismissError();
	}
}
