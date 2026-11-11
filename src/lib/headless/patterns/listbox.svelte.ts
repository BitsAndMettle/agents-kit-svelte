/**
 * Option-list patterns: Select, Combobox, Listbox. Three small public classes over ONE
 * internal ListboxCore, so each class has exactly the parts its markup needs (no mode
 * flag that makes half the getters throw).
 *
 * In every mode focus stays on ONE control and options are reached through
 * aria-activedescendant (APG select-only combobox, editable combobox, listbox), so the
 * composed ListNav is always 'active-descendant'. Filtering is the caller's {#each}: the
 * nav reads the DOM, and its MutationObserver keeps the highlight on a rendered option.
 *
 *   Select     <button role="combobox"> + popup list, typeahead
 *   Combobox   <input role="combobox" aria-autocomplete="list"> + popup list, or
 *              `inline: true` for an always-visible list (CommandPalette in a Dialog)
 *   Listbox    standalone list that holds focus itself (tabindex=0)
 *
 * Shared parts:
 *   label         the id every aria-labelledby points at, written from the first (server)
 *                 render, so render it (Combobox: a <label for> the input) or pass
 *                 `labelledBy` (another id, or false and an aria-label of your own)
 *   formInputs    with `name`: hidden inputs, one per selected value
 *   list          role="listbox", aria-multiselectable, aria-labelledby; in popup modes
 *                 also popover="manual" + the internal Layer (anchored, matchWidth)
 *   option(o)     role="option", aria-selected, value-encoded id, data-highlighted,
 *                 data-selected, data-disabled
 *   group(name)   { root: role="group" aria-labelledby, label }
 */
import { untrack } from 'svelte';
import { createAttachmentKey, type Attachment } from 'svelte/attachments';
import type { Placement } from '../logic/placement';
import { addValues, rangeValues, sameValues, toggleAll, toggleValue } from '../logic/selection';
import { Layer } from '../runtime/layers.svelte';
import { ListNav } from '../runtime/list-nav.svelte';
import {
	cleanups,
	listen,
	part,
	read,
	subId,
	type ChangeReason,
	type MaybeGetter,
	type OpenState,
	type Part,
	type ValueState
} from '../runtime/parts';

type Selected<Multiple extends boolean> = Multiple extends true ? string[] : string | null;
type AnySelected = string[] | string | null;

interface CommonOptions<Multiple extends boolean> {
	/** From the component's `$props.id()`. */
	id: string;
	multiple?: Multiple;
	/** Arrow keys wrap from the last option to the first. Default false (APG listbox). */
	loop?: MaybeGetter<boolean>;
	/**
	 * How the control is named. Default: the `label` part's id, written from the server on
	 * so the name exists before hydration; render the `label` part. A string names another
	 * element's id; `false` writes no aria-labelledby (put an `aria-label` on the element).
	 */
	labelledBy?: string | false;
	/**
	 * Form field name. With it, `formInputs` gives one hidden input per selected value, and
	 * resetting the owning form restores the value the pattern started with.
	 */
	name?: string;
}

interface PopupOptions {
	/** Merged over { side: 'bottom', align: 'start', matchWidth: true }. */
	placement?: MaybeGetter<Placement>;
	/** Close after a choice. Default true in single mode, false with `multiple`. */
	closeOnSelect?: MaybeGetter<boolean>;
}

export interface OptionOptions {
	/** Unique within the list; also encoded into the option's id. */
	value: string;
	disabled?: boolean;
	/** Typeahead text; defaults to the option's textContent. */
	textValue?: string;
}

export interface OptionGroup {
	readonly root: Part;
	readonly label: Part;
}

/** One hidden form field: spread it on an `<input>`; key an {#each} by its `value`. */
export type FormInput = Part<HTMLInputElement> & { type: 'hidden'; name: string; value: string };

const LIST_PLACEMENT: Placement = { side: 'bottom', align: 'start', matchWidth: true };

// ---------------------------------------------------------------------------------- Select

export type SelectOptions<Multiple extends boolean = false> = CommonOptions<Multiple> &
	PopupOptions &
	ValueState<Selected<Multiple>> &
	OpenState;

/**
 * Select-only combobox: a button that shows the value and opens a list. Focus stays on
 * the button; the list is reached through aria-activedescendant.
 */
