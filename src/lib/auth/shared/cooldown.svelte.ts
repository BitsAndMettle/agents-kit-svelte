import type { TimeInput } from '../../core/time';
import { secondsLeft } from './wait';

/**
 * A resend or retry wait, counted down once a second while it runs. The server decides the wait
 * (pass when it ends, e.g. from a rate-limit response); this only shows it. Server render and
 * the first client render use the time of rendering, so a button that must wait is never briefly
 * enabled. Construct it while the component initialises.
 */
export class Cooldown {
	#until: () => TimeInput | undefined;
	#now = $state(Date.now());

	/** @param until - Reads when the wait ends (a prop), or undefined for no wait. */
	constructor(until: () => TimeInput | undefined) {
		this.#until = until;
		$effect(() => {
			if (secondsLeft(this.#until(), Date.now()) === 0) return;
			this.#now = Date.now();
			const id = setInterval(() => {
				this.#now = Date.now();
				if (secondsLeft(this.#until(), this.#now) === 0) clearInterval(id);
			}, 1000);
			return () => clearInterval(id);
		});
	}

	/** Whole seconds left; 0 when the wait is over. */
	get remaining(): number {
		return secondsLeft(this.#until(), this.#now);
	}

	/** True while the wait runs. */
	get active(): boolean {
		return this.remaining > 0;
	}
}
