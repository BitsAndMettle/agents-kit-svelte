import type { Component } from 'svelte';
import type { HTMLButtonAttributes } from 'svelte/elements';
import type { MenuSelectEvent } from '../../headless/patterns/menu.svelte';
import type { ChangeReason } from '../../headless/runtime/parts';
import type { UiTone } from '../../ui/styles';
import type { OverlayPlacement } from '../placement';

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
	/** Colour meaning; `danger` for destructive actions. Default `neutral`. */
	tone?: UiTone;
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
	label: string;
	/** A second, quieter line. */
	description?: string;
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

/** Height and text size of a form-row control; lines up with Input and NativeSelect. */
export type PickerSize = 'sm' | 'md' | 'lg';

/** Props of `Select`. Extra attributes land on the trigger button. */
export interface SelectProps<Multiple extends boolean = false>
	extends Omit<HTMLButtonAttributes, 'class' | 'children' | 'value' | 'defaultValue' | 'name' | 'type' | 'form'> {
	/** Visible label. Optional inside a `Field`, which names the control instead; standalone use without it takes `aria-label`. */
	label?: string;
	options: PickerOption[];
	/** Several values, toggled one by one; the list stays open while choosing. */
	multiple?: Multiple;
	/** Bindable. A value, or a list of values with `multiple`. */
	value?: PickerValue<Multiple>;
	/** Starting value when `value` is not bound; a form reset restores it. */
	defaultValue?: PickerValue<Multiple>;
	onValueChange?: (value: PickerValue<Multiple>) => void;
	/** Bindable. */
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean, reason: ChangeReason) => void;
	/** Shown while nothing is chosen. */
	placeholder?: string;
	/** With `multiple`: chips for each choice, or a count (see `formatCount`). Default `chips`. */
	display?: 'chips' | 'count';
	/** Text for several choices with `display="count"`. Default `3 selected`. */
	formatCount?: (count: number) => string;
	/** Form field name: one hidden input per chosen value. */
	name?: string;
	/** Blocks form submission while nothing is chosen; focus goes to the trigger. */
	required?: boolean;
	disabled?: boolean;
	/** Marks the control invalid (a surrounding Field with an error does too). */
	invalid?: boolean;
	/** Default `md`. */
	size?: PickerSize;
	/** Keep the label for screen readers only. */
	hideLabel?: boolean;
	/** `'bottom-start'` (default), `'top-end'`, … or a full placement. The list always matches the trigger's width. */
	placement?: OverlayPlacement;
	/** The trigger button. Bindable. */
	ref?: HTMLButtonElement | null;
	/** Classes for the outer box (label, trigger and list). */
	class?: string;
}
