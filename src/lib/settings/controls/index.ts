/**
 * Settings, controls group: ChoiceCards, NotificationMatrix, SettingsItemList, UsageMeter, CopyValue.
 * Builds only on ../shared and existing Primitives/headless; never imports another group's .svelte file.
 */
import type { ComponentProps } from 'svelte';
import type { SettingsItem } from '../shared/types';
import type SettingsItemListComponent from './SettingsItemList.svelte';

export { default as ChoiceCards } from './ChoiceCards.svelte';
export type { Props as ChoiceCardsProps, ChoiceCardsLabels, ChoiceCardsVariant } from './ChoiceCards.svelte';
export { default as NotificationMatrix } from './NotificationMatrix.svelte';
export type {
	Props as NotificationMatrixProps,
	NotificationMatrixLabels,
	NotificationMatrixLayout,
	NotificationEvent,
	NotificationChannel,
	NotificationLockedCell
} from './NotificationMatrix.svelte';
export { matrixCellKey, parseMatrixCellKey, matrixColumnState, toggleMatrixColumn, groupMatrixEvents } from './matrix';
export type { MatrixColumnState } from './matrix';
export { default as SettingsItemList } from './SettingsItemList.svelte';
export type { SettingsItemListLabels } from './SettingsItemList.svelte';
/** SettingsItemList's props, for items of type `T`. */
export type SettingsItemListProps<T extends SettingsItem = SettingsItem> = ComponentProps<typeof SettingsItemListComponent<T>>;
export { filterSettingsItems, groupSettingsItems, selectableIds } from './item-list';
export { default as UsageMeter } from './UsageMeter.svelte';
export type { Props as UsageMeterProps, UsageMeterLabels, UsageMeterVariant } from './UsageMeter.svelte';
export { usageLevel, usageTone, usageScale, usagePercent } from './meter';
export type { UsageLevel, UsageThresholds } from './meter';
export { default as CopyValue } from './CopyValue.svelte';
export type { Props as CopyValueProps, CopyValueLabels } from './CopyValue.svelte';
