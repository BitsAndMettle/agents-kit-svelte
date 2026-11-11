/**
 * Menu: menu button, context menu and submenus, with plain, checkbox and radio items.
 * One internal Layer (kind 'popover', role 'menu') plus one ListNav ('roving', vertical,
 * loop, typeahead, highlight on hover). WAI-ARIA APG "Menu Button" and "Menu" patterns.
 *
 * Parts:
 *   trigger                 'click' mode: the menu button (aria-haspopup="menu",
 *                           aria-expanded, aria-controls). ArrowDown / Enter / Space open
 *                           and focus the first item, ArrowUp the last; a pointer click
 *                           opens and focuses the surface.
 *                           'contextmenu' mode: the region. Right-click opens at the
 *                           pointer; Shift+F10 / the ContextMenu key open at the focused
 *                           element and focus the first item.
 *                           Submenu: a menuitem of the PARENT menu (see `submenu()`).
 *   content                 popover="manual" role="menu", ListNav root, data-state/-side
 *   item(o)                 role="menuitem"; closes the whole chain on select by default
 *   checkbox(o)             role="menuitemcheckbox" aria-checked; stays open by default
 *   radioGroup(o).root      role="group"
 *   radioGroup(o).item(o)   role="menuitemradio" aria-checked; stays open by default
 *   group(name).root/label  role="group" aria-labelledby → label (while it is mounted)
 *   separator               role="separator"
 *
 * Nested behaviour falls out of the shared layer stack, not special cases:
 * - a submenu's content sits inside its parent's content, so trigger containment gives
 *   the stack the parent link (no context, no provider);
 * - Escape closes only the topmost layer and focus returns to its trigger through the
 *   generic focus-return rule; ArrowLeft (ArrowRight in RTL) in a submenu does the same;
 * - choosing a leaf closes the ROOT menu: the chain closes the submenus above it top-down
 *   and only the root restores focus (to the menu button), once;
 * - opening a sibling submenu closes the open one (single-chain invariant).
 *
 * Disabled items are skipped by keyboard, typeahead and hover unless `disabledFocusable`.
 */
import { untrack } from 'svelte';
import { createAttachmentKey, type Attachment } from 'svelte/attachments';
import { graceArea, pointInPolygon, type Placement, type Point, type Side } from '../logic/placement';
import { Layer } from '../runtime/layers.svelte';
import { ListNav } from '../runtime/list-nav.svelte';
import {
	cleanups,
	listen,
	part,
	read,
	subId,
	type ChangeReason,
	type Dismiss,
	type MaybeGetter,
	type OpenState,
	type Part
} from '../runtime/parts';

export type MenuOptions = OpenState & {
	/** From the component's `$props.id()`. */
	id: string;
	/** Structural. 'contextmenu' spreads `trigger` on a region and opens at the pointer. Default 'click'. */
	trigger?: 'click' | 'contextmenu';
	/** Default { side: 'bottom', align: 'start' }; context menus { side: 'bottom', align: 'start', offset: 2 } from the point. */
	placement?: MaybeGetter<Placement>;
	/** Arrow keys wrap at the ends. Default true. Submenus inherit it. */
	loop?: MaybeGetter<boolean>;
	/** Disabled items stay reachable by keyboard (but never activate). Default false. Submenus inherit it. */
	disabledFocusable?: MaybeGetter<boolean>;
	/** Default { escape: true, outside: true, focusOut: true }. Function forms veto. */
	dismiss?: MaybeGetter<Dismiss>;
	/** Accessible name for the content when there is no menu button ('contextmenu' mode). */
	label?: string;
};

/** Passed to `onSelect`. Call `preventDefault()` to keep the menu open. */
export type MenuSelectEvent = CustomEvent<{ value: string; originalEvent: Event }>;

export interface MenuItemOptions {
	/** Unique within this menu (not counting radio items, which are keyed per group). */
	value: string;
	disabled?: boolean;
	/** Typeahead text; defaults to the element's text. */
	textValue?: string;
	/** Click / Enter / Space. `event.preventDefault()` keeps the menu open. */
	onSelect?: (event: MenuSelectEvent) => void;
	/** Close the whole menu chain after selecting. Default true for plain items. */
	closeOnSelect?: boolean;
}

