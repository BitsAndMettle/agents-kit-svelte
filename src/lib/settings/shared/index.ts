/**
 * The Settings shared layer: the four change models (instant, staged, confirmed, locked), the
 * shared types, contexts, search, focus and copy helpers, and the class recipes. Plain `.ts` and
 * `.svelte.ts` only; every group builds on it. See docs/settings/CONVENTIONS.md.
 */

export type * from './types';
export { SettingsDraft } from './staged.svelte';
export type { SettingsDraftOptions, SettingsSubmitContext, SettingsSubmitHandler, SettingsValues } from './staged.svelte';
export { readDefaults, readCurrent, diffForm, describeChanges, adoptCurrentAsDefaults, sameValue, undescribedChanges, CHANGE_WORDS } from './diff';
export type { ChangeWords, ControlLike, FormLike, OptionLike, FieldReading } from './diff';
export { InstantSetting } from './instant.svelte';
export type { InstantOptions } from './instant.svelte';
export { UndoSlot, InstantCore, readResult, toFormResult } from './undo';
export type { InstantSnapshot, InstantCoreOptions, SettingsOutcome } from './undo';
export { SettingsHandlerRun } from './run.svelte';
export type { SettingsRunStatus } from './run.svelte';
export { LOCK_PRECEDENCE, LOCK_LABELS, pickLock, lockAttrs, lockReasonText } from './lock';
export type { LockAttrs } from './lock';
export { LOCK_ICONS } from './lock-icons';
export { setSettingsScope, getSettingsScope, setSettingsDraft, getSettingsDraft, setSectionContext, getSectionContext } from './context';
export type { SettingsScope, SectionContext } from './context';
export { ReadyGate } from './ready.svelte';
export { searchSettings, filterSettingsLinks, toPaletteCommands, highlightSegments, mergeRanges, queryTokens } from './search';
export type { SettingsSearchResult, TextRange } from './search';
export { rememberOpener, openerFor, restoreFocus, focusIndexAfterRemoval, nextFocusAfterRemoval, firstInvalidControl, OPENER_ATTRIBUTE } from './focus';
export { CopyState } from './copy.svelte';
export type { CopyStatus } from './copy.svelte';
export { matchesPhrase, phrasePattern } from './confirm';
export type { PhraseOptions } from './confirm';
export { SETTINGS_CONTAINER, CQ, RECIPES, actionButtonProps } from './recipes';
export type { SettingsActionButtonProps, SettingsActionButtonOptions } from './recipes';
