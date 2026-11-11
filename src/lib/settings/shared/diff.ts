/**
 * Pure helpers of the staged model: read a form's saved (default) and current values, and list
 * what changed. A leaf with no DOM globals: it reads controls through the small structural types
 * below, so node tests can pass plain objects and the browser passes a real `<form>`.
 */
import type { SettingsChange, SettingsFieldDescriptor } from './types';

/** The parts of an `<option>` the diff reads. */
export interface OptionLike {
	value: string;
	text?: string;
	label?: string;
	disabled?: boolean;
	selected: boolean;
	defaultSelected: boolean;
}

/** The parts of a form control the diff reads (input, select, textarea). */
export interface ControlLike {
	name: string;
	/** `text`, `checkbox`, `radio`, `select-one`, `select-multiple`, `textarea`, ... */
	type: string;
	disabled?: boolean;
	value?: string;
	defaultValue?: string;
	checked?: boolean;
	defaultChecked?: boolean;
	options?: ArrayLike<OptionLike>;
	labels?: ArrayLike<{ textContent: string | null }> | null;
	matches?: (selector: string) => boolean;
}

/** The part of a `<form>` the diff reads. */
export interface FormLike {
	elements: ArrayLike<unknown>;
}

/** Words for a lone checkbox or switch in change text. */
export interface ChangeWords {
	on: string;
	off: string;
}

/** English defaults for `ChangeWords`. */
export const CHANGE_WORDS: ChangeWords = { on: 'On', off: 'Off' };

/** A field's value as posted (`raw`) and as shown (`text`). */
export interface FieldReading {
	raw: string | string[];
	text: string;
}

/** Control types that never count as a setting's value. */
const SKIPPED = new Set(['submit', 'button', 'reset', 'image', 'file', 'hidden', 'fieldset', 'output', 'object']);

function controlsOf(form: FormLike): ControlLike[] {
	const out: ControlLike[] = [];
	for (let i = 0; i < form.elements.length; i++) {
		const el = form.elements[i] as Partial<ControlLike> | null;
		if (!el || typeof el.name !== 'string' || !el.name || typeof el.type !== 'string') continue;
		if (SKIPPED.has(el.type)) continue;
		if (el.disabled || el.matches?.(':disabled')) continue;
		out.push(el as ControlLike);
	}
	return out;
}

function labelText(control: ControlLike): string {
	const text = control.labels?.[0]?.textContent?.replace(/\s+/g, ' ').trim();
	return text || (control.value ?? '');
}

function optionText(option: OptionLike): string {
	return (option.label || option.text || option.value).replace(/\s+/g, ' ').trim();
}

/** The options a select shows as chosen: current selection, or what a form reset would choose. */
function chosenOptions(select: ControlLike, which: 'current' | 'default'): OptionLike[] {
	const options = Array.from(select.options ?? []);
	if (which === 'current') return options.filter((o) => o.selected);
	const marked = options.filter((o) => o.defaultSelected);
	if (select.type === 'select-multiple') return marked;
	// A single select resets to its last marked option, or else its first enabled one.
	const last = marked.at(-1) ?? options.find((o) => !o.disabled);
	return last ? [last] : [];
}

function readGroup(controls: ControlLike[], which: 'current' | 'default', words: ChangeWords): FieldReading {
	const on = (c: ControlLike) => Boolean(which === 'current' ? c.checked : c.defaultChecked);
	const radios = controls.filter((c) => c.type === 'radio');
	if (radios.length) {
		const chosen = radios.find(on);
		return chosen ? { raw: chosen.value ?? '', text: labelText(chosen) } : { raw: '', text: '' };
	}
	const boxes = controls.filter((c) => c.type === 'checkbox');
	if (boxes.length === 1) {
		const box = boxes[0];
		return on(box) ? { raw: box.value || 'on', text: words.on } : { raw: '', text: words.off };
	}
	if (boxes.length > 1) {
		const chosen = boxes.filter(on);
		return { raw: chosen.map((c) => c.value || 'on'), text: chosen.map(labelText).join(', ') };
	}
	const select = controls.find((c) => c.type.startsWith('select'));
	if (select) {
		const chosen = chosenOptions(select, which);
		const raw = chosen.map((o) => o.value);
		return { raw: select.type === 'select-multiple' ? raw : (raw[0] ?? ''), text: chosen.map(optionText).join(', ') };
	}
	const values = controls.map((c) => (which === 'current' ? c.value : c.defaultValue) ?? '');
	return values.length === 1 ? { raw: values[0], text: values[0] } : { raw: values, text: values.join(', ') };
}

function read(form: FormLike, which: 'current' | 'default', words: ChangeWords): Map<string, FieldReading> {
	const byName = new Map<string, ControlLike[]>();
	for (const control of controlsOf(form)) {
		const list = byName.get(control.name);
		if (list) list.push(control);
		else byName.set(control.name, [control]);
	}
	const out = new Map<string, FieldReading>();
	for (const [name, controls] of byName) out.set(name, readGroup(controls, which, words));
	return out;
}