export interface MenuCheckboxOptions extends Omit<MenuItemOptions, 'closeOnSelect'> {
	checked: () => boolean | 'mixed';
	onCheckedChange: (checked: boolean) => void;
	/** Default false: toggling keeps the menu open. */
	closeOnSelect?: boolean;
}

export interface MenuRadioGroupOptions {
	/** Unique in this menu; caches the group object. */
	name: string;
	value: () => string | null;
	onValueChange: (value: string) => void;
	/** Accessible name of the group. */
	label?: string;
	/** Default false: choosing keeps the menu open. */
	closeOnSelect?: boolean;
}

export interface MenuRadioGroup {
	readonly root: Part;
	item(options: Omit<MenuItemOptions, 'onSelect' | 'closeOnSelect'>): Part;
}

export interface MenuSubmenuOptions {
	disabled?: boolean;
	textValue?: string;
	/** Default: right of the trigger item (left in RTL), top edges aligned. */
	placement?: MaybeGetter<Placement>;
	onOpenChange?: (open: boolean, reason: ChangeReason) => void;
}

type OpenFocus = 'first' | 'last' | 'content' | 'none';

type Entry =
	| { kind: 'item'; options: MenuItemOptions }
	| { kind: 'checkbox'; options: MenuCheckboxOptions }
	| { kind: 'radio'; name: string; value: string }
	| { kind: 'submenu'; menu: Menu };

/** Two parts on one element: attributes merge (later wins), each attachment key is kept. */
function extend(base: Part, more: Part): Part {
	return { ...base, ...more } as Part;
}

const MENU_PLACEMENT: Placement = { side: 'bottom', align: 'start' };
const CONTEXT_PLACEMENT: Placement = { side: 'bottom', align: 'start', offset: 2 };
const SUBMENU_OFFSET = 2;
/** Hover delay before a submenu opens. */
const HOVER_OPEN_MS = 100;
/** How long the pointer may travel inside the grace polygon toward an open submenu. */
const GRACE_MS = 300;

export class Menu {
	readonly #id: string;
	readonly #options: MenuOptions;
	readonly #layer: Layer;
	readonly #nav: ListNav;
	#own = $state(false);
	#labelled: Record<string, boolean> = $state({});

	/** Set by the parent's `submenu()`; null for a root menu. */
	#parent: Menu | null = null;
	#root: Menu = this;
	#subValue = '';
	#subOptions: MenuSubmenuOptions = {};

	readonly #children = new Map<string, Menu>();
	readonly #entries = new Map<string, Entry>();
	readonly #radioOptions = new Map<string, MenuRadioGroupOptions>();
	readonly #radioGroups = new Map<string, MenuRadioGroup>();
	readonly #groups = new Map<string, { readonly root: Part; readonly label: Part }>();

	#openFocus: OpenFocus = 'content';
	/** A keyboard-opened context menu: swallow the native contextmenu event that may follow. */
	#keyboardContext = false;
	#hoverTimer: ReturnType<typeof setTimeout> | undefined;
	#grace: { polygon: readonly Point[]; until: number } | null = null;

	readonly #keys = { trigger: createAttachmentKey(), content: createAttachmentKey() };
	readonly #attachTrigger: Attachment<HTMLElement>;
	readonly #attachContent: Attachment<HTMLElement>;

