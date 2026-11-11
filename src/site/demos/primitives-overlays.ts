import type { Component } from 'svelte';
import DialogDemo from './overlays/DialogDemo.svelte';
import AlertDialogDemo from './overlays/AlertDialogDemo.svelte';
import SheetDemo from './overlays/SheetDemo.svelte';
import PopoverDemo from './overlays/PopoverDemo.svelte';
import TooltipDemo from './overlays/TooltipDemo.svelte';

/** Showcase demos for the Primitives collection (overlays), keyed by catalogue slug. Overlays: Dialog, AlertDialog, Sheet, Popover, Tooltip. */
export const DEMOS_OVERLAYS: Record<string, Component> = {
	'dialog': DialogDemo,
	'alert-dialog': AlertDialogDemo,
	'sheet': SheetDemo,
	'popover': PopoverDemo,
	'tooltip': TooltipDemo
};
