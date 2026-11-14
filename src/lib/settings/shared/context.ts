/**
 * Contexts that tie a settings tree together. Set them while a component initialises; read them
 * the same way. The nearest provider wins.
 */
import { getContext, setContext } from 'svelte';
import type { SettingsDraft } from './staged.svelte';
import type { SettingLock } from './types';

/**
 * What the area around a control says: whether JS-only affordances may run yet, and a lock that
 * covers everything below. Set by SettingsLayout (ready), SettingsPage `scope`, SettingsSection
 * `lock` and SettingsRow (for its control). A provider that adds a lock keeps its parent's `ready` and passes the stronger lock on
 * (`pickLock(own, parent?.lock?.lock)`).
 */
export interface SettingsScope {
	/** False on the server and before mount (see ReadyGate). */
	ready: () => boolean;
	/** The lock covering this subtree and the id of its visible reason. */
	lock?: { lock: SettingLock; reasonId: string };
}

/** Where a section sits, so a nested SettingsSection renders as a sub-group with the next heading level. */
export interface SectionContext {
	depth: number;
	headingLevel: 2 | 3 | 4 | 5;
	layout: 'rows' | 'columns';
}

const SCOPE = Symbol('agents-kit-settings-scope');
const DRAFT = Symbol('agents-kit-settings-draft');
const SECTION = Symbol('agents-kit-settings-section');

export function setSettingsScope(scope: SettingsScope): void {
	setContext(SCOPE, scope);
}

/** The nearest settings scope, or undefined outside a settings tree. */
export function getSettingsScope(): SettingsScope | undefined {
	return getContext<SettingsScope | undefined>(SCOPE);
}

/** Called by SettingsForm. Its presence switches controls below to staged mode and drops their own mini-forms. */
export function setSettingsDraft(draft: SettingsDraft): void {
	setContext(DRAFT, draft);
}

/** The surrounding SettingsForm's draft, or undefined (instant mode). */
export function getSettingsDraft(): SettingsDraft | undefined {
	return getContext<SettingsDraft | undefined>(DRAFT);
}

export function setSectionContext(section: SectionContext): void {
	setContext(SECTION, section);
}

/** The enclosing SettingsSection, or undefined at the top level. */
export function getSectionContext(): SectionContext | undefined {
	return getContext<SectionContext | undefined>(SECTION);
}