	constructor(options: MenuOptions) {
		this.#options = options;
		this.#id = options.id;
		this.#own = options.defaultOpen ?? false;
		this.#nav = new ListNav({
			id: options.id,
			focus: 'roving',
			orientation: 'vertical',
			loop: () => read(options.loop ?? true),
			disabledFocusable: () => read(options.disabledFocusable ?? false),
			typeahead: true,
			highlightOnHover: true,
			onActivate: (value, event) => this.#activate(value, event)
		});
		this.#layer = new Layer({
			id: options.id,
			kind: 'popover',
			dismiss: () => ({
				escape: true,
				outside: true,
				focusOut: true,
				...(options.dismiss === undefined ? {} : read(options.dismiss))
			}),
			desired: () => this.open,
			notify: (open, reason) => {
				if (!open) this.#reset();
				this.#write(open, reason);
			},
			initialFocus: () => {
				const how = this.#openFocus;
				this.#openFocus = 'content';
				if (how === 'content' || how === 'none') return how;
				return () => {
					this.#nav.highlight(how, { focus: true });
					const active = document.activeElement;
					return active instanceof HTMLElement && this.#layer.contentEl?.contains(active) ? active : null;
				};
			},
			placement: () => this.#placement()
		});
		this.#attachTrigger = (el) =>
			untrack(() => {
				if (this.#parent) return cleanups(this.#layer.attachTrigger(el), ...this.#subTriggerListeners(el));
				if (options.trigger === 'contextmenu') return cleanups(this.#layer.attachTrigger(el), ...this.#regionListeners(el));
				return cleanups(
					this.#layer.attachTrigger(el),
					listen(el, 'click', (event) => {
						if (this.open) return this.#write(false, 'trigger');
						// A keyboard-generated click (Enter / Space) has detail 0.
						this.#openWith(event.detail === 0 ? 'first' : 'content');
					}),
					listen(el, 'keydown', (event) => {
						if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
						event.preventDefault();
						this.#openWith(event.key === 'ArrowDown' ? 'first' : 'last');
					})
				);
			});
		this.#attachContent = (el) =>
			untrack(() =>
				cleanups(
					this.#layer.attachContent(el),
					// CAPTURE: ListNav's root keydown bubbles; submenu keys must be claimed first.
					listen(el, 'keydown', (event) => this.#onContentKeydown(el, event), { capture: true }),
					listen(el, 'pointermove', (event) => this.#onContentPointermove(el, event), { capture: true }),
					listen(el, 'contextmenu', (event) => event.preventDefault()),
					() => this.#reset()
				)
			);
	}

	/** Desired open state. Setting it is idempotent and reports reason 'api'. */
	get open(): boolean {
		return this.#options.open ? this.#options.open() : this.#own;
	}
	set open(value: boolean) {
		this.#write(value, 'api');
	}

	/** Shown state: 'open' only after showPopover ran, 'closed' as soon as closing starts. */
	get state(): 'open' | 'closed' {
		return this.#layer.state;
	}

	/** Measured side after flip; null until first shown. */
	get side(): Side | null {
		return this.#layer.side;
	}

	/** Highlighted item value (radio items: `name:value`). */
	get highlighted(): string | null {
		return this.#nav.highlighted;
	}

	/**
	 * The opener. Typed for any element: a `<button>` (menu button), a region (context
	 * menu) or, for a submenu, a `<div>` item of the parent menu.
	 */
	get trigger(): Part {
		if (this.#parent) return this.#subTrigger(this.#parent);
		if (this.#options.trigger === 'contextmenu') {
			return part(this.#keys.trigger, this.#attachTrigger, {
				id: subId(this.#id, 'trigger'),
				'data-state': this.#layer.state
			});
		}
		// `type` is valid on the <button> this part is meant for; Part<HTMLElement> lacks it.
		return part(this.#keys.trigger, this.#attachTrigger, {
			id: subId(this.#id, 'trigger'),
			type: 'button',
			'aria-haspopup': 'menu',
			'aria-expanded': this.open,
			'aria-controls': subId(this.#id, 'content'),
			'data-state': this.#layer.state
		} as Part);
	}

	get content(): Part {
		const parent = this.#parent;
		const labelledBy = parent
			? subId(parent.#id, 'item', this.#subValue)
			: this.#options.trigger === 'contextmenu'
				? undefined
				: subId(this.#id, 'trigger');
		return extend(
			this.#nav.root,
			part(this.#keys.content, this.#attachContent, {
				id: subId(this.#id, 'content'),
				popover: 'manual',
				role: 'menu',
				tabindex: -1,
				'aria-labelledby': labelledBy,
				'aria-label': labelledBy ? undefined : this.#options.label,
				'data-state': this.#layer.state,
				'data-side': this.#layer.side ?? (parent ? 'right' : (this.#staticPlacement()?.side ?? 'bottom'))
			})
		);
	}

	item(options: MenuItemOptions): Part {
		this.#entries.set(options.value, { kind: 'item', options });
		return extend(this.#nav.item(options), { role: 'menuitem' });
	}

	checkbox(options: MenuCheckboxOptions): Part {
		this.#entries.set(options.value, { kind: 'checkbox', options });
		const checked = options.checked();
		return extend(this.#nav.item(options), { role: 'menuitemcheckbox', 'aria-checked': checked });
	}

	/** Radio items are keyed `name:value` in this menu's navigation (`highlighted`, item ids). */
	radioGroup(options: MenuRadioGroupOptions): MenuRadioGroup {
		const name = options.name;
		this.#radioOptions.set(name, options);
		const cached = this.#radioGroups.get(name);
		if (cached) return cached;
		const groupOptions = () => this.#radioOptions.get(name) ?? options;
		const group: MenuRadioGroup = {
			get root(): Part {
				return { role: 'group', 'aria-label': groupOptions().label };
			},
			item: (item) => {
				const key = `${name}:${item.value}`;
				this.#entries.set(key, { kind: 'radio', name, value: item.value });
				return extend(this.#nav.item({ ...item, value: key }), {
					role: 'menuitemradio',
					'aria-checked': groupOptions().value() === item.value
				});
			}
		};
		this.#radioGroups.set(name, group);
		return group;
	}

	get separator(): Part {
		return { role: 'separator' };
	}

	/** `const g = menu.group('files')` → `<div {...g.root}><div {...g.label}>Files</div>…</div>` */
	group(name: string): { readonly root: Part; readonly label: Part } {
		let group = this.#groups.get(name);
		if (!group) {
			const labelId = subId(this.#id, 'group', name);
			const key = createAttachmentKey();
			const attach: Attachment<HTMLElement> = () => {
				this.#labelled[name] = true;
				return () => (this.#labelled[name] = false);
			};
			const labelled = () => this.#labelled[name] === true;
			group = {
				get root(): Part {
					return { role: 'group', 'aria-labelledby': labelled() ? labelId : undefined };
				},
				get label(): Part {
					return part(key, attach, { id: labelId });
				}
			};
			this.#groups.set(name, group);
		}
		return group;
	}

	/**
	 * Child menu whose trigger is an item of this menu. Cached by value, so calling it in a
	 * template on every render returns the same instance. Child id: `${id}-sub-${value}`.
	 * Its `trigger` is a menuitem with aria-haspopup="menu"; ArrowRight (ArrowLeft in RTL),
	 * Enter and Space open it and focus its first item; hovering opens it after 100ms; the
	 * pointer may cross sibling items inside the grace polygon toward it.
	 * Render its `content` INSIDE this menu's content.
	 */
	submenu(value: string, options: MenuSubmenuOptions = {}): Menu {
		let child = this.#children.get(value);
		if (!child) {
			const created: Menu = new Menu({
				id: subId(this.#id, 'sub', value),
				loop: this.#options.loop,
				disabledFocusable: this.#options.disabledFocusable,
				onOpenChange: (open, reason) => created.#subOptions.onOpenChange?.(open, reason)
			});
			created.#parent = this;
			created.#root = this.#root;
			created.#subValue = value;
			this.#children.set(value, created);
			child = created;
		}
		child.#subOptions = options;
		return child;
	}

	// ------------------------------------------------------------------ triggers

	#subTrigger(parent: Menu): Part {
		const options = this.#subOptions;
		parent.#entries.set(this.#subValue, { kind: 'submenu', menu: this });
		return extend(
			parent.#nav.item({ value: this.#subValue, disabled: options.disabled, textValue: options.textValue }),
			part(this.#keys.trigger, this.#attachTrigger, {
				role: 'menuitem',
				'aria-haspopup': 'menu',
				'aria-expanded': this.open,
				'aria-controls': subId(this.#id, 'content'),
				'data-state': this.#layer.state
			})
		);
	}

	/** Hover intent on a submenu trigger, and the grace polygon when the pointer leaves it. */
	#subTriggerListeners(el: HTMLElement): (() => void)[] {
		return [
			listen(el, 'pointermove', (event) => {
				if (event.pointerType === 'touch' || this.#subOptions.disabled || this.open || this.#hoverTimer) return;
				this.#hoverTimer = setTimeout(() => {
					this.#hoverTimer = undefined;
					if (!this.open) this.#openWith('none', 'hover');
				}, HOVER_OPEN_MS);
			}),
			listen(el, 'pointerleave', (event) => {
				this.#cancelHover();
				const parent = this.#parent;
				const content = this.#layer.contentEl;
				if (!parent || !content || this.#layer.phase !== 'open' || event.pointerType === 'touch') return;
				const r = content.getBoundingClientRect();
				parent.#grace = {
					polygon: graceArea(
						{ x: event.clientX, y: event.clientY },
						{ x: r.left, y: r.top, width: r.width, height: r.height },
						this.#layer.side ?? 'right'
					),
					until: event.timeStamp + GRACE_MS
				};
			}),
			() => this.#cancelHover()
		];
	}

	/** Context menu region: right-click, Shift+F10 / ContextMenu key, and a left press to close. */
	#regionListeners(el: HTMLElement): (() => void)[] {
		const inContent = (target: EventTarget | null) =>
			target instanceof Node && !!this.#layer.contentEl?.contains(target);
		return [
			listen(el, 'pointerdown', (event) => {
				// Every pointer-opened contextmenu event is preceded by a pointerdown.
				this.#keyboardContext = false;
				if (!this.open || event.button !== 0 || event.ctrlKey || inContent(event.target)) return;
				this.#write(false, 'outside');
			}),
			listen(el, 'contextmenu', (event) => {
				if (inContent(event.target)) return;
				event.preventDefault();
				if (this.#keyboardContext) {
					this.#keyboardContext = false;
					return;
				}
				this.#openAt({ x: event.clientX, y: event.clientY }, 'content');
			}),
			listen(el, 'keydown', (event) => {
				const key = event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey);
				if (!key || event.defaultPrevented || inContent(event.target)) return;
				event.preventDefault();
				this.#keyboardContext = true;
				const target = event.target instanceof Element ? event.target : el;
				const r = target.getBoundingClientRect();
				const root = document.documentElement;
				this.#openAt(
					{
						x: Math.min(Math.max(r.left + r.width / 2, 0), root.clientWidth),
						y: Math.min(Math.max(r.top + r.height / 2, 0), root.clientHeight)
					},
					'first'
				);
			})
		];
	}

	#openAt(point: { x: number; y: number }, focus: OpenFocus): void {
		this.#layer.anchorPoint = point;
		if (!this.open) return this.#openWith(focus);
		// Already open: the positioning effect follows the new point; re-take focus.
		if (focus === 'first') this.#nav.highlight('first', { focus: true });
		else this.#layer.contentEl?.focus({ preventScroll: true });
	}

	#openWith(focus: OpenFocus, reason: ChangeReason = 'trigger'): void {
		if (this.open) {
			if (focus === 'first' || focus === 'last') this.#nav.highlight(focus, { focus: true });
			return;
		}
		this.#openFocus = focus;
		this.#write(true, reason);
	}

	// ------------------------------------------------------------------ content

	/** CAPTURE phase on the content: submenu keys and Tab, before ListNav's bubble handler. */
	#onContentKeydown(el: HTMLElement, event: KeyboardEvent): void {
		if (event.defaultPrevented || event.isComposing) return;
		const target = event.target instanceof Element ? event.target : null;
		// Keys from a nested submenu pass through here first; they are not ours.
		if (!target || target.closest('[data-ak-nav-root]') !== el) return;
		if (event.key === 'Tab') {
			this.#root.#write(false, 'focus-out');
			return;
		}
		// Pointer-opened: the surface itself has focus and no item is highlighted yet. Hand
		// the key to ListNav here, since its root handler is meant to serve only its items.
		if (target === el) {
			this.#nav.handleKey(event);
			return;
		}
		if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
		const rtl = getComputedStyle(el).direction === 'rtl';
		const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
		const back = rtl ? 'ArrowRight' : 'ArrowLeft';
		if (event.key === back && this.#parent) {
			event.preventDefault();
			this.#write(false, 'trigger');
		} else if (event.key === forward) {
			const sub = this.#submenuAt(target);
			if (sub && !sub.#subOptions.disabled) {
				event.preventDefault();
				sub.#openWith('first');
			}
		}
	}

	/**
	 * CAPTURE phase on the content. Inside the grace polygon toward an open submenu, the
	 * move never reaches sibling items (no highlight, no hover-open). Outside it, moving
	 * onto another item of this menu closes the open submenu.
	 */
	#onContentPointermove(el: HTMLElement, event: PointerEvent): void {
		if (event.pointerType === 'touch') return;
		const target = event.target instanceof Element ? event.target : null;
		if (!target || target.closest('[data-ak-nav-root]') !== el) return;
		if (this.#grace) {
			if (event.timeStamp <= this.#grace.until && pointInPolygon({ x: event.clientX, y: event.clientY }, this.#grace.polygon)) {
				event.stopPropagation();
				return;
			}
			this.#grace = null;
		}
		const item = target.closest(`[data-ak-nav="${CSS.escape(this.#id)}"]`);
		if (!item) return;
		for (const child of this.#children.values()) {
			if (child.open && child.#layer.triggerEl !== item) child.#write(false, 'hover');
		}
	}

	#submenuAt(target: Element): Menu | null {
		for (const child of this.#children.values()) {
			if (child.#layer.triggerEl === target) return child;
		}
		return null;
	}

	#activate(value: string, event: KeyboardEvent | MouseEvent): void {
		const entry = this.#entries.get(value);
		if (!entry) return;
		if (entry.kind === 'submenu') {
			const sub = entry.menu;
			if (sub.#subOptions.disabled) return;
			sub.#cancelHover();
			sub.#openWith(event instanceof KeyboardEvent ? 'first' : 'none');
			return;
		}
		const select: MenuSelectEvent = new CustomEvent('menuselect', {
			cancelable: true,
			detail: { value: entry.kind === 'radio' ? entry.value : value, originalEvent: event }
		});
		let close: boolean;
		if (entry.kind === 'item') {
			entry.options.onSelect?.(select);
			close = entry.options.closeOnSelect ?? true;
		} else if (entry.kind === 'checkbox') {
			entry.options.onSelect?.(select);
			entry.options.onCheckedChange(entry.options.checked() !== true);
			close = entry.options.closeOnSelect ?? false;
		} else {
			const group = this.#radioOptions.get(entry.name);
			if (!group) return;
			if (group.value() !== entry.value) group.onValueChange(entry.value);
			close = group.closeOnSelect ?? false;
		}
		if (close && !select.defaultPrevented) this.#root.#write(false, 'select');
	}

	// ------------------------------------------------------------------ state

	#staticPlacement(): Placement | null {
		if (this.#options.placement !== undefined) return read(this.#options.placement);
		return this.#options.trigger === 'contextmenu' ? CONTEXT_PLACEMENT : MENU_PLACEMENT;
	}

	/** Read inside the layer's positioning effect (client only). */
	#placement(): Placement {
		if (!this.#parent) return this.#staticPlacement() ?? MENU_PLACEMENT;
		const custom = this.#subOptions.placement;
		if (custom !== undefined) return read(custom);
		const trigger = this.#layer.triggerEl;
		const rtl = trigger ? getComputedStyle(trigger).direction === 'rtl' : false;
		return { side: rtl ? 'left' : 'right', align: 'start', offset: SUBMENU_OFFSET };
	}

	#cancelHover(): void {
		clearTimeout(this.#hoverTimer);
		this.#hoverTimer = undefined;
	}

	/** Closed or unmounted: forget the highlight, pending hover and grace. */
	#reset(): void {
		this.#nav.highlight(null);
		this.#openFocus = 'content';
		this.#grace = null;
		this.#cancelHover();
		for (const child of this.#children.values()) child.#cancelHover();
	}

	#write(open: boolean, reason: ChangeReason): void {
		if (open === this.open) return;
		if (this.#options.open) {
			this.#options.onOpenChange(open, reason);
		} else {
			this.#own = open;
			this.#options.onOpenChange?.(open, reason);
		}
	}
}
