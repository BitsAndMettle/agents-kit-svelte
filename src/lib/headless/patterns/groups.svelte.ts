/**
 * Composite widgets that are "ListNav ('roving') + selection + role wiring", with no layer:
 * Tabs, Accordion, RadioGroup and ToggleGroup. Each is a thin class over ListNav (keys,
 * RTL, disabled skipping, tab stop) and parts.ts (ids, ValueState).
 *
 * Item parts are a ListNav item part with the pattern's role attributes laid over it (the
 * id is replaced by a readable one, which roving mode does not depend on). Selection that
 * follows focus (automatic Tabs, RadioGroup) happens only for KEY moves: the pattern's
 * root listens for keydown in the capture phase and asks ListNav to handle the key itself,
 * then selects what got highlighted. Tabbing into a group (a focusin) therefore never
 * selects anything, as the APG requires for radio groups.
 */
import { untrack } from 'svelte';
import { createAttachmentKey, type Attachment } from 'svelte/attachments';
import type { Orientation } from '../logic/roving';
import { includeValue, toggleValue } from '../logic/selection';
import { ListNav } from '../runtime/list-nav.svelte';
import { cleanups, listen, part, read, subId, type MaybeGetter, type Part, type ValueState } from '../runtime/parts';

/** Controlled getter or own $state, with one writer that reports changes. */
class Value<V> {
	#own: V = $state() as V;
	readonly #state: ValueState<V>;

	constructor(state: ValueState<V>, fallback: V) {
		this.#state = state;
		this.#own = state.defaultValue ?? fallback;
	}

	get current(): V {
		return this.#state.value ? this.#state.value() : this.#own;
	}

	write(next: V, same: (a: V, b: V) => boolean = Object.is): void {
		if (same(next, this.current)) return;
		if (this.#state.value) {
			this.#state.onValueChange(next);
		} else {
			this.#own = next;
			this.#state.onValueChange?.(next);
		}
	}
}

const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Capture-phase keydown on a nav root: let ListNav handle the key first, then report a
 * highlight it moved to. Only keys pressed on one of this nav's own items count (not on
 * other controls inside the root, nor on a nested nav's items).
 */
function keyMoves(el: HTMLElement, nav: ListNav, onMove: (value: string) => void): () => void {
	return listen(
		el,
		'keydown',
		(event) => {
			const navId = el.getAttribute('data-ak-nav-root');
			if (!(event.target instanceof Element) || navId === null || event.target.getAttribute('data-ak-nav') !== navId) return;
			const before = nav.highlighted;
			nav.handleKey(event);
			const after = nav.highlighted;
			if (after !== null && after !== before) onMove(after);
		},
		{ capture: true }
	);
}

/** When focus leaves the group, drop the highlight so the tab stop falls back to the selection. */
function resetOnLeave(el: HTMLElement, nav: ListNav): () => void {
	return listen(el, 'focusout', (event) => {
		const next = event.relatedTarget;
		if (!(next instanceof Node) || !el.contains(next)) nav.highlight(null);
	});
}

// -------------------------------------------------------------------------------- Tabs

export type TabsOptions = ValueState<string> & {
	/** From the component's `$props.id()`. */
	id: string;
	/** Default 'horizontal'. */
	orientation?: MaybeGetter<'horizontal' | 'vertical'>;
	/**
	 * 'automatic': arrow keys select (APG default when panels render cheaply).
	 * 'manual': arrow keys move focus; Enter/Space/click selects. Default 'automatic'.
	 */
	activation?: MaybeGetter<'automatic' | 'manual'>;
	/** Arrow keys wrap. Default true. */
	loop?: MaybeGetter<boolean>;
};

/**
 * Tabs. Pass `defaultValue` (or a controlled value) so the server renders the selected
 * panel; with neither, the first enabled tab is selected once the list mounts.
 */
export class Tabs {
	readonly #id: string;
	readonly #options: TabsOptions;
	readonly #value: Value<string>;
	readonly #nav: ListNav;
	readonly #listKey = createAttachmentKey();
	readonly #attachList: Attachment<HTMLElement>;

