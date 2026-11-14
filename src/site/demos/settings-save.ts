import type { Component } from 'svelte';
import SettingsFormDemo from './settings/SettingsFormDemo.svelte';
import SaveBarDemo from './settings/SaveBarDemo.svelte';
import ChangeNoticeDemo from './settings/ChangeNoticeDemo.svelte';
import ConflictResolverDemo from './settings/ConflictResolverDemo.svelte';
import ConsequenceListDemo from './settings/ConsequenceListDemo.svelte';
import ConsequenceDialogDemo from './settings/ConsequenceDialogDemo.svelte';

/** Showcase demos for the Settings collection (save group), keyed by catalogue slug: SettingsForm, SaveBar, ChangeNotice, ConflictResolver, ConsequenceList, ConsequenceDialog. */
export const DEMOS_SETTINGS_SAVE: Record<string, Component> = {
	'settings-form': SettingsFormDemo,
	'save-bar': SaveBarDemo,
	'change-notice': ChangeNoticeDemo,
	'conflict-resolver': ConflictResolverDemo,
	'consequence-list': ConsequenceListDemo,
	'consequence-dialog': ConsequenceDialogDemo
};
