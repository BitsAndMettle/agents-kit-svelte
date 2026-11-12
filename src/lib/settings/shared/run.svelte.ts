import { isThenable } from '../../core/promise';
import type { SettingsHandler } from './types';
import { readResult, type SettingsOutcome } from './undo';

/** Where one button's callback stands. */
export type SettingsRunStatus = 'idle' | 'pending' | 'done' | 'failed';

/**
 * Runs one intent callback (`onRequest`, `onResend`, an action's `onSelect`, a dismiss) for the
 * button that owns it: `pending` while a returned promise is open, then `done` or `failed`, read
 * with `readResult` (so `{error}`, `{errors}` and `{conflict}` all fail). While pending, a second
 * run is ignored, not queued. A rejection or throw keeps no thrown text (`error` stays undefined:
 * show the component's generic label). Construct it while a component initialises.
 */
export class SettingsHandlerRun {
	#status = $state<SettingsRunStatus>('idle');
	#error = $state<string | undefined>(undefined);
	#notice = $state<string | undefined>(undefined);
	#generation = 0;

	get status(): SettingsRunStatus {
		return this.#status;
	}

	get pending(): boolean {
		return this.#status === 'pending';
	}

	/** The handler's own failure message, if it returned one. */
	get error(): string | undefined {
		return this.#error;
	}

	/** The handler's `{notice}`, after success. */
	get notice(): string | undefined {
		return this.#notice;
	}

	/**
	 * Calls `handler` unless a run is pending.
	 *
	 * @returns True on success, false on failure or when ignored.
	 */
	async run<A extends unknown[]>(handler: SettingsHandler<A> | ((...args: A) => unknown) | undefined, ...args: A): Promise<boolean> {
		if (!handler || this.#status === 'pending') return false;
		const generation = ++this.#generation;
		this.#error = undefined;
		this.#notice = undefined;
		let result: unknown;
		try {
			result = handler(...args);
		} catch {
			return this.#settle(generation, { ok: false });
		}
		if (!isThenable(result)) return this.#settle(generation, readResult(result));
		this.#status = 'pending';
		try {
			const settled = await result;
			return this.#settle(generation, readResult(settled));
		} catch {
			return this.#settle(generation, { ok: false });
		}
	}

	/** Back to idle (forgets a run in flight). */
	reset(): void {
		this.#generation++;
		this.#status = 'idle';
		this.#error = undefined;
		this.#notice = undefined;
	}

	#settle(generation: number, outcome: SettingsOutcome): boolean {
		if (generation !== this.#generation) return false;
		if (outcome.ok) {
			this.#status = 'done';
			this.#notice = outcome.notice;
			return true;
		}
		this.#status = 'failed';
		this.#error = outcome.error;
		return false;
	}
}
