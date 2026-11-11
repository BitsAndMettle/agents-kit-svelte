import { copyText } from '../../ui/clipboard';

/** Where a local copy stands. */
export type CopyStatus = 'idle' | 'copied' | 'failed';

/**
 * Copy feedback over `copyText`: `copied` or `failed`, then back to `idle` after `resetAfterMs`.
 * The value is never stored. Announce `status` politely; on `failed`, select the text as a fallback.
 */
export class CopyState {
	#status = $state<CopyStatus>('idle');
	#timer: ReturnType<typeof setTimeout> | undefined;
	/** How long `copied` / `failed` shows. */
	resetAfterMs: number;

	constructor(resetAfterMs = 2000) {
		this.resetAfterMs = resetAfterMs;
	}

	get status(): CopyStatus {
		return this.#status;
	}

	/** Copies `text` and reports whether it worked. */
	async copy(text: string): Promise<boolean> {
		const ok = await copyText(text);
		this.#status = ok ? 'copied' : 'failed';
		clearTimeout(this.#timer);
		this.#timer = setTimeout(() => (this.#status = 'idle'), this.resetAfterMs);
		return ok;
	}

	/** Back to idle now (for example when the value changes). */
	reset(): void {
		clearTimeout(this.#timer);
		this.#status = 'idle';
	}
}