export class Select<Multiple extends boolean = false> {
	readonly #core: ListboxCore;

	constructor(options: SelectOptions<Multiple>) {
		this.#core = new ListboxCore({
			id: options.id,
			labelledBy: options.labelledBy,
			name: options.name,
			owner: 'button',
			multiple: options.multiple ?? false,
			loop: options.loop,
			typeahead: true,
			autoHighlight: false,
			value: options as ValueState<AnySelected>,
			popup: { open: options, placement: options.placement, closeOnSelect: options.closeOnSelect }
		});
	}

	/** Selected value (`string[]` with `multiple`). Setting it notifies `onValueChange`. */
	get value(): Selected<Multiple> {
		return this.#core.value as Selected<Multiple>;
	}
	set value(value: Selected<Multiple>) {
		this.#core.value = value;
	}
	/** Desired open state. Setting it is idempotent and reports reason 'api'. */
	get open(): boolean {
		return this.#core.open;
	}
	set open(value: boolean) {
		this.#core.writeOpen(value, 'api');
	}
	/** Highlighted option value (what aria-activedescendant points at while open). */
	get highlighted(): string | null {
		return this.#core.nav.highlighted;
	}
	/**
	 * <button role="combobox" aria-haspopup="listbox">. Closed: click, ArrowDown, Enter and
	 * Space open on the selected option (else the first), ArrowUp opens on it (else the
	 * last), Home/End open on the first/last; typing selects the next match without
	 * opening (single) or opens on it (multiple). Open: arrows, Home/End, PageUp/PageDown,
	 * typeahead; Enter/Space choose; Alt+ArrowUp chooses and closes (with `multiple` it
	 * only closes); Escape closes; Tab
	 * closes and moves on.
	 */
	get trigger(): Part<HTMLButtonElement> {
		return this.#core.trigger;
	}
	get label(): Part {
		return this.#core.label;
	}
	get list(): Part {
		return this.#core.list;
	}
	/**
	 * With `name`: one hidden input per selected value (none while nothing is selected).
	 * Render them inside the form: `{#each x.formInputs as input (input.value)}<input {...input} />{/each}`.
	 */
	get formInputs(): FormInput[] {
		return this.#core.formInputs;
	}
	option(options: OptionOptions): Part {
		return this.#core.option(options);
	}
	group(name: string): OptionGroup {
		return this.#core.group(name);
	}
}

// -------------------------------------------------------------------------------- Combobox

export type ComboboxOptions<Multiple extends boolean = false> = CommonOptions<Multiple> &
	ValueState<Selected<Multiple>> &
	(
		| (PopupOptions & OpenState & { inline?: false; openOnFocus?: MaybeGetter<boolean> })
		| { inline: true; open?: never; defaultOpen?: never; onOpenChange?: never }
	) & {
		/** Highlight the first option whenever the text changes the filtered set. Default true. */
		autoHighlight?: MaybeGetter<boolean>;
		/**
		 * Enter / click on an option. Default: select it (and close in single popup mode).
		 * A CommandPalette passes this to RUN the option instead of storing a value.
		 */
		onActivate?: (value: string, event: KeyboardEvent | MouseEvent) => void;
	};

/**
 * Editable combobox with list autocomplete. Use with `bind:value` on the input for the
 * query; the caller filters its own {#each}.
 */
export class Combobox<Multiple extends boolean = false> {
	readonly #core: ListboxCore;

