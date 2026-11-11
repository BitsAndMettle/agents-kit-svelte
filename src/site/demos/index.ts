import type { Component } from 'svelte';
import { DEMOS_ACTIONS } from './primitives-actions.ts';
import { DEMOS_FORM } from './primitives-form.ts';
import { DEMOS_DISPLAY } from './primitives-display.ts';
import { DEMOS_NAVIGATION } from './primitives-navigation.ts';
import { DEMOS_OVERLAYS } from './primitives-overlays.ts';
import { DEMOS_MENUS } from './primitives-menus.ts';
import { DEMOS_AUTH_FIELDS } from './auth-fields.ts';
import { DEMOS_AUTH_ACCOUNT } from './auth-account.ts';
import { DEMOS_AUTH_SIGNIN } from './auth-signin.ts';
import { DEMOS_AUTH_RECOVERY } from './auth-recovery.ts';
import { DEMOS_SETTINGS_SHELL } from './settings-shell.ts';
import { DEMOS_SETTINGS_ROWS } from './settings-rows.ts';
import { DEMOS_SETTINGS_SAVE } from './settings-save.ts';
import { DEMOS_SETTINGS_CONTROLS } from './settings-controls.ts';

/** Every Primitives, Auth and Settings demo, keyed by catalogue slug. The showcase renders these generically. */
export const PRIMITIVE_DEMOS: Record<string, Component> = {
	...DEMOS_ACTIONS,
	...DEMOS_FORM,
	...DEMOS_DISPLAY,
	...DEMOS_NAVIGATION,
	...DEMOS_OVERLAYS,
	...DEMOS_MENUS,
	...DEMOS_AUTH_FIELDS,
	...DEMOS_AUTH_ACCOUNT,
	...DEMOS_AUTH_SIGNIN,
	...DEMOS_AUTH_RECOVERY,
	...DEMOS_SETTINGS_SHELL,
	...DEMOS_SETTINGS_ROWS,
	...DEMOS_SETTINGS_SAVE,
	...DEMOS_SETTINGS_CONTROLS,
};
