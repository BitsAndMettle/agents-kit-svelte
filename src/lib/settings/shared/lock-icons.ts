import { Ban, Building2, CornerLeftUp, Eye, Gem, Hourglass, Lock } from '@lucide/svelte';
import type { LockKind, SettingsIcon } from './types';

/** One icon per lock kind. Decorative: the reason text says what the lock means. */
export const LOCK_ICONS: Record<LockKind, SettingsIcon> = {
	permission: Lock,
	plan: Gem,
	managed: Building2,
	inherited: CornerLeftUp,
	readonly: Eye,
	unsupported: Ban,
	'awaiting-approval': Hourglass
};
