/**
 * Settings, save group: SettingsForm, SaveBar, ChangeNotice, ConflictResolver, ConsequenceList, ConsequenceDialog.
 * The staged model's form and bar, the inline result of a change, the end of a stale save, and the
 * confirmed model's consequence review. Builds only on ../shared and existing Primitives.
 */

import type { ComponentProps } from 'svelte';
import type ChangeNoticeComponent from './ChangeNotice.svelte';

export { default as SettingsForm } from './SettingsForm.svelte';
export type { Props as SettingsFormProps, SettingsFormLabels } from './SettingsForm.svelte';
export { default as SaveBar } from './SaveBar.svelte';
export type { Props as SaveBarProps, SaveBarLabels, SaveBarLayout } from './SaveBar.svelte';
export { default as ChangeNotice } from './ChangeNotice.svelte';
export type { ChangeNoticeLabels } from './ChangeNotice.svelte';
/** ChangeNotice's props, for undo tokens of type `Token` (an `InstantSetting`'s are numbers). */
export type ChangeNoticeProps<Token extends string | number = string | number> = ComponentProps<typeof ChangeNoticeComponent<Token>>;
export { default as ConflictResolver } from './ConflictResolver.svelte';
export type { Props as ConflictResolverProps, ConflictResolverLabels, ConflictKeep } from './ConflictResolver.svelte';
export { default as ConsequenceList } from './ConsequenceList.svelte';
export type { Props as ConsequenceListProps, ConsequenceListLabels } from './ConsequenceList.svelte';
export { default as ConsequenceDialog } from './ConsequenceDialog.svelte';
export type { Props as ConsequenceDialogProps, ConsequenceDialogLabels, ConsequenceConfirmContext } from './ConsequenceDialog.svelte';
