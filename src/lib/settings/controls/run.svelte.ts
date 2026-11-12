import { isThenable } from '../../core/promise';
import type { SettingsResult } from '../shared/types';

/** Where one button's callback stands. */
export type ActionRunStatus = 'idle' | 'pending' | 'done' | 'failed';

/** A returned `{error}`, `{errors}` or `{conflict}` fails with the handler's own message; anything else succeeds. */
function readOutcome(result: unknown): { ok: true; notice?: string } | { ok: false; error?: string } {
	const r = result as SettingsResult | undefined;
	if (!r || typeof r !== 'object') return { ok: true };
	const message = r.error || Object.values(r.errors ?? {}).find(Boolean) || r.conflict?.message;
	if (message || r.conflict || Object.values(r.errors ?? {}).some(Boolean)) return { ok: false, error: message || undefined };
	return { ok: true, notice: r.notice };
}

/**
 * Runs one `SettingsAction.onSelect` for the button that owns it (an add, empty-state or meter
 * action): `pending` while a returned promise is open, then `done` or `failed`. While pending, a
 * second run is ignored. A rejection or throw keeps no thrown text (`error` stays undefined: show
 * the component's generic label). Construct it while a component initialises.
 *
 * The same contract as the rows group's runner; controls may not import another group, so this
 * stays local until the shared layer offers one.
 */
export class ActionRun {
	#status = $state<ActionRunStatus>('idle');
	#error = $state<string | undefined>(undefined);
	#generation = 0;

	get status(): ActionRunStatus {
		return this.#status;
	}

	get pending(): boolean {
		return this.#status === 'pending';
	}

	/** The handler's own failure message, if it returned one. */
	get error(): string | undefined {
		return this.#error;
	}

	/** Calls `handler` unless a run is pending. Resolves true on success. */
	async run(handler: (() => unknown) | undefined): Promise<boolean> {
		if (!handler || this.#status === 'pending') return false;
		const generation = ++this.#generation;
		this.#error = undefined;
		let result: unknown;
		try {
			result = handler();
		} catch {
			return this.#settle(generation, { ok: false });
		}
		if (!isThenable(result)) return this.#settle(generation, readOutcome(result));
		this.#status = 'pending';
		try {
			return this.#settle(generation, readOutcome(await result));
		} catch {
			return this.#settle(generation, { ok: false });
		}
	}

	#settle(generation: number, outcome: ReturnType<typeof readOutcome>): boolean {
		if (generation !== this.#generation) return false;
		this.#status = outcome.ok ? 'done' : 'failed';
		this.#error = outcome.ok ? undefined : outcome.error;
		return outcome.ok;
	}
}
