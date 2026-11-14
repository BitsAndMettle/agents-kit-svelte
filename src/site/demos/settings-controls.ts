import type { Component } from 'svelte';
import ChoiceCardsDemo from './settings/ChoiceCardsDemo.svelte';
import NotificationMatrixDemo from './settings/NotificationMatrixDemo.svelte';
import SettingsItemListDemo from './settings/SettingsItemListDemo.svelte';
import UsageMeterDemo from './settings/UsageMeterDemo.svelte';
import CopyValueDemo from './settings/CopyValueDemo.svelte';

/** Showcase demos for the Settings collection (controls group), keyed by catalogue slug: ChoiceCards, NotificationMatrix, SettingsItemList, UsageMeter, CopyValue. */
export const DEMOS_SETTINGS_CONTROLS: Record<string, Component> = {
	'choice-cards': ChoiceCardsDemo,
	'notification-matrix': NotificationMatrixDemo,
	'settings-item-list': SettingsItemListDemo,
	'usage-meter': UsageMeterDemo,
	'copy-value': CopyValueDemo
};
