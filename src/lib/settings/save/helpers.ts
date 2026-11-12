/**
 * Pure helpers of the save group: change summaries, undo ownership, conflict choices,
 * consequence groups and reassignment fields. A leaf (type-only imports), so node tests load it.
 */
import type { ControlLike, FormLike } from '../shared/diff';
import type { ConflictField, ConsequenceGroup, ConsequenceItem, ReassignOption, ReassignSpec, SettingsChange } from '../shared/types';

/** Which side of an edit conflict to keep for one field. */
export type ConflictKeep = 'mine' | 'theirs' | 'both';

/** The tone words a consequence can carry, mapped to the kit's colour tones. */
export const CONSEQUENCE_TONES = {
	ok: 'success',
	no: 'danger',
	warn: 'warning',
	info: 'neutral'
} as const satisfies Record<ConsequenceItem['tone'], 'success' | 'danger' | 'warning' | 'neutral'>;

/**
 * The first `max` changes to show, and how many are left over ("+N more").
 *
 * @param changes - Every unsaved change, in field order.
 * @param max - How many to list (at least 0).
 */
export function summarizeChanges(changes: readonly SettingsChange[], max: number): { shown: SettingsChange[]; more: number } {
	const limit = Math.max(0, Math.floor(max));
	const shown = changes.slice(0, limit);
	return { shown, more: changes.length - shown.length };
}

/**
 * True when a notice's undo token no longer owns the undo point: the app passed a different
 * current token, or `null` (nothing can be undone now). An unknown current token (`undefined`)
 * never supersedes.
 */
export function isSuperseded(undoToken: string | number | undefined, currentToken: string | number | null | undefined): boolean {
	if (undoToken === undefined || currentToken === undefined) return false;
	return currentToken === null || currentToken !== undoToken;
}

/**
 * The choice per conflicting field: the given value, else the default, else "theirs" (the latest
 * saved version). "Both" falls back to "theirs" where the field does not allow it.
 */
export function conflictChoices(
	fields: readonly ConflictField[],
	value?: Readonly<Record<string, ConflictKeep>>,
	defaultValue?: Readonly<Record<string, ConflictKeep>>
): Record<string, ConflictKeep> {
	const out: Record<string, ConflictKeep> = {};
	for (const field of fields) {
		const wanted = value?.[field.name] ?? defaultValue?.[field.name] ?? 'theirs';
		out[field.name] = wanted === 'both' && !field.allowBoth ? 'theirs' : wanted;
	}
	return out;
}

/** True when the consequences are titled groups rather than one flat list. */
export function isGroupList(consequences: readonly ConsequenceItem[] | readonly ConsequenceGroup[]): consequences is readonly ConsequenceGroup[] {
	return consequences.length > 0 && 'items' in consequences[0];
}

/**
 * A flat consequence list as titled groups: its effects under `happens`, then its `ok` items (what
 * keeps working) under `stays`. One group when the list has only one kind.
 */
export function groupFlatConsequences(items: readonly ConsequenceItem[], happens: string, stays: string): ConsequenceGroup[] {
	const effects = items.filter((item) => item.tone !== 'ok');
	const kept = items.filter((item) => item.tone === 'ok');
	if (effects.length === 0 || kept.length === 0) return [{ label: happens, items: [...items] }];
	return [
		{ label: happens, items: effects },
		{ label: stays, items: kept }
	];
}

/**
 * The heading level `steps` below `level`, kept within h2 to h6.
 *
 * @param level - The starting level.
 * @param steps - How many levels down (default 1).
 */
export function headingBelow(level: number, steps = 1): 2 | 3 | 4 | 5 | 6 {
	return Math.min(6, Math.max(2, Math.floor(level) + steps)) as 2 | 3 | 4 | 5 | 6;
}

/** The posted name of one dependent's replacement: `reassign.<id>` (or `<name>.<id>`). */
export function reassignFieldName(spec: Pick<ReassignSpec, 'name'>, id: string): string {
	return `${spec.name ?? 'reassign'}.${id}`;
}

/** The choices offered for one dependent. */
export function reassignOptions(spec: Pick<ReassignSpec, 'options'>, id: string): ReassignOption[] {
	return typeof spec.options === 'function' ? spec.options(id) : spec.options;
}

