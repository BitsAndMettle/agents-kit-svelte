import type { Component } from 'svelte';
import SettingsFormDemo from './settings/SettingsFormDemo.svelte';
import TierMatrixDemo from './settings/TierMatrixDemo.svelte';

/** Showcase demos for the Settings collection, keyed by catalogue slug: SettingsForm, TierMatrix. */
export const DEMOS_SETTINGS: Record<string, Component> = {
	'settings-form': SettingsFormDemo,
	'tier-matrix': TierMatrixDemo
};