/**
 * What each named control would hold after a form reset: `defaultValue`, `defaultChecked`,
 * `defaultSelected`. Server-rendered defaults are the saved values, so this is the saved state.
 * Hidden, button, file and disabled controls are skipped. A name with several checkboxes (or a
 * multiple select) reads as a list; a lone checkbox reads as its value when checked, else ''.
 */
export function readDefaults(form: FormLike): Record<string, string | string[]> {
	return Object.fromEntries([...read(form, 'default', CHANGE_WORDS)].map(([name, r]) => [name, r.raw]));
}

/** The same reading as `readDefaults`, of what the controls hold now. */
export function readCurrent(form: FormLike): Record<string, string | string[]> {
	return Object.fromEntries([...read(form, 'current', CHANGE_WORDS)].map(([name, r]) => [name, r.raw]));
}

/** Equal values, ignoring the order of lists. */
export function sameValue(a: string | string[], b: string | string[]): boolean {
	if (typeof a === 'string' || typeof b === 'string') return a === b;
	if (a.length !== b.length) return false;
	const sorted = [...b].sort();
	return [...a].sort().every((v, i) => v === sorted[i]);
}

/**
 * The described fields whose current value differs from their default, in `fields` order. Text
 * comes from the field's `format`, else option text (selects), label text (radios, checkbox
 * groups), `words.on`/`words.off` (a lone checkbox) or the value. Controls not named in `fields`
 * never count.
 *
 * @param form - The `<form>` (or a plain object shaped like one).
 * @param fields - Name, label and optional `format` of each staged field.
 * @param words - On/off words for lone checkboxes.
 */
export function diffForm(form: FormLike, fields: readonly SettingsFieldDescriptor[], words: ChangeWords = CHANGE_WORDS): SettingsChange[] {
	const saved = read(form, 'default', words);
	const now = read(form, 'current', words);
	const changes: SettingsChange[] = [];
	for (const field of fields) {
		const before = saved.get(field.name);
		const after = now.get(field.name);
		if (!before || !after || sameValue(before.raw, after.raw)) continue;
		changes.push({
			name: field.name,
			label: field.label,
			from: field.format ? field.format(before.raw) : before.text,
			to: field.format ? field.format(after.raw) : after.text
		});
	}
	return changes;
}

function toRaw(value: unknown): string | string[] {
	if (Array.isArray(value)) return value.map((v) => String(v));
	if (value === undefined || value === null || value === false) return '';
	if (value === true) return 'on';
	return String(value);
}

function toText(value: unknown, words: ChangeWords): string {
	if (typeof value === 'boolean') return value ? words.on : words.off;
	if (Array.isArray(value)) return value.map((v) => String(v)).join(', ');
	if (value === undefined || value === null) return '';
	return String(value);
}

/**
 * The changes between a saved object and a draft, for apps that keep their own draft state (the
 * controlled `changes` path). Values compare as posted strings, lists ignoring order.
 *
 * @param fields - Name, label and optional `format` of each field to compare, in display order.
 * @param saved - The saved values, keyed by field name.
 * @param draft - The edited values, keyed by field name.
 * @param words - On/off words for boolean values.
 */
export function describeChanges<V extends Record<string, unknown>>(
	fields: readonly SettingsFieldDescriptor[],
	saved: V,
	draft: V,
	words: ChangeWords = CHANGE_WORDS
): SettingsChange[] {
	const changes: SettingsChange[] = [];
	for (const field of fields) {
		const before = saved[field.name];
		const after = draft[field.name];
		if (sameValue(toRaw(before), toRaw(after))) continue;
		changes.push({
			name: field.name,
			label: field.label,
			from: before === undefined ? undefined : field.format ? field.format(toRaw(before)) : toText(before, words),
			to: field.format ? field.format(toRaw(after)) : toText(after, words)
		});
	}
	return changes;
}

/**
 * Makes what the controls hold now their reset target (`defaultValue`, `defaultChecked`,
 * `defaultSelected`), after a save succeeded without the page re-rendering new defaults. The
 * form is then clean, and Discard restores the saved values.
 */
export function adoptCurrentAsDefaults(form: FormLike): void {
	for (const control of controlsOf(form)) {
		if (control.type === 'checkbox' || control.type === 'radio') control.defaultChecked = Boolean(control.checked);
		else if (control.type.startsWith('select')) {
			// Read every selection first: setting `defaultSelected` can move an untouched select's selection.
			const options = Array.from(control.options ?? []);
			const selected = options.map((o) => o.selected);
			options.forEach((o, i) => (o.defaultSelected = selected[i]));
		} else control.defaultValue = control.value ?? '';
	}
}