	constructor(options: TabsOptions) {
		this.#id = options.id;
		this.#options = options;
		this.#value = new Value(options, '');
		this.#nav = new ListNav({
			id: subId(options.id, 'tabs'),
			focus: 'roving',
			orientation: () => this.#orientation,
			loop: () => read(options.loop ?? true),
			typeahead: false,
			tabStop: () => this.value || null,
			onActivate: (value) => this.#value.write(value)
		});
		this.#attachList = (el) =>
			untrack(() => {
				// No value given: select the first enabled tab once the tabs are in.
				queueMicrotask(() => {
					if (this.value !== '') return;
					const first = el.querySelector<HTMLElement>('[role="tab"][data-ak-value]:not([aria-disabled="true"])');
					if (first?.dataset.akValue !== undefined) this.#value.write(first.dataset.akValue);
				});
				return cleanups(
					keyMoves(el, this.#nav, (value) => {
						if (read(this.#options.activation ?? 'automatic') === 'automatic') this.#value.write(value);
					}),
					resetOnLeave(el, this.#nav)
				);
			});
	}

	get #orientation(): 'horizontal' | 'vertical' {
		return read(this.#options.orientation ?? 'horizontal');
	}

	/** Selected tab value. Setting it reports through `onValueChange`. */
	get value(): string {
		return this.#value.current;
	}
	set value(next: string) {
		this.#value.write(next);
	}

	/** role="tablist" + aria-orientation; the nav root. */
	get list(): Part {
		return {
			...this.#nav.root,
			role: 'tablist',
			'aria-orientation': this.#orientation,
			[this.#listKey]: this.#attachList
		} as Part;
	}

	/** role="tab", id, aria-selected, aria-controls, roving tabindex, data-state="active|inactive". */
	tab(options: { value: string; disabled?: boolean }): Part<HTMLButtonElement> {
		const selected = this.value === options.value;
		return {
			...this.#nav.item(options),
			id: subId(this.#id, 'tab', options.value),
			type: 'button',
			role: 'tab',
			'aria-selected': selected,
			'aria-controls': subId(this.#id, 'panel', options.value),
			'data-state': selected ? 'active' : 'inactive',
			'data-ak-value': options.value
		} as Part<HTMLButtonElement>;
	}

	/**
	 * role="tabpanel", id, aria-labelledby, tabindex=0, `hidden` unless selected. Uses the
	 * attribute (not {#if}) so `aria-controls` always resolves; put an {#if} inside for lazy
	 * content.
	 */
	panel(value: string): Part {
		const selected = this.value === value;
		return {
			id: subId(this.#id, 'panel', value),
			role: 'tabpanel',
			'aria-labelledby': subId(this.#id, 'tab', value),
			tabindex: 0,
			hidden: !selected,
			'data-state': selected ? 'active' : 'inactive'
		};
	}
}

// --------------------------------------------------------------------------- Accordion

type AccordionValue<Multiple extends boolean> = Multiple extends true ? string[] : string | null;

export type AccordionOptions<Multiple extends boolean = false> = ValueState<AccordionValue<Multiple>> & {
	/** From the component's `$props.id()`. */
	id: string;
	multiple?: Multiple;
	/** Single mode: may the open item be closed again? Default true. */
	collapsible?: MaybeGetter<boolean>;
	/** ArrowUp/ArrowDown/Home/End between headers (APG optional). Default true. */
	keyboardNav?: boolean;
};

/**
 * Accordion per APG: put each `trigger` button inside a heading element of the right level
 * (`<h3><button {...acc.trigger(…)}>`). Every header stays in the tab order; arrow keys are
 * an extra. Closed panels use `hidden="until-found"`, so find-in-page searches them and the
 * browser's `beforematch` opens the matching item.
 */
export class Accordion<Multiple extends boolean = false> {
	readonly #id: string;
	readonly #options: AccordionOptions<Multiple>;
	readonly #value: Value<AccordionValue<Multiple>>;
	readonly #nav: ListNav;
	readonly #panelKeys = new Map<string, { key: symbol; attach: Attachment<HTMLElement> }>();

	constructor(options: AccordionOptions<Multiple>) {
		this.#id = options.id;
		this.#options = options;
		this.#value = new Value<AccordionValue<Multiple>>(
			options as ValueState<AccordionValue<Multiple>>,
			(options.multiple ? [] : null) as AccordionValue<Multiple>
		);
		this.#nav = new ListNav({
			id: subId(options.id, 'headers'),
			focus: 'roving',
			orientation: 'vertical',
			loop: true,
			typeahead: false,
			onActivate: (value) => this.toggle(value)
		});
	}

	/** Expanded value (single) or values (multiple). */
	get value(): AccordionValue<Multiple> {
		return this.#value.current;
	}

	/** Is item `value` expanded? */
	isOpen(value: string): boolean {
		return this.#list.includes(value);
	}

	/** Toggle one item, honouring `multiple` and `collapsible`. */
	toggle(value: string): void {
		this.#set(
			toggleValue(this.#list, value, {
				multiple: this.#options.multiple === true,
				collapsible: read(this.#options.collapsible ?? true)
			})
		);
	}

	/** Expand one item (never collapses). */
	expand(value: string): void {
		this.#set(includeValue(this.#list, value, this.#options.multiple === true));
	}

	/** Wrapper around the headers: the nav root for arrow-key movement. */
	get root(): Part {
		return this.#options.keyboardNav === false ? {} : this.#nav.root;
	}

	/**
	 * Header button: id, aria-expanded, aria-controls, aria-disabled while it cannot be
	 * collapsed (single, non-collapsible, open), data-state="open|closed". Stays tabbable.
	 */
	trigger(options: { value: string; disabled?: boolean }): Part<HTMLButtonElement> {
		const open = this.isOpen(options.value);
		const locked = open && this.#options.multiple !== true && !read(this.#options.collapsible ?? true);
		return {
			...this.#nav.item(options),
			id: subId(this.#id, 'trigger', options.value),
			type: 'button',
			tabindex: undefined,
			'aria-expanded': open,
			'aria-controls': subId(this.#id, 'panel', options.value),
			'aria-disabled': options.disabled || locked ? 'true' : undefined,
			'data-state': open ? 'open' : 'closed'
		} as Part<HTMLButtonElement>;
	}

	/** role="region", id, aria-labelledby; `hidden="until-found"` when closed. */
	panel(value: string): Part {
		const open = this.isOpen(value);
		let cached = this.#panelKeys.get(value);
		if (!cached) {
			const attach: Attachment<HTMLElement> = (el) => untrack(() => listen(el, 'beforematch', () => this.expand(value)));
			cached = { key: createAttachmentKey(), attach };
			this.#panelKeys.set(value, cached);
		}
		return part(cached.key, cached.attach, {
			id: subId(this.#id, 'panel', value),
			role: 'region',
			'aria-labelledby': subId(this.#id, 'trigger', value),
			hidden: open ? undefined : 'until-found',
			'data-state': open ? 'open' : 'closed'
		});
	}

	get #list(): readonly string[] {
		const value = this.value as string[] | string | null;
		return Array.isArray(value) ? value : value === null ? [] : [value];
	}

	#set(next: readonly string[]): void {
		const out = (this.#options.multiple ? [...next] : (next[0] ?? null)) as AccordionValue<Multiple>;
		this.#value.write(out, (a, b) => (Array.isArray(a) && Array.isArray(b) ? sameList(a, b) : Object.is(a, b)));
	}
}

// -------------------------------------------------------------------------- RadioGroup

export type RadioGroupOptions = ValueState<string | null> & {
	/** From the component's `$props.id()`. */
	id: string;
	/** Default 'both' (APG radio group: every arrow key moves). */
	orientation?: MaybeGetter<Orientation>;
	disabled?: MaybeGetter<boolean>;
	required?: MaybeGetter<boolean>;
	/** Gives `formInput` a name so the value posts with a <form>. */
	name?: MaybeGetter<string>;
};

/**
 * RadioGroup per APG: arrow keys move AND check, wrapping; Space checks the focused radio;
 * Tab enters on the checked radio (or the first one when none is checked, without checking
 * it). Put the items on non-button elements (`<div {...group.item(…)}>`), so Enter does
 * nothing, as with native radios.
 */
export class RadioGroup {
	readonly #id: string;
	readonly #options: RadioGroupOptions;
	readonly #value: Value<string | null>;
	readonly #nav: ListNav;
	readonly #rootKey = createAttachmentKey();
	readonly #inputKey = createAttachmentKey();
	readonly #attachRoot: Attachment<HTMLElement>;

	constructor(options: RadioGroupOptions) {
		this.#id = options.id;
		this.#options = options;
		this.#value = new Value(options, null);
		this.#nav = new ListNav({
			id: subId(options.id, 'radios'),
			focus: 'roving',
			orientation: () => read(options.orientation ?? 'both'),
			loop: true,
			typeahead: false,
			tabStop: () => this.value,
			onActivate: (value, event) => {
				if (event instanceof KeyboardEvent && event.key !== ' ') return;
				this.#select(value);
			}
		});
		this.#attachRoot = (el) =>
			untrack(() => cleanups(keyMoves(el, this.#nav, (value) => this.#select(value)), resetOnLeave(el, this.#nav)));
	}

	/** Checked value, or null. Setting it reports through `onValueChange`. */
	get value(): string | null {
		return this.#value.current;
	}
	set value(next: string | null) {
		this.#value.write(next);
	}

	get #disabled(): boolean {
		return read(this.#options.disabled ?? false);
	}

	/** role="radiogroup", aria-required, aria-disabled; the nav root. */
	get root(): Part {
		return {
			...this.#nav.root,
			role: 'radiogroup',
			'aria-required': read(this.#options.required ?? false) || undefined,
			'aria-disabled': this.#disabled || undefined,
			[this.#rootKey]: this.#attachRoot
		} as Part;
	}

	/** role="radio", id, aria-checked, roving tabindex, data-state="checked|unchecked". */
	item(options: { value: string; disabled?: boolean }): Part {
		const checked = this.value === options.value;
		return {
			...this.#nav.item({ value: options.value, disabled: options.disabled || this.#disabled }),
			id: subId(this.#id, 'radio', options.value),
			role: 'radio',
			'aria-checked': checked,
			'data-state': checked ? 'checked' : 'unchecked'
		} as Part;
	}

	/** `<input type="hidden">` attributes carrying `name` and the value; null without `name`. */
	get formInput(): Part<HTMLInputElement> | null {
		if (this.#options.name === undefined) return null;
		return part(this.#inputKey, () => {}, {
			type: 'hidden',
			name: read(this.#options.name),
			value: this.value ?? ''
		} as Part<HTMLInputElement>);
	}

	#select(value: string): void {
		if (!this.#disabled) this.#value.write(value);
	}
}

// ------------------------------------------------------------------------- ToggleGroup

type ToggleValue<Multiple extends boolean> = Multiple extends true ? string[] : string | null;

export type ToggleGroupOptions<Multiple extends boolean = false> = ValueState<ToggleValue<Multiple>> & {
	/** From the component's `$props.id()`. */
	id: string;
	multiple?: Multiple;
	/** Default 'horizontal'. */
	orientation?: MaybeGetter<'horizontal' | 'vertical'>;
	/** Arrow keys wrap. Default true. */
	loop?: MaybeGetter<boolean>;
	/** 'toolbar' also writes aria-orientation. Default 'group'. */
	role?: 'group' | 'toolbar';
};

/**
 * ToggleGroup: buttons with `aria-pressed`, one tab stop, arrow keys move focus without
 * pressing. Single mode allows none pressed (pressing the pressed button releases it).
 */
export class ToggleGroup<Multiple extends boolean = false> {
	readonly #id: string;
	readonly #options: ToggleGroupOptions<Multiple>;
	readonly #value: Value<ToggleValue<Multiple>>;
	readonly #nav: ListNav;

	constructor(options: ToggleGroupOptions<Multiple>) {
		this.#id = options.id;
		this.#options = options;
		this.#value = new Value<ToggleValue<Multiple>>(
			options as ValueState<ToggleValue<Multiple>>,
			(options.multiple ? [] : null) as ToggleValue<Multiple>
		);
		this.#nav = new ListNav({
			id: subId(options.id, 'toggles'),
			focus: 'roving',
			orientation: () => this.#orientation,
			loop: () => read(options.loop ?? true),
			typeahead: false,
			tabStop: () => this.#list[0] ?? null,
			onActivate: (value) => this.toggle(value)
		});
	}

	get #orientation(): 'horizontal' | 'vertical' {
		return read(this.#options.orientation ?? 'horizontal');
	}

	/** Pressed value (single) or values (multiple). */
	get value(): ToggleValue<Multiple> {
		return this.#value.current;
	}

	isPressed(value: string): boolean {
		return this.#list.includes(value);
	}

	toggle(value: string): void {
		const next = toggleValue(this.#list, value, { multiple: this.#options.multiple === true, collapsible: true });
		const out = (this.#options.multiple ? [...next] : (next[0] ?? null)) as ToggleValue<Multiple>;
		this.#value.write(out, (a, b) => (Array.isArray(a) && Array.isArray(b) ? sameList(a, b) : Object.is(a, b)));
	}

	/** role="group" (or "toolbar" with aria-orientation); the nav root. */
	get root(): Part {
		const role = this.#options.role ?? 'group';
		return {
			...this.#nav.root,
			role,
			'aria-orientation': role === 'toolbar' ? this.#orientation : undefined
		} as Part;
	}

	/** `<button>` with aria-pressed, data-state="on|off", roving tabindex. */
	item(options: { value: string; disabled?: boolean }): Part<HTMLButtonElement> {
		const pressed = this.isPressed(options.value);
		return {
			...this.#nav.item(options),
			id: subId(this.#id, 'toggle', options.value),
			type: 'button',
			'aria-pressed': pressed,
			'data-state': pressed ? 'on' : 'off'
		} as Part<HTMLButtonElement>;
	}

	get #list(): readonly string[] {
		const value = this.value as string[] | string | null;
		return Array.isArray(value) ? value : value === null ? [] : [value];
	}
}
