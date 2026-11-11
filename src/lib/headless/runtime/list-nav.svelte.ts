/**
 * ListNav: keyboard navigation over a set of items, with roving tabindex OR
 * aria-activedescendant, Home/End, PageUp/PageDown, optional grid, disabled skipping and
 * typeahead. PUBLIC (for custom composites: toolbars, grids, custom listboxes) and
 * composed by the menu, listbox and group patterns.
 *
 * Data structure: there is no item registry to keep in order. The DOM is the order.
 * Each item element carries `data-ak-nav="<nav id>"`; at key time the nav runs one
 * `root.querySelectorAll('[data-ak-nav="<id>"]')`, which is DOM order, already filtered
 * by whatever the caller's {#each}/{#if} rendered, and excludes nested navs (their items
 * carry their own nav id). Per-item options live in a value-keyed map refreshed on every
 * render; the element → value link lives in a WeakMap written by the item attachment.
 * Highlight is stored as the item VALUE, never an index, so it survives filtering.
 *
 * ListNav is the single owner of the highlight and revalidates it: while the root is
 * attached, a MutationObserver (childList, subtree, aria-disabled) checks that the
 * highlighted value still matches a rendered, navigable item. If not, the highlight moves
 * to the first one when `autoHighlight` is on, otherwise clears, so no stale
 * `aria-activedescendant` survives a filter.
 *
 * Single styling hook in both modes: the highlighted item gets `data-highlighted`.
 */
import { untrack } from 'svelte';
import { createAttachmentKey, type Attachment } from 'svelte/attachments';
import { intentForKey, nextIndex, type Orientation } from '../logic/roving';
import { isBuffering, isTypeaheadKey, typeahead, TYPEAHEAD_IDLE, type TypeaheadState } from '../logic/typeahead';
import { activatesNatively } from './focus';
import { cleanups, listen, part, read, subId, type MaybeGetter, type Part } from './parts';

export interface ListNavOptions {
	/** From the component's `$props.id()`. */
	id: string;
	/**
	 * Structural, fixed at construction:
	 * - 'roving': items receive real focus; exactly one item has tabindex=0 (menus,
	 *   tabs, radio groups, toolbars)
	 * - 'active-descendant': focus stays on the `owner` part (combobox input, select
	 *   button); items are pointed at via aria-activedescendant and scrolled into view
	 */
	focus: 'roving' | 'active-descendant';
	orientation?: MaybeGetter<Orientation>; // default 'vertical'
	loop?: MaybeGetter<boolean>; // default true
	/** >1 turns on grid navigation (ArrowUp/Down move by a row). */
	columns?: MaybeGetter<number>;
	typeahead?: MaybeGetter<boolean>; // default true for 'roving', false for 'active-descendant'
	/** Pointer movement over an item highlights (and in roving mode focuses) it. */
	highlightOnHover?: boolean; // default false
	/** Disabled items stay reachable but cannot activate (APG menu option). Default false. */
	disabledFocusable?: MaybeGetter<boolean>;
	/**
	 * Which item owns the tab stop when nothing is highlighted yet (roving mode), e.g. the
	 * selected tab or the checked radio. Falls back to the first enabled item.
	 */
	tabStop?: () => string | null;
	/**
	 * When the item set changes and the highlighted value is gone or null, highlight the
	 * first enabled item. Combobox filtering uses this so Enter always has a target.
	 * Default false.
	 */
	autoHighlight?: MaybeGetter<boolean>;
	/** Enter / Space / click on an enabled item. */
	onActivate?: (value: string, event: KeyboardEvent | MouseEvent) => void;
	/** Highlight moved (by key, typeahead, hover or code). */
	onHighlight?: (value: string | null) => void;
}

export interface ItemOptions {
	/** Unique within this nav. Also encoded into the item's id. */
	value: string;
	disabled?: boolean;
	/** Typeahead text; defaults to the element's textContent at key time. */
	textValue?: string;
}

export class ListNav {
	#highlighted: string | null = $state(null);
	/** First navigable item, measured on the client; the roving tab stop of last resort. */
	#firstItem: string | null = $state(null);

	readonly #id: string;
	readonly #options: ListNavOptions;
	readonly #rootKey = createAttachmentKey();
	readonly #ownerKey = createAttachmentKey();
	#rootEl: HTMLElement | null = null;
	/** One stable attachment per item value (so re-spreading never re-attaches). */
	readonly #itemAttach = new Map<string, { key: symbol; attach: Attachment<HTMLElement> }>();
	readonly #latest = new Map<string, ItemOptions>();
	readonly #values = new WeakMap<Element, string>();
	#typeahead: TypeaheadState = TYPEAHEAD_IDLE;

