/**
 * Lets SettingsForm know a SaveBar inside it shows the form's status (error, conflict, saved), so
 * the form does not show the same message twice. Works on the server too: a bar counts from the
 * moment it initialises, before any effect runs.
 */
import { getContext, setContext, untrack } from 'svelte';

const KEY = Symbol('agents-kit-settings-save-bar');

export class SaveBarPresence {
	/** Bars that initialised but have not mounted yet (plain: read during the same render). */
	#starting = 0;
	#mounted = $state(0);

	/** True while at least one SaveBar inside the form shows its status. */
	get present(): boolean {
		return this.#mounted > 0 || this.#starting > 0;
	}

	/** Call while a SaveBar initialises; it moves itself to "mounted" in an effect and back out on destroy. */
	join(): void {
		this.#starting++;
		$effect(() => {
			this.#starting = Math.max(0, this.#starting - 1);
			// Read without tracking, or the effect would depend on the count it changes.
			untrack(() => this.#mounted++);
			return () => {
				untrack(() => this.#mounted--);
			};
		});
	}
}

export function setSaveBarPresence(presence: SaveBarPresence): void {
	setContext(KEY, presence);
}

export function getSaveBarPresence(): SaveBarPresence | undefined {
	return getContext<SaveBarPresence | undefined>(KEY);
}
