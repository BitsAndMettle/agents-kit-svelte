/**
 * Locks: why a setting cannot be changed. One precedence, one way to mark a locked control, one
 * set of default sentences. A leaf (the kind icons live in `lock-icons.ts`, which imports Lucide).
 */
import type { LockKind, SettingLock } from './types';

/** Strongest first. When a row, its section and its page are all locked, the strongest lock is shown. */
export const LOCK_PRECEDENCE: readonly LockKind[] = [
	'readonly',
	'permission',
	'managed',
	'inherited',
	'plan',
	'awaiting-approval',
	'unsupported'
];

/** English sentence per lock kind, used when a lock has no `reason`. Components take overrides through their `labels`. */
export const LOCK_LABELS: Record<LockKind, string> = {
	permission: "You don't have permission to change this.",
	plan: 'Not included in your current plan.',
	managed: 'Managed by an administrator.',
	inherited: 'Inherited from a higher-level setting.',
	readonly: 'Read-only here.',
	unsupported: 'Not supported here.',
	'awaiting-approval': 'Waiting for approval.'
};

/**
 * The strongest of several locks (`LOCK_PRECEDENCE`), ignoring undefined. On a tie the earlier
 * argument wins, so pass the nearest lock first: `pickLock(row.lock, section.lock, page.lock)`.
 */
export function pickLock(...locks: (SettingLock | null | undefined)[]): SettingLock | undefined {
	let best: SettingLock | undefined;
	let bestRank = Infinity;
	for (const lock of locks) {
		if (!lock) continue;
		const rank = LOCK_PRECEDENCE.indexOf(lock.kind);
		const effective = rank === -1 ? LOCK_PRECEDENCE.length : rank;
		if (effective < bestRank) {
			best = lock;
			bestRank = effective;
		}
	}
	return best;
}

/** The sentence a lock shows: its own `reason`, else the kind's label. */
export function lockReasonText(lock: SettingLock, labels: Partial<Record<LockKind, string>> = {}): string {
	return lock.reason || labels[lock.kind] || LOCK_LABELS[lock.kind];
}

/** Attributes a locked native control takes. */
export interface LockAttrs {
	disabled?: true;
	'aria-describedby'?: string;
	'data-locked'?: LockKind;
}

/**
 * What a locked control gets: native `disabled`, `aria-describedby` pointing at the visible
 * reason, and `data-locked` with the kind. Nothing when unlocked. Inside a settings row, pass the
 * reason id through the row's Field state (`describedBy`) instead of spreading `aria-describedby`
 * twice: a later spread replaces an earlier one.
 *
 * @param lock - The lock, if any (usually from `pickLock`).
 * @param reasonId - Id of the element that shows the reason text.
 */
export function lockAttrs(lock: SettingLock | null | undefined, reasonId: string | undefined): LockAttrs {
	if (!lock) return {};
	const attrs: LockAttrs = { disabled: true, 'data-locked': lock.kind };
	if (reasonId) attrs['aria-describedby'] = reasonId;
	return attrs;
}