	constructor(options: ComboboxOptions<Multiple>) {
		this.#core = new ListboxCore({
			id: options.id,
			labelledBy: options.labelledBy,
			name: options.name,
			owner: 'input',
			multiple: options.multiple ?? false,
			loop: options.loop,
			typeahead: false,
			autoHighlight: options.autoHighlight ?? true,
			value: options as ValueState<AnySelected>,
			onActivate: options.onActivate,
			openOnFocus: options.inline ? undefined : options.openOnFocus,
			popup: options.inline
				? null
				: { open: options, placement: options.placement, closeOnSelect: options.closeOnSelect }
		});
	}

	get value(): Selected<Multiple> {
		return this.#core.value as Selected<Multiple>;
	}
	set value(value: Selected<Multiple>) {
		this.#core.value = value;
	}
	/** Always true when inline. */
	get open(): boolean {
		return this.#core.open;
	}
	set open(value: boolean) {
		this.#core.writeOpen(value, 'api');
	}
	get highlighted(): string | null {
		return this.#core.nav.highlighted;
	}
	/**
	 * <input role="combobox" aria-autocomplete="list" autocomplete="off">. Focus never
	 * leaves it. Typing opens (popup mode) and highlights the first match. ArrowDown/Up
	 * open or move; Alt+ArrowDown opens without moving; Alt+ArrowUp closes; Enter
	 * activates the highlighted option; Escape closes when open, else clears the text
	 * (and a single selection) and is consumed, so a Dialog around it stays open; with no
	 * text left Escape passes through. Home/End and ArrowLeft/Right stay caret keys.
	 */
	get input(): Part<HTMLInputElement> {
		return this.#core.input;
	}
	/** A <label> for the input. */
	get label(): Part<HTMLLabelElement> {
		return this.#core.inputLabel;
	}
	get list(): Part {
		return this.#core.list;
	}
	/**
	 * With `name`: one hidden input per selected value (none while nothing is selected).
	 * Render them inside the form: `{#each x.formInputs as input (input.value)}<input {...input} />{/each}`.
	 */
	get formInputs(): FormInput[] {
		return this.#core.formInputs;
	}
	option(options: OptionOptions): Part {
		return this.#core.option(options);
	}
	group(name: string): OptionGroup {
		return this.#core.group(name);
	}
}

// --------------------------------------------------------------------------------- Listbox

export type ListboxOptions<Multiple extends boolean = false> = CommonOptions<Multiple> &
	ValueState<Selected<Multiple>> & {
		/** Default true. */
		typeahead?: MaybeGetter<boolean>;
	};

/**
 * Standalone, always-visible listbox. The list itself holds focus (tabindex=0,
 * aria-activedescendant). Arrows move the highlight; Enter/Space/click select (single)
 * or toggle (multiple). Multiple also has the APG modifier keys: Shift+ArrowDown/Up move
 * and toggle, Shift+Space selects from the last chosen option to the highlighted one,
 * Ctrl+Shift+Home/End select to the first/last, Ctrl/Cmd+A selects or clears all,
 * Shift+click selects a range.
 */
export class Listbox<Multiple extends boolean = false> {
	readonly #core: ListboxCore;

	constructor(options: ListboxOptions<Multiple>) {
		this.#core = new ListboxCore({
			id: options.id,
			labelledBy: options.labelledBy,
			name: options.name,
			owner: 'list',
			multiple: options.multiple ?? false,
			loop: options.loop,
			typeahead: options.typeahead ?? true,
			autoHighlight: false,
			value: options as ValueState<AnySelected>,
			popup: null
		});
	}

	get value(): Selected<Multiple> {
		return this.#core.value as Selected<Multiple>;
	}
	set value(value: Selected<Multiple>) {
		this.#core.value = value;
	}
	get highlighted(): string | null {
		return this.#core.nav.highlighted;
	}
	get label(): Part {
		return this.#core.label;
	}
	get list(): Part {
		return this.#core.list;
	}
	/**
	 * With `name`: one hidden input per selected value (none while nothing is selected).
	 * Render them inside the form: `{#each x.formInputs as input (input.value)}<input {...input} />{/each}`.
	 */
	get formInputs(): FormInput[] {
		return this.#core.formInputs;
	}
	option(options: OptionOptions): Part {
		return this.#core.option(options);
	}
	group(name: string): OptionGroup {
		return this.#core.group(name);
	}
}

// ----------------------------------------------------------------------- internal: the core

interface CoreConfig {
	id: string;
	labelledBy?: string | false;
	name?: string;
	/** Which element keeps focus and receives keys. */
	owner: 'button' | 'input' | 'list';
	multiple: boolean;
	loop?: MaybeGetter<boolean>;
	typeahead: MaybeGetter<boolean>;
	autoHighlight: MaybeGetter<boolean>;
	value: ValueState<AnySelected>;
	onActivate?: (value: string, event: KeyboardEvent | MouseEvent) => void;
	openOnFocus?: MaybeGetter<boolean>;
	/** null: always visible (Listbox, inline Combobox). */
	popup: { open: OpenState; placement?: MaybeGetter<Placement>; closeOnSelect?: MaybeGetter<boolean> } | null;
}

