import type { Component } from 'svelte';
import ButtonDemo from './actions/ButtonDemo.svelte';
import IconButtonDemo from './actions/IconButtonDemo.svelte';
import ButtonGroupDemo from './actions/ButtonGroupDemo.svelte';
import ToggleDemo from './actions/ToggleDemo.svelte';
import ToggleGroupDemo from './actions/ToggleGroupDemo.svelte';

/** Showcase demos for the Primitives collection (actions), keyed by catalogue slug. Actions: Button, IconButton, ButtonGroup, Toggle, ToggleGroup. */
export const DEMOS_ACTIONS: Record<string, Component> = {
	'button': ButtonDemo,
	'icon-button': IconButtonDemo,
	'button-group': ButtonGroupDemo,
	'toggle': ToggleDemo,
	'toggle-group': ToggleGroupDemo
};
