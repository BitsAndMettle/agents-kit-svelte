import type { NativeSelectOption, RadioOption } from '../primitives/form';

/**
 * One row of a `SettingsForm`. Its control follows its value: a switch for a boolean, a number box
 * for a number, and for a string a select of its `options`, or a text box when it has none.
 */
export interface Setting {
	/** Unique in the form. Reported with every change. */
	id: string;
	label: string;
	/** What the setting does, under the label. */
	description?: string;
	/** The saved value. */
	value: boolean | number | string;
	/** A number: the least it may be. */
	min?: number;
	/** A number: the most it may be. */
	max?: number;
	/** A number: the distance between allowed values. Without it, whole numbers. */
	step?: number;
	/** A string: the values to choose from. */
	options?: NativeSelectOption[];
	disabled?: boolean;
}

/** One row of a `TierMatrix`. */
export interface Tier {
	/** The tier's key in the matrix's `value`. */
	id: string;
	label: string;
	description?: string;
	/** Shows the tier's choice without letting the person change it, e.g. a tier that always asks. */
	locked?: boolean;
}

/** A named set of choices that one press applies. */
export interface TierPreset<V> {
	id: string;
	label: string;
	/** The choices it sets: one per tier, or only for the tiers it changes. */
	value: Partial<V>;
}

export interface TierMatrixProps<V extends Record<string, string>> {
	/** The rows, in order. */
	tiers: Tier[];
	/** The choices every tier has, in order. */
	options: RadioOption[];
	/** The saved choice of each tier, by tier id. */
	value: V;
	/** Buttons above the rows. The one whose choices match what is shown is pressed. */
	presets?: TierPreset<V>[];
	/**
	 * Called with the whole new value as soon as the person changes a tier or presses a preset. The
	 * new value shows at once. Return the promise that saves it and the matrix stays busy until it
	 * settles, then shows `value` again: update `value` before you resolve, and a change you refuse
	 * snaps back. A rejection is yours to handle.
	 */
	onChange: (value: V) => unknown;
	/** Turns every control off, e.g. for someone who may only look. */
	disabled?: boolean;
	/** Names the group of preset buttons. */
	presetsLabel?: string;
	class?: string;
}
