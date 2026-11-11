import type { Component } from 'svelte';
import DropdownMenuDemo from './menus/DropdownMenuDemo.svelte';
import ContextMenuDemo from './menus/ContextMenuDemo.svelte';
import SelectDemo from './menus/SelectDemo.svelte';
import ComboboxDemo from './menus/ComboboxDemo.svelte';
import CommandPaletteDemo from './menus/CommandPaletteDemo.svelte';

/** Showcase demos for the Primitives collection (menus), keyed by catalogue slug. Menus and pickers: DropdownMenu, ContextMenu, Select, Combobox, CommandPalette. */
export const DEMOS_MENUS: Record<string, Component> = {
	'dropdown-menu': DropdownMenuDemo,
	'context-menu': ContextMenuDemo,
	'select': SelectDemo,
	'combobox': ComboboxDemo,
	'command-palette': CommandPaletteDemo
};