/**
 * @internal Owns the ListNav ('active-descendant'), the optional Layer (kind 'popover',
 * initialFocus 'none', dismissed by Escape and outside presses through the stack, and by
 * the owner's own blur), selection state, and the owner keydown tables. The public
 * classes are facades that pick the owner element and forward getters.
 */
class ListboxCore {
	readonly nav: ListNav;
	readonly layer: Layer | null;
	readonly #config: CoreConfig;
	readonly #id: string;
	#ownValue: string[] = $state([]);
	#ownOpen = $state(false);
	/** Last value chosen by the person: the far end of Shift ranges. */
	#rangeAnchor: string | null = null;
	#listEl: HTMLElement | null = null;
	/** Option element id → value, so DOM order can be read back as values. */
	readonly #byElementId = new Map<string, string>();
	readonly #latest = new Map<string, OptionOptions>();
	/** Set while the core itself dispatches `input` (clear, form reset), so it does not open. */
	#clearing = false;
	/** Enter/Space already handled on keydown: swallow the button's own click for it. */
	#keyActivated = false;
	/**
	 * A composition just ended in this task. Safari sends the Enter that commits an IME
	 * candidate AFTER compositionend, with isComposing false (keyCode 229).
	 */
	#composed = false;
	/** What a form reset restores: the value the pattern started with. */
	readonly #resetValue: string[];

