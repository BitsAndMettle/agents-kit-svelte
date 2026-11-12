import type { Component } from 'svelte';
import SettingsSectionDemo from './settings/SettingsSectionDemo.svelte';
import SettingsRowDemo from './settings/SettingsRowDemo.svelte';
import SettingsFactsDemo from './settings/SettingsFactsDemo.svelte';
import SettingsToggleDemo from './settings/SettingsToggleDemo.svelte';
import RequestedChangeDemo from './settings/RequestedChangeDemo.svelte';
import LockReasonDemo from './settings/LockReasonDemo.svelte';

/** Showcase demos for the Settings collection (rows group), keyed by catalogue slug: SettingsSection, SettingsRow, SettingsFacts, SettingsToggle, RequestedChange, LockReason. */
export const DEMOS_SETTINGS_ROWS: Record<string, Component> = {
	'settings-section': SettingsSectionDemo,
	'settings-row': SettingsRowDemo,
	'settings-facts': SettingsFactsDemo,
	'settings-toggle': SettingsToggleDemo as Component,
	'requested-change': RequestedChangeDemo,
	'lock-reason': LockReasonDemo
};
