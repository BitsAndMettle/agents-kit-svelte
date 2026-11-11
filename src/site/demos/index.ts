import type { Component } from 'svelte';
import { DEMOS_ACTIONS } from './primitives-actions.ts';
import { DEMOS_FORM } from './primitives-form.ts';
import { DEMOS_DISPLAY } from './primitives-display.ts';
import { DEMOS_NAVIGATION } from './primitives-navigation.ts';
import { DEMOS_OVERLAYS } from './primitives-overlays.ts';
import { DEMOS_MENUS } from './primitives-menus.ts';

/** Every Primitives demo, keyed by catalogue slug. The showcase renders these generically. */
export const PRIMITIVE_DEMOS: Record<string, Component> = {
	...DEMOS_ACTIONS,
	...DEMOS_FORM,
	...DEMOS_DISPLAY,
	...DEMOS_NAVIGATION,
	...DEMOS_OVERLAYS,
	...DEMOS_MENUS,
};