	constructor(options: ListNavOptions) {
		this.#id = options.id;
		this.#options = options;
	}

	/**
	 * Highlighted item value. Setting it moves DOM focus in roving mode only if focus is
	 * already inside the list.
	 */
	get highlighted(): string | null {
		return this.#highlighted;
	}
	set highlighted(value: string | null) {
		const inside = typeof document !== 'undefined' && !!this.#rootEl?.contains(document.activeElement);
		this.highlight(value, { focus: inside });
	}

	get #roving(): boolean {
		return this.#options.focus === 'roving';
	}

	/**
	 * The container. Its attachment adds the listeners (roving mode: keydown + focusin,
	 * which syncs the highlight when the person clicks or tabs onto an item) and the
	 * revalidating MutationObserver.
	 */
	get root(): Part {
		return part(this.#rootKey, this.#attachRoot, { 'data-ak-nav-root': this.#id });
	}

	/**
	 * Active-descendant mode only: the element that keeps focus. Gives
	 * `aria-activedescendant` and the keydown handler. Throws in roving mode (structural
	 * misuse, caught on first render).
	 */
	get owner(): Part {
		if (this.#roving) throw new Error('ListNav.owner exists only with focus: "active-descendant"');
		const value = this.#highlighted;
		return part(this.#ownerKey, this.#attachOwner, {
			'aria-activedescendant': value === null ? undefined : subId(this.#id, 'item', value)
		});
	}

	/**
	 * One item. Attributes: id, data-ak-nav, data-highlighted, data-disabled +
	 * aria-disabled, tabindex (roving: 0 for the tab stop, -1 otherwise; active-descendant:
	 * -1). Listeners added by the attachment: click → activate, pointermove → highlight
	 * (when highlightOnHover), and in active-descendant mode mousedown → preventDefault so
	 * clicking an option does not steal focus from the owner.
	 */
	item(options: ItemOptions): Part {
		const { value } = options;
		this.#latest.set(value, options);
		let cached = this.#itemAttach.get(value);
		if (!cached) {
			cached = { key: createAttachmentKey(), attach: this.#itemAttachment(value) };
			this.#itemAttach.set(value, cached);
		}
		const stop = this.#highlighted ?? this.#options.tabStop?.() ?? this.#firstItem;
		return part(cached.key, cached.attach, {
			id: subId(this.#id, 'item', value),
			'data-ak-nav': this.#id,
			'data-highlighted': this.#highlighted === value ? '' : undefined,
			'data-disabled': options.disabled ? '' : undefined,
			'aria-disabled': options.disabled ? 'true' : undefined,
			tabindex: this.#roving && stop === value ? 0 : -1
		});
	}

	/**
	 * Handle a key for this list. Returns true (and preventDefaults) when the key was
	 * consumed. Patterns may call this from their own keydown to claim keys first.
	 */
	handleKey(event: KeyboardEvent): boolean {
		if (event.defaultPrevented || event.isComposing) return false;
		const items = this.#items();
		if (items.length === 0) return false;
		const values = items.map((el) => this.#values.get(el) ?? '');
		const blocked = values.map((value) => !this.#navigable(value));
		const current = this.#highlighted === null ? -1 : values.indexOf(this.#highlighted);
		const modified = event.ctrlKey || event.metaKey || event.altKey;

		const rtl = this.#rootEl ? getComputedStyle(this.#rootEl).direction === 'rtl' : false;
		const columns = read(this.#options.columns ?? 1);
		const intent = modified
			? null
			: intentForKey(event.key, read(this.#options.orientation ?? 'vertical'), rtl ? 'rtl' : 'ltr', columns > 1);
		if (intent) {
			event.preventDefault();
			const index = nextIndex(
				{ count: items.length, current, disabled: blocked, loop: read(this.#options.loop ?? true), columns },
				intent
			);
			if (index >= 0) this.highlight(values[index], { focus: true });
			return true;
		}

		const now = event.timeStamp;
		if (event.key === 'Enter' || (event.key === ' ' && !isBuffering(this.#typeahead, now))) {
			if (current < 0) return false;
			const value = values[current];
			if (this.#latest.get(value)?.disabled) {
				event.preventDefault();
				return true;
			}
			// A focused <button>/<a> fires its own click for Enter/Space; let it, so the
			// click listener activates once and consumer onclick handlers still run.
			if (this.#roving && activatesNatively(items[current])) return false;
			event.preventDefault();
			this.#options.onActivate?.(value, event);
			return true;
		}

		if (read(this.#options.typeahead ?? this.#roving) && !modified && isTypeaheadKey(event.key, false, false, false)) {
			const labels = items.map((el, i) =>
				(this.#latest.get(values[i])?.textValue ?? el.textContent ?? '').trim().toLowerCase()
			);
			const result = typeahead(this.#typeahead, { labels, disabled: blocked, current, char: event.key, now });
			this.#typeahead = result.state;
			if (event.key === ' ' && result.state.buffer !== '') event.preventDefault();
			if (result.index < 0) return false;
			event.preventDefault();
			this.highlight(values[result.index], { focus: true });
			return true;
		}
		return false;
	}

	/**
	 * Move the highlight. `'first'`/`'last'` resolve against navigable items in DOM order.
	 * Roving: optionally focuses the item. Active-descendant: scrolls it into view with
	 * block 'nearest'. Idempotent.
	 */
	highlight(to: 'first' | 'last' | string | null, options: { focus?: boolean } = {}): void {
		let value = to;
		if (to === 'first' || to === 'last') {
			const navigable = this.#items()
				.map((el) => this.#values.get(el) ?? '')
				.filter((v) => this.#navigable(v));
			value = (to === 'first' ? navigable[0] : navigable[navigable.length - 1]) ?? null;
		}
		if (value !== this.#highlighted) {
			this.#highlighted = value;
			this.#options.onHighlight?.(value);
		}
		const el = value === null ? null : (this.#items().find((item) => this.#values.get(item) === value) ?? null);
		if (!el) return;
		if (this.#roving) {
			if (options.focus) el.focus();
		} else {
			el.scrollIntoView({ block: 'nearest' });
		}
	}

	/** Items in DOM order (a fresh query; cheap, only run on input and mutations). */
	#items(): HTMLElement[] {
		if (!this.#rootEl) return [];
		const selector = `[data-ak-nav="${CSS.escape(this.#id)}"]`;
		return [...this.#rootEl.querySelectorAll<HTMLElement>(selector)].filter((el) => this.#values.has(el));
	}

	#navigable(value: string): boolean {
		return read(this.#options.disabledFocusable ?? false) || !this.#latest.get(value)?.disabled;
	}

	#revalidate = () => {
		const navigable = this.#items()
			.map((el) => this.#values.get(el) ?? '')
			.filter((v) => this.#navigable(v));
		this.#firstItem = navigable[0] ?? null;
		const current = this.#highlighted;
		const auto = read(this.#options.autoHighlight ?? false);
		if (current !== null && !navigable.includes(current)) {
			this.highlight(auto ? (navigable[0] ?? null) : null);
		} else if (current === null && auto && navigable.length > 0) {
			this.highlight(navigable[0]);
		}
	};

	#attachRoot: Attachment<HTMLElement> = (el) =>
		untrack(() => {
			this.#rootEl = el;
			const observer = new MutationObserver(this.#revalidate);
			observer.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-disabled'] });
			// Items attach after their container; check once they are in.
			queueMicrotask(this.#revalidate);
			const offs = this.#roving
				? [
						listen(el, 'keydown', (event) => {
							const owner = event.target instanceof Element ? event.target.closest('[data-ak-nav-root]') : null;
							if (owner === el) this.handleKey(event);
						}),
						listen(el, 'focusin', (event) => {
							const value = event.target instanceof Element ? this.#values.get(event.target) : undefined;
							if (value !== undefined && value !== this.#highlighted) {
								this.#highlighted = value;
								this.#options.onHighlight?.(value);
							}
						})
					]
				: [];
			return cleanups(...offs, () => {
				observer.disconnect();
				if (this.#rootEl === el) this.#rootEl = null;
			});
		});

	#attachOwner: Attachment<HTMLElement> = (el) => untrack(() => listen(el, 'keydown', (event) => this.handleKey(event)));

	#itemAttachment(value: string): Attachment<HTMLElement> {
		return (el) =>
			untrack(() => {
				this.#values.set(el, value);
				const offs = [
					listen(el, 'click', (event) => {
						if (this.#latest.get(value)?.disabled) return;
						if (this.#highlighted !== value) {
							this.#highlighted = value;
							this.#options.onHighlight?.(value);
						}
						this.#options.onActivate?.(value, event);
					})
				];
				if (this.#options.highlightOnHover) {
					offs.push(
						listen(el, 'pointermove', (event) => {
							if (event.pointerType === 'touch' || this.#highlighted === value || !this.#navigable(value)) return;
							this.highlight(value, { focus: this.#roving });
						})
					);
				}
				if (!this.#roving) offs.push(listen(el, 'mousedown', (event) => event.preventDefault()));
				return cleanups(...offs);
			});
	}
}
