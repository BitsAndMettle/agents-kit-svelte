/**
 * What a control shows between a person's change and the save that follows it. `hold` shows the
 * new value at once and keeps it until the promise from `save` settles. Then the saved value shows
 * again, so a change that was refused snaps back. The newest change wins: an older save that
 * settles later lets go of nothing.
 */
export class Draft<T> {
	#held = $state.raw<{ value: T }>();

	/** The value being saved, or undefined while the saved one shows. */
	get value(): T | undefined {
		return this.#held?.value;
	}

	async hold(value: T, save: (value: T) => unknown): Promise<void> {
		const held = { value };
		this.#held = held;
		try {
			await save(value);
		} finally {
			if (this.#held === held) this.#held = undefined;
		}
	}
}
