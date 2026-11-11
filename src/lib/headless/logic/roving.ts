/**
 * Pure keyboard-navigation math for lists and grids. Self-contained (no imports).
 * Works on indexes into the CURRENT DOM order of items; the shell reads that order from
 * the DOM at key time, so filtering, {#if} and keyed reorders never desync a registry.
 */

export type Orientation = 'vertical' | 'horizontal' | 'both';

export type NavIntent =
	| 'next'
	| 'prev'
	| 'first'
	| 'last'
	| 'up' // grid only
	| 'down' // grid only
	| 'page-down'
	| 'page-up';

export interface NavInput {
	readonly count: number;
	/** -1 when nothing is highlighted yet. */
	readonly current: number;
	readonly disabled: readonly boolean[];
	readonly loop: boolean;
	/** Columns for a grid; 1 (or absent) for a plain list. */
	readonly columns?: number;
	/** Items per page for PageUp/PageDown; default 10. */
	readonly page?: number;
}

/**
 * Map a key to an intent, honouring orientation and writing direction. Returns null for
 * keys the list does not own, so the caller does not preventDefault them (Tab, letters,
 * ArrowLeft in a vertical menu that a submenu wants, …).
 */
export function intentForKey(key: string, orientation: Orientation, dir: 'ltr' | 'rtl', grid: boolean): NavIntent | null {
	switch (key) {
		case 'Home':
			return 'first';
		case 'End':
			return 'last';
		case 'PageUp':
			return 'page-up';
		case 'PageDown':
			return 'page-down';
	}
	const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
	const backward = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
	if (grid) {
		if (key === 'ArrowDown') return 'down';
		if (key === 'ArrowUp') return 'up';
		if (key === forward) return 'next';
		if (key === backward) return 'prev';
		return null;
	}
	if (orientation !== 'horizontal') {
		if (key === 'ArrowDown') return 'next';
		if (key === 'ArrowUp') return 'prev';
	}
	if (orientation !== 'vertical') {
		if (key === forward) return 'next';
		if (key === backward) return 'prev';
	}
	return null;
}

/**
 * Next highlighted index, skipping disabled items. Returns `current` when nothing
 * enabled exists in that direction and `loop` is false; returns -1 only if every item
 * is disabled (or there are none).
 */
export function nextIndex(input: NavInput, intent: NavIntent): number {
	const { count, current, loop } = input;
	const disabled = input.disabled.slice(0, count);
	if (count <= 0 || firstEnabled(disabled) < 0) return -1;

	switch (intent) {
		case 'first':
			return firstEnabled(disabled, 0);
		case 'last':
			return firstEnabled(disabled, count - 1, true);
		case 'next':
		case 'prev': {
			const step = intent === 'next' ? 1 : -1;
			// From "nothing highlighted", next starts before the first item, prev after the last.
			let i = current < 0 ? (step > 0 ? -1 : count) : current;
			for (let n = 0; n < count; n++) {
				i += step;
				if (i >= count || i < 0) {
					if (!loop) return current;
					i = step > 0 ? 0 : count - 1;
				}
				if (!disabled[i]) return i;
			}
			return current;
		}
		case 'down':
		case 'up': {
			if (current < 0) return intent === 'down' ? firstEnabled(disabled, 0) : firstEnabled(disabled, count - 1, true);
			const columns = Math.max(1, input.columns ?? 1);
			const step = intent === 'down' ? columns : -columns;
			const column = current % columns;
			const lastInColumn = column + columns * Math.floor((count - 1 - column) / columns);
			let i = current;
			for (let n = 0; n < Math.ceil(count / columns); n++) {
				i += step;
				if (i >= count || i < 0) {
					if (!loop) return current;
					i = step > 0 ? column : lastInColumn;
				}
				if (i === current) return current;
				if (!disabled[i]) return i;
			}
			return current;
		}
		case 'page-down': {
			const target = Math.min(count - 1, Math.max(current, 0) + Math.max(1, input.page ?? 10));
			const ahead = firstEnabled(disabled, target);
			if (ahead >= 0) return ahead;
			return Math.max(firstEnabled(disabled, target, true), current);
		}
		case 'page-up': {
			const target = Math.max(0, Math.max(current, 0) - Math.max(1, input.page ?? 10));
			const behind = firstEnabled(disabled, target, true);
			if (behind >= 0) return behind;
			const after = firstEnabled(disabled, target);
			return current < 0 ? after : Math.min(after, current);
		}
	}
}

/** First enabled index at or after `from` (or at or before, when `backward`); -1 if none. */
export function firstEnabled(disabled: readonly boolean[], from = 0, backward = false): number {
	if (backward) {
		for (let i = Math.min(from, disabled.length - 1); i >= 0; i--) if (!disabled[i]) return i;
		return -1;
	}
	for (let i = Math.max(0, from); i < disabled.length; i++) if (!disabled[i]) return i;
	return -1;
}