/**
 * The starting replacement for every dependent: `defaultFor(id)` when it names an enabled option,
 * else the first enabled option, else an empty string.
 */
export function reassignDefaults(spec: Pick<ReassignSpec, 'dependents' | 'options' | 'defaultFor'>): Record<string, string> {
	const out: Record<string, string> = {};
	for (const dependent of spec.dependents) {
		const options = reassignOptions(spec, dependent.id).filter((o) => !o.disabled);
		const wanted = spec.defaultFor?.(dependent.id);
		out[dependent.id] = options.some((o) => o.value === wanted) ? (wanted as string) : (options[0]?.value ?? '');
	}
	return out;
}

/** Reads each dependent's replacement from posted form data (anything with `get`). */
export function readReassign(data: { get(name: string): unknown }, spec: Pick<ReassignSpec, 'name' | 'dependents'>): Record<string, string> {
	const out: Record<string, string> = {};
	for (const dependent of spec.dependents) {
		const value = data.get(reassignFieldName(spec, dependent.id));
		out[dependent.id] = typeof value === 'string' ? value : '';
	}
	return out;
}

/** Control types that hold no setting value. */
const NOT_VALUES = new Set(['submit', 'button', 'reset', 'image', 'file', 'hidden', 'fieldset', 'output', 'object']);

/** One form control's value at the moment a save was submitted. */
export interface SubmittedControl {
	control: ControlLike;
	checked?: boolean;
	selected?: boolean[];
	value?: string;
}

/** Records every value-holding control's current value (call it when a save is submitted). */
export function snapshotControls(form: FormLike): SubmittedControl[] {
	const out: SubmittedControl[] = [];
	for (let i = 0; i < form.elements.length; i++) {
		const control = form.elements[i] as Partial<ControlLike> | null;
		if (!control || typeof control.name !== 'string' || !control.name || typeof control.type !== 'string' || NOT_VALUES.has(control.type)) continue;
		out.push(readControl(control as ControlLike));
	}
	return out;
}

function readControl(control: ControlLike): SubmittedControl {
	if (control.type === 'checkbox' || control.type === 'radio') return { control, checked: Boolean(control.checked) };
	if (control.type.startsWith('select')) return { control, selected: Array.from(control.options ?? [], (o) => o.selected) };
	return { control, value: control.value ?? '' };
}

function differs(a: SubmittedControl, b: SubmittedControl): boolean {
	if (a.selected || b.selected) return (a.selected ?? []).some((s, i) => s !== b.selected?.[i]);
	return a.checked !== b.checked || a.value !== b.value;
}

function restore(state: SubmittedControl): void {
	const { control } = state;
	if (state.checked !== undefined) control.checked = state.checked;
	else if (state.selected) Array.from(control.options ?? []).forEach((o, i) => (o.selected = state.selected?.[i] ?? false));
	else if (state.value !== undefined && control.value !== state.value) control.value = state.value;
}

/**
 * After a save succeeded and the form made its current values the new defaults: every control
 * edited while the save was in flight gets the submitted value back as its default, so that edit
 * still counts as unsaved. Current values are kept (setting a default can move an untouched
 * control's value, so each one is put back).
 *
 * @param submitted - `snapshotControls` taken when the save was submitted.
 * @returns The controls that still have an unsaved edit.
 */
export function keepEditsMadeWhileSaving(submitted: readonly SubmittedControl[]): ControlLike[] {
	const current = submitted.map((s) => readControl(s.control));
	const edited: ControlLike[] = [];
	submitted.forEach((was, i) => {
		if (!differs(was, current[i])) return;
		const { control } = was;
		if (was.checked !== undefined) control.defaultChecked = was.checked;
		else if (was.selected) Array.from(control.options ?? []).forEach((o, j) => (o.defaultSelected = was.selected?.[j] ?? false));
		else control.defaultValue = was.value ?? '';
		edited.push(control);
	});
	// Radios share a group: put every control back, not only the edited ones.
	if (edited.length > 0) current.forEach((state) => (differs(state, readControl(state.control)) ? restore(state) : undefined));
	return edited;
}
