import { dayTime } from '../core/time';
import type { BurnPoint } from '../charts/types';
import type { AccountUsage, AccountUsageStatus, UsageWindow } from '../types';
import type { UiTone } from '../ui/styles';

/** The kit tone each account status is drawn in. */
export const USAGE_TONE: Record<AccountUsageStatus, UiTone> = {
	available: 'success',
	low: 'warning',
	switched: 'info',
	out: 'neutral',
	off: 'neutral'
};

const WINDOW_HOURS = { fiveHour: 5, week: 168 } as const;
const HOUR = 3_600_000;

/** Whether the account can still take work: every status but `out` and `off`. */
export function usageFree(account: AccountUsage): boolean {
	return account.status !== 'out' && account.status !== 'off';
}

/** The window nearest its limit, which is the one that decides when the account is back. */
export function usageWindow(account: AccountUsage): UsageWindow | undefined {
	const { fiveHour, week } = account.windows;
	return fiveHour && week ? (fiveHour.used >= week.used ? fiveHour : week) : (fiveHour ?? week);
}

/** The account's status in a few words: "39% left · Thu 20:00", "Past the 98% switch point", "Out until Mon 18:20", "Off". */
export function usageText(account: AccountUsage, timeZone = 'UTC'): string {
	const window = usageWindow(account);
	const when = window ? dayTime(window.resetsAt, timeZone) : '';
	switch (account.status) {
		case 'off':
			return 'Off';
		case 'out':
			return when ? `Out until ${when}` : 'Out';
		case 'switched':
			return account.switchAt === undefined ? 'Past the switch point' : `Past the ${account.switchAt}% switch point`;
		default:
			return window ? `${Math.max(0, 100 - window.used)}% left · ${when}` : 'Not read yet';
	}
}

/**
 * `TokenBurnChart` props for one window from a single reading: the line runs from the window's start to the
 * reading, the projection carries the average rate since the start on to the reset, and the switch point is the
 * budget line. Time is in hours since the window began. Undefined when the window was never read.
 */
export function usageBurn(account: AccountUsage, key: keyof AccountUsage['windows'], timeZone = 'UTC') {
	const window = account.windows[key];
	const hours = WINDOW_HOURS[key];
	if (!window || account.at === undefined) return undefined;
	const start = window.resetsAt - hours * HOUR;
	const points: BurnPoint[] = [
		{ t: 0, spent: 0 },
		{ t: Math.min(hours, Math.max(0, (account.at - start) / HOUR)), spent: window.used }
	];
	return {
		points,
		end: hours,
		budget: account.switchAt,
		budgetLabel: 'Switch point',
		budgetShare: false,
		unit: '',
		formatValue: (v: number) => `${Math.round(v)}%`,
		formatTime: (t: number) => dayTime(start + t * HOUR, timeZone),
		rateScale: key === 'week' ? 24 : 1,
		rateLabel: key === 'week' ? '%/day' : '%/h'
	};
}
