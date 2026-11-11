import type { Machine, MachinePresence, MachineWork } from '../types';

/** Most segments drawn for one machine; beyond this the bar scales down. */
export const MAX_SEGMENTS = 24;

/** Work rows shown under a machine before "+N more". */
export const WORK_PREVIEW = 3;

export interface FleetSummary {
	busy: number;
	total: number;
	machines: number;
	online: number;
	stale: number;
	offline: number;
}

/** Keeps `used` within `0..total`, both whole numbers. */
export function clampSlots(slots: { used: number; total: number }): { used: number; total: number } {
	const total = Math.max(0, Math.floor(slots.total) || 0);
	const used = Math.min(total, Math.max(0, Math.floor(slots.used) || 0));
	return { used, total };
}

/** Busy slots of total, and machines per presence. */
export function fleetSummary(machines: Machine[]): FleetSummary {
	const s: FleetSummary = { busy: 0, total: 0, machines: machines.length, online: 0, stale: 0, offline: 0 };
	for (const m of machines) {
		s[m.presence]++;
		const { used, total } = clampSlots(m.slots);
		s.busy += used;
		s.total += total;
	}
	return s;
}

/** One entry per slot: `busy` first, then `free`. Capped at `MAX_SEGMENTS`, keeping the proportion. */
export function slotSegments(slots: { used: number; total: number }): ('busy' | 'free')[] {
	const { used, total } = clampSlots(slots);
	if (total <= MAX_SEGMENTS) return Array.from({ length: total }, (_, i) => (i < used ? 'busy' : 'free'));
	const busy = used === 0 ? 0 : Math.max(1, Math.round((used / total) * MAX_SEGMENTS));
	return Array.from({ length: MAX_SEGMENTS }, (_, i) => (i < busy ? 'busy' : 'free'));
}

/** The first `limit` items and how many are hidden. */
export function workPreview(work: MachineWork[], limit = WORK_PREVIEW): { shown: MachineWork[]; more: number } {
	return { shown: work.slice(0, limit), more: Math.max(0, work.length - limit) };
}

export const PRESENCE_LABEL: Record<MachinePresence, string> = {
	online: 'Online',
	stale: 'Stale',
	offline: 'Offline'
};
