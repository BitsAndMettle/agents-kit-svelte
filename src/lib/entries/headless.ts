/**
 * agents-kit-svelte/headless — accessible behaviour without markup or styles.
 *
 * Every export is a class you construct once in a component's script (passing an `id`
 * from `const id = $props.id()`; Svelte only allows that call as a top-level initialiser),
 * and whose parts you spread onto your own elements.
 * Zero runtime dependencies; requires svelte >= 5.29 (attachments in spreads).
 *
 * NOT exported, on purpose: the layer stack, Layer, positioning, focus helpers, and the
 * pure logic files (those are tested directly). Not re-exported from the package root
 * either, so the headless `Dialog`/`Popover` classes never collide with styled components.
 */

// Layers
export { Dialog, type DialogOptions } from '../headless/patterns/dialog.svelte';
export { Popover, type PopoverOptions } from '../headless/patterns/popover.svelte';
export type { FocusTarget } from '../headless/runtime/layers.svelte';

// Menus
export {
	Menu,
	type MenuOptions,
	type MenuItemOptions,
	type MenuCheckboxOptions,
	type MenuRadioGroupOptions,
	type MenuRadioGroup,
	type MenuSubmenuOptions,
	type MenuSelectEvent
} from '../headless/patterns/menu.svelte';

// Option lists
export {
	Select,
	Combobox,
	Listbox,
	type SelectOptions,
	type ComboboxOptions,
	type ListboxOptions,
	type OptionOptions,
	type OptionGroup
} from '../headless/patterns/listbox.svelte';

// Building blocks for custom composites
export { ListNav, type ListNavOptions, type ItemOptions } from '../headless/runtime/list-nav.svelte';
export type {
	Part,
	MaybeGetter,
	ChangeReason,
	Dismiss,
	OpenState,
	ValueState
} from '../headless/runtime/parts';
export type { Placement, Side, Align } from '../headless/logic/placement';
export type { Orientation } from '../headless/logic/roving';
export { Tooltip, type TooltipOptions } from '../headless/patterns/tooltip.svelte';
export {
	Tabs,
	Accordion,
	RadioGroup,
	ToggleGroup,
	type TabsOptions,
	type AccordionOptions,
	type RadioGroupOptions,
	type ToggleGroupOptions
} from '../headless/patterns/groups.svelte';
