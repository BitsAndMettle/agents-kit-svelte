/**
 * Class recipes shared by the menus and pickers. States come from the headless layer's
 * data attributes (`data-state`, `data-highlighted`, `data-selected`, `data-disabled`).
 */

/** Fade and settle in, fade out; only when the person has not asked for reduced motion. A closing surface never catches the pointer. */
export const POPUP_MOTION =
	'data-[state=closed]:pointer-events-none motion-safe:transition-[opacity,scale,display,overlay] motion-safe:transition-discrete motion-safe:duration-150 motion-safe:ease-out motion-safe:data-[state=closed]:opacity-0 motion-safe:data-[state=closed]:scale-[0.98] motion-safe:starting:opacity-0 motion-safe:starting:scale-[0.98]';

/** A floating menu surface (each level of a DropdownMenu or ContextMenu). */
export const MENU_SURFACE = `min-w-48 max-w-[calc(100vw-1rem)] max-h-(--ak-available-height) overflow-y-auto rounded-card border border-card-border bg-card-bg p-1 text-[13px] text-fg-main ak-shadow-soft outline-none ${POPUP_MOTION}`;

/** One menu row. `group` lets the check and radio marks read `aria-checked`. */
export const MENU_ITEM =
	'group flex min-h-8 cursor-default select-none items-center gap-2 rounded-control px-2 py-1.5 outline-none data-highlighted:bg-chat-user data-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0';

/** Menu row colour per tone; `danger` marks destructive actions. */
export const MENU_ITEM_TONES = {
	neutral: '',
	accent: 'text-accent-primary data-highlighted:bg-accent-subtle',
	success: 'text-status-success data-highlighted:bg-status-success-subtle',
	warning: 'text-status-warning data-highlighted:bg-status-warning-subtle',
	danger: 'text-status-danger data-highlighted:bg-status-danger-subtle'
} as const;

/** Shortcut hint at the end of a menu row. */
export const MENU_SHORTCUT = 'ml-auto pl-4 font-sans text-[11px] tracking-wide text-fg-light';

/** Heading above a group of rows. */
export const GROUP_LABEL = 'px-2 pt-2 pb-1 text-[11px] font-medium text-fg-light';

/** Hairline between rows. */
export const SEPARATOR = 'my-1 h-px bg-canvas-border';

/** The popup list of a Select or Combobox: as wide as its trigger. */
export const PICKER_LIST = `w-(--ak-anchor-width) max-h-[min(18rem,var(--ak-available-height,18rem))] overflow-y-auto rounded-card border border-card-border bg-card-bg p-1 text-fg-main ak-shadow-soft ${POPUP_MOTION}`;

/** One option of a Select, Combobox or CommandPalette. */
export const PICKER_OPTION =
	'group flex cursor-default select-none items-center gap-2 rounded-control px-2 py-1.5 text-[13px] text-fg-main data-highlighted:bg-chat-user data-disabled:opacity-50 [&_svg]:shrink-0';

/** The label above a Select or Combobox. */
export const PICKER_LABEL = 'text-xs font-medium text-fg-main';

/** A boxed key hint. */
export const KBD =
	'inline-flex h-5 min-w-5 items-center justify-center rounded-chip border border-card-border bg-canvas-secondary px-1.5 font-sans text-[11px] font-medium text-fg-light';

/** Height, padding and text size per form-row size; the same steps as Input. */
export const PICKER_SIZES = {
	sm: 'min-h-7 px-2.5 text-xs',
	md: 'min-h-8 px-3 text-[13px]',
	lg: 'min-h-10 px-3.5 text-sm'
} as const;

/** Invalid look, from `aria-invalid` on the control. */
export const PICKER_INVALID = 'aria-invalid:border-status-danger/70';
