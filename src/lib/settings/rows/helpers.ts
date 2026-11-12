/**
 * Pure helpers of the rows group. A leaf: type-only imports, no runes, so node tests load it
 * directly.
 */
import type { TimeInput } from '../../core/time';
import type { SettingsAction, SettingsFact, SettingsResult } from '../shared/types';

/**
 * Splits a row's actions into the ones shown as buttons and the ones collapsed into a menu. Up to
 * `max` show as buttons; with more, the first `max - 1` stay visible and the rest collapse, so the
 * menu trigger takes the last slot. Actions that post a form intent never collapse: a menu item
 * cannot submit a form, so they stay buttons.
 */
export function splitActions(actions: readonly SettingsAction[], max = 2): { visible: SettingsAction[]; overflow: SettingsAction[] } {
	if (actions.length <= max) return { visible: [...actions], overflow: [] };
	const keep = Math.max(0, max - 1);
	const visible: SettingsAction[] = [];
	const overflow: SettingsAction[] = [];
	actions.forEach((action, index) => {
		if (index < keep || (action.intent !== undefined && action.href === undefined && !action.unavailable)) visible.push(action);
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
