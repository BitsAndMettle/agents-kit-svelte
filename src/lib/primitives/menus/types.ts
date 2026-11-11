import type { Component } from 'svelte';
import type { MenuSelectEvent } from '../../headless/patterns/menu.svelte';

export type { MenuSelectEvent };

/** An icon component, such as one from `@lucide/svelte`. Rendered with `class` only. */
export type MenuIcon = Component<{ class?: string }>;

/** A plain menu item. */
export interface MenuItemEntry {
	kind?: 'item';
	/** Unique within its menu level. */
	value: string;
	label: string;
	icon?: MenuIcon;
	/** Hint shown at the end of the row, e.g. `⌘C`. Display only: the menu does not bind it. */
	shortcut?: string;
	/** `danger` for destructive actions. */
	tone?: 'default' | 'danger';
	disabled?: boolean;
	/** Click, Enter or Space. `event.preventDefault()` keeps the menu open. */
	onSelect?: (event: MenuSelectEvent) => void;
	/** Default true: choosing closes the whole menu and returns focus to the trigger. */
	closeOnSelect?: boolean;
}

/** An item with a check mark that toggles. Stays open by default. */
export interface MenuCheckboxEntry {
	kind: 'checkbox';
	value: string;
	label: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	shortcut?: string;
	disabled?: boolean;
	closeOnSelect?: boolean;
}

/** A set of mutually exclusive items. Stays open by default. */
export interface MenuRadioEntry {
	kind: 'radio';
	/** Unique within its menu level. */
	name: string;
	/** Shown above the options and used as the group's accessible name. */
	label?: string;
	/** The chosen option's value. */
	value: string | null;
	options: { value: string; label: string; disabled?: boolean }[];
	onValueChange: (value: string) => void;
	closeOnSelect?: boolean;
}

/** An item that opens a nested menu. */
export interface MenuSubmenuEntry {
	kind: 'submenu';
	value: string;
	label: string;
	icon?: MenuIcon;
	disabled?: boolean;
	items: MenuEntry[];
}

/** Entries under a visible heading, named by it. */
export interface MenuGroupEntry {
	kind: 'group';
	label: string;
	/** Unique within its menu level. Defaults to `label`. */
	name?: string;
	items: MenuEntry[];
}

export interface MenuSeparatorEntry {
	kind: 'separator';
}

/** One row of a DropdownMenu or ContextMenu, described as data. */
export type MenuEntry =
	| MenuItemEntry
	| MenuCheckboxEntry
	| MenuRadioEntry
	| MenuSubmenuEntry
	| MenuGroupEntry
	| MenuSeparatorEntry;

/** One choice in a Select or Combobox. */
export interface PickerOption {
	/** Unique; what `value` holds and the form submits. */
	value: string;
	label: string;
	/** A second, quieter line. */
	description?: string;
	disabled?: boolean;
	/** Options with the same group are shown under that heading, in first-appearance order. */
	group?: string;
}

/** The value of a Select: one value, or a list with `multiple`. */
export type PickerValue<Multiple extends boolean> = Multiple extends true ? string[] : string | null;

/** One command in a CommandPalette. */
export interface PaletteCommand {
	/** Unique. */
	id: string;
	title: string;
	subtitle?: string;
	icon?: MenuIcon;
	/** Hint shown at the end of the row. Display only. */
	shortcut?: string;
	/** Heading the command is listed under. */
	group?: string;
	/** Extra words the filter matches. */
	keywords?: string[];
	disabled?: boolean;
	/** Runs after the palette closes. */
	onRun?: () => void;
}
