import { getContext, setContext } from 'svelte';

/**
 * What a `Field` tells the control inside it. Read through getters, so the control's
 * attributes follow the field's props as they change.
 */
export interface FieldState {
	/** Id the control takes, so the field's `<label for>` names it. */
	readonly controlId: string;
	/** Id of the `<label>` (or the `<legend>` in a group field). */
	readonly labelId: string;
	/** Id of the description, when there is one. */
	readonly descriptionId: string | undefined;
	/** The same id as `descriptionId`, kept so code that reads the context keeps working. */
	readonly hintId: string | undefined;
	/** Id of the error message, while it is shown. */
	readonly errorId: string | undefined;
	readonly invalid: boolean;
	readonly required: boolean;
	readonly disabled: boolean;
	/** A `<fieldset>` around several controls (or one RadioGroup) instead of one labelled control. */
	readonly group: boolean;
	/**
	 * More ids that describe the control, after the description and before the error: a settings
	 * row's status line or lock reason, say. Joined by `fieldControlAttrs` for a plain field; in a
	 * group field the `<fieldset>` should carry them.
	 */
	readonly describedBy?: readonly string[];
}

/**
 * The attributes a field gives its control. `Field` passes them to its children snippet
 * too, so a plain `<input {...control}>` or another library's control can be wired the same way.
 */
export interface FieldControlAttrs {
	id?: string;
	'aria-describedby'?: string;
	'aria-invalid'?: 'true';
	'aria-errormessage'?: string;
	'aria-required'?: 'true';
	required?: boolean;
	disabled?: boolean;
}

/** What the control itself was given, before the field's wiring is merged in. */
export interface OwnControlState {
	id?: string | null;
	describedBy?: string | null;
	invalid?: boolean;
	required?: boolean;
	disabled?: boolean;
}

/**
 * How the control sits in its field. A `control` takes the field's id in a plain field and
 * only the invalid state inside a group; a `group` control (RadioGroup) is the whole group,
 * so it also takes `required` there.
 */
export type FieldControlKind = 'control' | 'group';

const FIELD = Symbol('agents-kit-field');

/** Called by `Field`; the nearest field wins for the controls below it. */
export function setFieldContext(field: FieldState): void {
	setContext(FIELD, field);
}

/** The surrounding `Field`, or undefined when the control stands alone. */
export function getFieldContext(): FieldState | undefined {
	return getContext<FieldState | undefined>(FIELD);
}

/** Joins id references, skipping blanks and repeats. */
export function joinIds(...ids: (string | null | undefined)[]): string | undefined {
	const seen = [...new Set(ids.flatMap((id) => (id ?? '').split(/\s+/)).filter(Boolean))];
	return seen.length ? seen.join(' ') : undefined;
}

/**
 * Merges a control's own state with its field's wiring.
 *
 * - No field: the control's own values only.
 * - A plain field: the field's id (so its label names the control), the description and error as
 *   descriptions, and the field's invalid, required and disabled states.
 * - A group field (`<fieldset>`): the fieldset carries the description and disables native
 *   controls itself, so members take only the invalid state and the error reference; a
 *   `group` control (RadioGroup) takes `required` and `disabled` as well.
 * - `required` becomes the native attribute, or `aria-required` for a `group` control.
 *
 * @param field - The surrounding field, if any.
 * @param own - What the control was given directly; these win for booleans set to true.
 * @param kind - `control` (default) or `group`.
 * @returns Attributes to spread on the control.
 */
export function fieldControlAttrs(
	field: FieldState | undefined,
	own: OwnControlState = {},
	kind: FieldControlKind = 'control'
): FieldControlAttrs {
	const plain = field !== undefined && !field.group;
	const whole = field !== undefined && (plain || kind === 'group');
	const invalid = Boolean(own.invalid) || Boolean(field?.invalid);
	const required = Boolean(own.required) || (whole && Boolean(field?.required));
	const disabled = Boolean(own.disabled) || (whole && Boolean(field?.disabled));
	const errorId = invalid ? field?.errorId : undefined;
	const attrs: FieldControlAttrs = {};
	const id = plain ? field.controlId : (own.id ?? undefined);
	if (id) attrs.id = id;
	const describedBy = plain
		? joinIds(own.describedBy, field.descriptionId, ...(field.describedBy ?? []), errorId)
		: joinIds(own.describedBy);
	if (describedBy) attrs['aria-describedby'] = describedBy;
	if (invalid) attrs['aria-invalid'] = 'true';
	if (errorId) attrs['aria-errormessage'] = errorId;
	// Native controls expose `required` themselves; a group (role="radiogroup") needs the ARIA form.
	if (required && kind === 'group') attrs['aria-required'] = 'true';
	else if (required) attrs.required = true;
	if (disabled) attrs.disabled = true;
	return attrs;
}

/** What `createFieldState` reads, each lazily, so the state follows the owner's props. */
export interface FieldStateOptions {
	/**
	 * Base id. The parts are `${id}-control`, `${id}-label`, `${id}-description` and `${id}-error`,
	 * the same scheme `Field` uses, so a custom layout wires its label, description and error the
	 * same way. Pass `$props.id()`.
	 */
	id: string;
	/** The control's id, when the owner sets one; defaults to `${id}-control`. */
	controlId?: () => string | undefined;
	/** True while a description is rendered at `descriptionId`. */
	description?: () => boolean;
	/** True while an error message is rendered at `${id}-error`; it also makes the field invalid. */
	error?: () => boolean;
	invalid?: () => boolean;
	required?: () => boolean;
	disabled?: () => boolean;
	group?: () => boolean;
	/** More describing ids (a status line, a lock reason); blanks are skipped. */
	describedBy?: () => readonly (string | null | undefined)[] | undefined;
}

/**
 * Builds the state a `Field` gives its control, for components that lay out their own label,
 * description and error (a settings row) but want kit controls inside to wire themselves the
 * same way. Pass the result to `setFieldContext`. Every property is a getter over `opts`.
 *
 * @param opts - The base id and lazy readers of the owner's props.
 * @returns A live `FieldState`.
 */
export function createFieldState(opts: FieldStateOptions): FieldState {
	const { id } = opts;
	return {
		get controlId() {
			return opts.controlId?.() ?? `${id}-control`;
		},
		labelId: `${id}-label`,
		get descriptionId() {
			return opts.description?.() ? `${id}-description` : undefined;
		},
		get hintId() {
			return this.descriptionId;
		},
		get errorId() {
			return opts.error?.() ? `${id}-error` : undefined;
		},
		get invalid() {
			return Boolean(opts.invalid?.()) || Boolean(opts.error?.());
		},
		get required() {
			return Boolean(opts.required?.());
		},
		get disabled() {
			return Boolean(opts.disabled?.());
		},
		get group() {
			return Boolean(opts.group?.());
		},
		get describedBy() {
			const ids = (opts.describedBy?.() ?? []).filter((v): v is string => Boolean(v));
			return ids.length ? ids : undefined;
		}
	};
}