	readonly #keys = {
		owner: createAttachmentKey(),
		list: createAttachmentKey()
	};
	readonly #attachOwner: Attachment<HTMLElement>;
	readonly #attachList: Attachment<HTMLElement>;

	constructor(config: CoreConfig) {
		this.#config = config;
		this.#id = config.id;
		const initial = config.value.value === undefined ? config.value.defaultValue : undefined;
		this.#ownValue = toArray(initial ?? null);
		const controlled = config.value.value;
		this.#resetValue = controlled ? untrack(() => toArray(controlled())) : [...this.#ownValue];
		this.#ownOpen = config.popup?.open.defaultOpen ?? false;

		this.nav = new ListNav({
			id: config.id,
			focus: 'active-descendant',
			loop: config.loop ?? false,
			typeahead: config.typeahead,
			autoHighlight: config.autoHighlight,
			highlightOnHover: config.owner !== 'list',
			onActivate: (value, event) => this.#activate(value, event)
		});

		const popup = config.popup;
		this.layer = popup
			? new Layer({
					id: config.id,
					kind: 'popover',
					// Focus never enters the list, so the owner's blur decides focus-out.
					dismiss: { escape: true, outside: true, focusOut: false },
					desired: () => this.open,
					notify: (open, reason) => this.writeOpen(open, reason),
					initialFocus: () => {
						// Shown now: bring the highlighted option into the list's view.
						this.nav.highlight(this.nav.highlighted, { scroll: true });
						return 'none';
					},
					placement: () => ({ ...LIST_PLACEMENT, ...(popup.placement === undefined ? {} : read(popup.placement)) })
				})
			: null;

		this.#attachOwner = (el) =>
			untrack(() => {
				const offs: (void | (() => void))[] = [
					listen(el, 'keydown', (event) => this.#onOwnerKey(event, el)),
					this.#listenFormReset(el)
				];
				if (this.layer) {
					offs.push(
						this.layer.attachTrigger(el),
						listen(el, 'focusout', (event) => {
							const to = event.relatedTarget instanceof Node ? event.relatedTarget : null;
							// No related target: the window lost focus; not a dismissal.
							if (!to || this.#listEl?.contains(to)) return;
							// Close after focus has landed. This close goes through desired state
							// (stack.close, reason 'api'), which restores focus when it is on <body>,
							// as it is during focusout; the stack's own no-pull-back focus-out path
							// only covers focus leaving the layer's content, which never has focus here.
							setTimeout(() => {
								const now = document.activeElement;
								if (now !== el && !this.#listEl?.contains(now)) this.writeOpen(false, 'focus-out');
							});
						})
					);
				}
				if (config.owner === 'button') {
					offs.push(
						listen(el, 'click', () => {
							if (this.#keyActivated) return;
							this.#openOrClose(!this.open, 'selected-or-first');
						}),
						listen(el, 'keyup', () => {
							setTimeout(() => (this.#keyActivated = false));
						}),
						listen(el, 'pointerdown', () => (this.#keyActivated = false))
					);
				}
				if (config.owner === 'input') {
					offs.push(
						listen(el, 'input', () => this.#onInput()),
						listen(el, 'compositionend', () => {
							this.#composed = true;
							setTimeout(() => (this.#composed = false));
						}),
						listen(el, 'focus', () => {
							if (read(config.openOnFocus ?? false)) this.writeOpen(true, 'trigger');
						})
					);
				}
				return cleanups(...offs);
			});

		this.#attachList = (el) =>
			untrack(() => {
				this.#listEl = el;
				const offs: (void | (() => void))[] = [this.layer?.attachContent(el)];
				if (config.owner === 'list') {
					offs.push(
						listen(el, 'keydown', (event) => this.#onOwnerKey(event, el)),
						this.#listenFormReset(el),
						listen(el, 'focus', () => this.#onListFocus()),
						// Option mousedown is prevented (no focus theft in popup modes); here the
						// list IS the focus owner, so take focus explicitly.
						listen(el, 'mousedown', () => {
							if (document.activeElement !== el) el.focus({ preventScroll: true });
						})
					);
				} else {
					// A press on the list's padding must not blur the input or button either.
					offs.push(listen(el, 'mousedown', (event) => event.preventDefault()));
				}
				if (config.owner === 'input') {
					// The rendered option set changed (the caller filtered, or reset its query in
					// code): with autoHighlight, the first match takes the highlight.
					const observer = new MutationObserver(() => {
						if (read(config.autoHighlight)) this.nav.highlight('first', { scroll: true });
					});
					observer.observe(el, { childList: true, subtree: true });
					offs.push(() => observer.disconnect());
				}
				return cleanups(...offs, () => {
					if (this.#listEl === el) this.#listEl = null;
				});
			});
	}

	/**
	 * With `name`: the owning form's reset restores the starting value. The `reset` event
	 * fires BEFORE the form resets its controls, so this waits a task: by then a Combobox
	 * input holds its reset text, which a silent `input` event hands to `bind:value`, and
	 * the value is re-notified even when unchanged so the caller rewrites that text.
	 */
	#listenFormReset(el: HTMLElement): (() => void) | undefined {
		if (this.#config.name === undefined) return undefined;
		const form = (el as HTMLInputElement | HTMLButtonElement).form ?? el.closest('form');
		if (!form) return undefined;
		return listen(form, 'reset', (event) => {
			setTimeout(() => {
				if (event.defaultPrevented) return;
				if (this.#config.owner === 'input') this.#silentInput(el as HTMLInputElement);
				this.#setSelected([...this.#resetValue], true);
			});
		});
	}

	// ------------------------------------------------------------------ state

	#selected(): string[] {
		const state = this.#config.value;
		return state.value ? toArray(state.value()) : this.#ownValue;
	}

	get value(): AnySelected {
		const selected = this.#selected();
		return this.#config.multiple ? selected : (selected[0] ?? null);
	}
	set value(value: AnySelected) {
		this.#setSelected(toArray(value));
	}

	/** `notify`: call onValueChange even when the value is unchanged (form reset). */
	#setSelected(next: string[], notify = false): void {
		if (!notify && sameValues(next, this.#selected())) return;
		const out = this.#config.multiple ? next : (next[0] ?? null);
		const state = this.#config.value;
		if (state.value) {
			state.onValueChange(out);
		} else {
			this.#ownValue = next;
			state.onValueChange?.(out);
		}
	}

	get open(): boolean {
		const popup = this.#config.popup;
		if (!popup) return true;
		return popup.open.open ? popup.open.open() : this.#ownOpen;
	}

	writeOpen(open: boolean, reason: ChangeReason): void {
		const popup = this.#config.popup;
		if (!popup || open === this.open) return;
		if (popup.open.open) {
			popup.open.onOpenChange(open, reason);
		} else {
			this.#ownOpen = open;
			popup.open.onOpenChange?.(open, reason);
		}
	}

	/** Open on a preferred option (or just close). */
	#openOrClose(open: boolean, on: 'selected-or-first' | 'selected-or-last' | 'first' | 'last' | 'keep'): void {
		if (open && on !== 'keep') {
			const selected = this.#firstSelectedRendered();
			if (on === 'first' || on === 'last') this.nav.highlight(on);
			else this.nav.highlight(selected ?? (on === 'selected-or-last' ? 'last' : 'first'));
		}
		this.writeOpen(open, 'trigger');
	}

	// ------------------------------------------------------------------ choosing

	/** ListNav activation: Enter / Space (Select, Listbox) / click on an option. */
	#activate(value: string, event: KeyboardEvent | MouseEvent): void {
		const { onActivate, multiple, popup } = this.#config;
		if (onActivate) onActivate(value, event);
		else this.#choose(value, event);
		if (popup && read(popup.closeOnSelect ?? !multiple)) this.writeOpen(false, 'select');
	}

	#choose(value: string, event: KeyboardEvent | MouseEvent): void {
		const { multiple, owner } = this.#config;
		if (multiple && owner === 'list' && event instanceof MouseEvent && event.shiftKey) {
			this.#setSelected(addValues(this.#selected(), rangeValues(this.#order(), this.#rangeAnchor, value)));
		} else {
			this.#setSelected([...toggleValue(this.#selected(), value, { multiple, collapsible: false })]);
		}
		this.#rangeAnchor = value;
	}

	// ------------------------------------------------------------------ keys

	#onOwnerKey(event: KeyboardEvent, el: HTMLElement): void {
		// keyCode 229: a key the IME is handling (Safari reports isComposing false for it).
		if (event.defaultPrevented || event.isComposing || event.keyCode === 229 || this.#composed) return;
		if (this.#config.owner === 'button') this.#buttonKey(event);
		else if (this.#config.owner === 'input') this.#inputKey(event, el as HTMLInputElement);
		else this.#listKey(event);
	}

	/** APG select-only combobox. */
	#buttonKey(event: KeyboardEvent): void {
		const { key, altKey } = event;
		const modified = event.ctrlKey || event.metaKey || altKey;
		if (key === 'Enter' || key === ' ') this.#keyActivated = true;

		if (!this.open) {
			const on =
				key === 'ArrowDown' || key === 'Enter' || key === ' '
					? 'selected-or-first'
					: key === 'ArrowUp'
						? 'selected-or-last'
						: key === 'Home'
							? 'first'
							: key === 'End'
								? 'last'
								: null;
			if (on && !(modified && !(altKey && key === 'ArrowDown'))) {
				event.preventDefault();
				this.#openOrClose(true, on);
				return;
			}
			if (modified || [...key].length !== 1) return;
			if (this.#config.multiple) {
				// No visible place for a highlight while closed: open on the match.
				this.#openOrClose(true, 'selected-or-first');
				this.nav.handleKey(event);
				return;
			}
			// Single: like a native <select>, typing changes the value without opening,
			// stepping from the selected option.
			this.nav.highlight(this.#firstSelectedRendered());
			const before = this.nav.highlighted;
			if (this.nav.handleKey(event) && this.nav.highlighted !== null && this.nav.highlighted !== before) {
				this.#setSelected([this.nav.highlighted]);
				this.#rangeAnchor = this.nav.highlighted;
			}
			return;
		}

		if (altKey && key === 'ArrowUp') {
			event.preventDefault();
			// Single: commit the highlighted option, then close (APG). Multiple: choosing
			// would toggle, possibly deselecting, so Alt+ArrowUp only closes.
			if (this.#config.multiple) return this.writeOpen(false, 'trigger');
			const value = this.nav.highlighted;
			if (value !== null && !this.#latest.get(value)?.disabled) this.#activate(value, event);
			this.writeOpen(false, 'select');
			return;
		}
		this.nav.handleKey(event);
	}

	/** APG editable combobox with list autocomplete. Home/End stay with the caret. */
	#inputKey(event: KeyboardEvent, input: HTMLInputElement): void {
		const { key, altKey } = event;
		const open = this.open;
		switch (key) {
			case 'ArrowDown':
				if (!open) {
					event.preventDefault();
					this.#openOrClose(true, altKey ? 'keep' : 'selected-or-first');
				} else if (!altKey) this.nav.handleKey(event);
				return;
			case 'ArrowUp':
				if (!open) {
					event.preventDefault();
					this.#openOrClose(true, 'selected-or-last');
				} else if (altKey && this.layer) {
					event.preventDefault();
					this.writeOpen(false, 'trigger');
				} else this.nav.handleKey(event);
				return;
			case 'PageDown':
			case 'PageUp':
				if (open) this.nav.handleKey(event);
				return;
			case 'Enter':
				if (open && this.nav.highlighted !== null) this.nav.handleKey(event);
				return;
			case 'Escape':
				// Open popup: the layer stack closes it (bubble phase, after this). Closed or
				// inline: clear the text, and consume the key only if there was text.
				if ((open && this.layer) || input.value === '') return;
				event.preventDefault();
				this.#clearInput(input);
				return;
		}
	}

	#listKey(event: KeyboardEvent): void {
		if (this.#config.multiple && this.#multiKey(event)) return;
		this.nav.handleKey(event);
	}

	/** APG multi-select listbox modifier keys. Returns true when consumed. */
	#multiKey(event: KeyboardEvent): boolean {
		const { key, shiftKey, altKey } = event;
		const mod = event.ctrlKey || event.metaKey;
		const highlighted = this.nav.highlighted;
		if (key === ' ' && shiftKey && !mod && !altKey) {
			event.preventDefault();
			if (highlighted !== null) {
				this.#setSelected(addValues(this.#selected(), rangeValues(this.#order(), this.#rangeAnchor, highlighted)));
				this.#rangeAnchor = highlighted;
			}
			return true;
		}
		if (mod && shiftKey && !altKey && (key === 'Home' || key === 'End')) {
			event.preventDefault();
			const order = this.#order();
			const edge = key === 'Home' ? order[0] : order[order.length - 1];
			if (edge === undefined) return true;
			const from = highlighted !== null && order.includes(highlighted) ? highlighted : edge;
			this.#setSelected(addValues(this.#selected(), rangeValues(order, from, edge)));
			this.nav.highlight(edge, { scroll: true });
			this.#rangeAnchor = edge;
			return true;
		}
		if (mod && !shiftKey && !altKey && key.toLowerCase() === 'a') {
			event.preventDefault();
			this.#setSelected(toggleAll(this.#selected(), this.#order()));
			return true;
		}
		if (shiftKey && !mod && !altKey && (key === 'ArrowDown' || key === 'ArrowUp')) {
			if (this.nav.handleKey(event)) {
				const now = this.nav.highlighted;
				if (now !== null && now !== highlighted) {
					this.#setSelected([...toggleValue(this.#selected(), now, { multiple: true, collapsible: false })]);
					this.#rangeAnchor = now;
				}
			}
			return true;
		}
		return false;
	}

	#onInput(): void {
		if (this.#clearing) return;
		this.writeOpen(true, 'trigger');
		// autoHighlight follows the option set (list observer); without it, typing clears it.
		if (!read(this.#config.autoHighlight)) this.nav.highlight(null);
	}

	#clearInput(input: HTMLInputElement): void {
		input.value = '';
		this.#silentInput(input);
		if (!this.#config.multiple) this.#setSelected([]);
	}

	/** Let `bind:value` see text the core (or a form reset) changed, without opening. */
	#silentInput(input: HTMLInputElement): void {
		this.#clearing = true;
		try {
			input.dispatchEvent(new Event('input', { bubbles: true }));
		} finally {
			this.#clearing = false;
		}
	}

	/** APG: focus lands on the first selected option, else the first option. */
	#onListFocus(): void {
		const current = this.nav.highlighted;
		if (current !== null && this.#order().includes(current)) return;
		this.nav.highlight(this.#firstSelectedRendered() ?? 'first', { scroll: true });
	}

	// ------------------------------------------------------------------ DOM reads

	/** Navigable (enabled) option values in DOM order. */
	#order(): string[] {
		if (!this.#listEl) return [];
		const selector = `[data-ak-nav="${CSS.escape(this.#id)}"]`;
		const out: string[] = [];
		for (const el of this.#listEl.querySelectorAll(selector)) {
			const value = this.#byElementId.get(el.id);
			if (value !== undefined && !this.#latest.get(value)?.disabled) out.push(value);
		}
		return out;
	}

	#firstSelectedRendered(): string | null {
		const selected = this.#selected();
		return this.#order().find((v) => selected.includes(v)) ?? null;
	}

	// ------------------------------------------------------------------ parts

	#activeDescendant(): string | undefined {
		const value = this.nav.highlighted;
		return value === null || !this.open ? undefined : subId(this.#id, 'item', value);
	}

	get #listId(): string {
		return subId(this.#id, 'list');
	}

	get #labelId(): string {
		return subId(this.#id, 'label');
	}

	/** Deterministic from the first render (SSR included), so the name never waits for hydration. */
	get #labelledBy(): string | undefined {
		const by = this.#config.labelledBy;
		return by === false ? undefined : (by ?? this.#labelId);
	}

	get trigger(): Part<HTMLButtonElement> {
		// No id: a trigger part never owns one (parts.ts "Ids").
		return part<HTMLButtonElement>(this.#keys.owner, this.#attachOwner, {
			type: 'button',
			role: 'combobox',
			'aria-haspopup': 'listbox',
			'aria-expanded': this.open,
			'aria-controls': this.#listId,
			'aria-labelledby': this.#labelledBy,
			'aria-activedescendant': this.#activeDescendant(),
			'data-state': this.layer?.state ?? 'open'
		});
	}

	get input(): Part<HTMLInputElement> {
		// The input is this pattern's own element and not a nav item, so it may own an id:
		// the label's `for` needs one.
		const attrs: Part<HTMLInputElement> & { autocomplete: 'off' } = {
			id: subId(this.#id, 'input'),
			role: 'combobox',
			autocomplete: 'off',
			'aria-autocomplete': 'list',
			// The default label names the input through `for`; only a custom one needs this.
			'aria-labelledby': typeof this.#config.labelledBy === 'string' ? this.#config.labelledBy : undefined,
			'aria-expanded': this.open,
			'aria-controls': this.#listId,
			'aria-activedescendant': this.#activeDescendant(),
			'data-state': this.layer?.state ?? 'open'
		};
		return part<HTMLInputElement>(this.#keys.owner, this.#attachOwner, attrs);
	}

	get label(): Part {
		return { id: this.#labelId };
	}

	get inputLabel(): Part<HTMLLabelElement> {
		const attrs: Part<HTMLLabelElement> & { for: string } = { id: this.#labelId, for: subId(this.#id, 'input') };
		return attrs;
	}

	get formInputs(): FormInput[] {
		const name = this.#config.name;
		if (name === undefined) return [];
		return this.#selected().map((value) => {
			const input: FormInput = {
				type: 'hidden',
				name,
				value
			};
			return input;
		});
	}

	get list(): Part {
		const layer = this.layer;
		const owns = this.#config.owner === 'list';
		const side = this.#config.popup?.placement === undefined ? undefined : read(this.#config.popup.placement).side;
		const own = part(this.#keys.list, this.#attachList, {
			id: this.#listId,
			role: 'listbox',
			'aria-multiselectable': this.#config.multiple ? 'true' : undefined,
			'aria-labelledby': this.#labelledBy,
			popover: layer ? 'manual' : undefined,
			tabindex: owns ? 0 : undefined,
			'aria-activedescendant': owns ? this.#activeDescendant() : undefined,
			'data-state': layer?.state ?? 'open',
			'data-side': layer ? (layer.side ?? side ?? 'bottom') : undefined
		});
		return { ...this.nav.root, ...own };
	}

	option(options: OptionOptions): Part {
		this.#latest.set(options.value, options);
		const item = this.nav.item(options);
		if (typeof item.id === 'string') this.#byElementId.set(item.id, options.value);
		const selected = this.#selected().includes(options.value);
		const attrs: Part = {
			role: 'option',
			'aria-selected': selected ? 'true' : 'false',
			'data-selected': selected ? '' : undefined
		};
		return Object.assign(item, attrs);
	}

	group(name: string): OptionGroup {
		const labelId = subId(this.#id, 'group', name);
		return {
			root: { role: 'group', 'aria-labelledby': labelId },
			label: { id: labelId, role: 'presentation' }
		};
	}
}

function toArray(value: AnySelected | undefined): string[] {
	if (value === null || value === undefined) return [];
	return Array.isArray(value) ? [...value] : [value];
}
