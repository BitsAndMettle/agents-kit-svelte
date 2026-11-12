import type { Component } from 'svelte';
import SettingsLayoutDemo from './settings/SettingsLayoutDemo.svelte';
import SettingsNavDemo from './settings/SettingsNavDemo.svelte';
import SettingsPageDemo from './settings/SettingsPageDemo.svelte';
import SettingsSearchDemo from './settings/SettingsSearchDemo.svelte';
import AttentionListDemo from './settings/AttentionListDemo.svelte';

/** Showcase demos for the Settings collection (shell group), keyed by catalogue slug: SettingsLayout, SettingsNav, SettingsPage, SettingsSearch, AttentionList. */
export const DEMOS_SETTINGS_SHELL: Record<string, Component> = {
	'settings-layout': SettingsLayoutDemo,
	'settings-nav': SettingsNavDemo,
	'settings-page': SettingsPageDemo,
	'settings-search': SettingsSearchDemo,
	'attention-list': AttentionListDemo
};
