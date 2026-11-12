/**
 * Pure helpers of the rows group. A leaf: type-only imports, no runes, so node tests load it
 * directly.
 */
import type { TimeInput } from '../../core/time';
import type { SettingsAction, SettingsFact, SettingsResult } from '../shared/types';

/**
 * Splits a row's actions into the ones shown as buttons and the ones collapsed into a menu. Up to
 * `max` show as buttons; with more, the first `max - 1` stay visible and the rest collapse, so the
 * menu trigger takes the last slot. Links and form intents never collapse: a menu item is neither
 * a link nor a submit button, so they stay real `<a>` and `<button type="submit">` elements (an
 * unavailable one does nothing, so it may collapse as a disabled item).
 */
export function splitActions(actions: readonly SettingsAction[], max = 2): { visible: SettingsAction[]; overflow: SettingsAction[] } {
	if (actions.length <= max) return { visible: [...actions], overflow: [] };
	const keep = Math.max(0, max - 1);
	const visible: SettingsAction[] = [];
	const overflow: SettingsAction[] = [];
	actions.forEach((action, index) => {
		if (index < keep || (!action.unavailable && (action.href !== undefined || action.intent !== undefined))) visible.push(action);
		else overflow.push(action);
	});
	return { visible, overflow };
}

/** The text a fact's copy button copies: its `copy` string, else its value. Undefined when it has no copy button. */
export function factCopyText(fact: Pick<SettingsFact, 'copy' | 'value'>): string | undefined {
	if (fact.copy === undefined || fact.copy === false) return undefined;
	return typeof fact.copy === 'string' ? fact.copy : fact.value;
}

/** Milliseconds since the epoch, or NaN. Same reading as core/time's `toMillis`, inlined to keep this file a leaf. */
function millis(input: TimeInput): number {
	return input instanceof Date ? input.getTime() : typeof input === 'number' ? input : Date.parse(input);
}

/**
 * How long ago a request was made, as short English text: "just now", "12 min ago", "3 h ago",
 * "yesterday", "4 days ago". Empty when either time is not valid. A time in the future counts as now.
 *
 * @param at - When the request was made.
 * @param now - The current time in milliseconds (inject it so server and browser agree).
 */
export function formatRequestedAgo(at: TimeInput, now: number): string {
	const a = millis(at);
	if (!Number.isFinite(a) || !Number.isFinite(now)) return '';
	const minutes = Math.floor(Math.max(0, now - a) / 60_000);
	if (minutes < 1) return 'just now';
	if (minutes < 60) return `${minutes} min ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} h ago`;
	const days = Math.floor(hours / 24);
	return days === 1 ? 'yesterday' : `${days} days ago`;
}

/** What a settled callback means for the button that ran it. */
export type ActionOutcome = { ok: true; notice?: string } | { ok: false; error?: string };

/**
 * Reads a callback's result: a returned `{error}`, `{errors}` or `{conflict}` is a failure that
 * keeps the handler's own message; anything else (nothing, `{}`, `{notice}`) is success.
 */
export function readOutcome(result: void | SettingsResult | undefined): ActionOutcome {
	if (!result) return { ok: true };
	const message = result.error || Object.values(result.errors ?? {}).find(Boolean) || result.conflict?.message;
	if (message || result.conflict || Object.values(result.errors ?? {}).some(Boolean)) return { ok: false, error: message || undefined };
	return { ok: true, notice: result.notice };
}

/**
 * Adds fields to a URL's query, before any `#fragment`. A button inside someone else's form posts
 * that form's body to its `formaction`, so fields that must reach that URL travel in its query.
 */
export function withQuery(url: string, fields: Record<string, string> | undefined): string {
	const entries = Object.entries(fields ?? {});
	if (!entries.length) return url;
	const hashAt = url.indexOf('#');
	const base = hashAt === -1 ? url : url.slice(0, hashAt);
	const hash = hashAt === -1 ? '' : url.slice(hashAt);
	const separator = !base.includes('?') ? '?' : base.endsWith('?') || base.endsWith('&') ? '' : '&';
	return base + separator + new URLSearchParams(entries).toString() + hash;
}

/** True when focus fell back to the page (its element was removed or hidden). Call it in the browser only. */
export function focusLost(): boolean {
	const active = document.activeElement;
	return !active || active === document.body;
}
