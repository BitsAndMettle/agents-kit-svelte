/**
 * Neutral sample data for the Settings collection: a fictional team called "Northwind Studio".
 * For demos, docs and tests only. Plain data with type-only imports (no icons), so node tests can
 * load it; demos add icons themselves.
 */
import type {
	AttentionItem,
	ChoiceOption,
	ConflictField,
	ConsequenceGroup,
	MeterSegment,
	SettingsFact,
	SettingsFieldDescriptor,
	SettingsItem,
	SettingsNavGroup,
	SettingsSearchEntry
} from '../settings/shared/types';

/** Navigation for a sample settings area, in two groups. */
export const SAMPLE_SETTINGS_NAV: SettingsNavGroup[] = [
	{
		id: 'account',
		label: 'Account',
		items: [
			{ id: 'profile', label: 'Profile', href: '/settings/profile', description: 'Your name, photo and contact email.', keywords: ['name', 'avatar'] },
			{ id: 'notifications', label: 'Notifications', href: '/settings/notifications', description: 'What we tell you about, and where.', badge: 2 },
			{ id: 'appearance', label: 'Appearance', href: '/settings/appearance', description: 'Theme, density and motion.', keywords: ['dark mode', 'theme'] }
		]
	},
	{
		id: 'team',
		label: 'Team',
		items: [
			{ id: 'general', label: 'General', href: '/settings/general', description: 'Team name and address.', dirty: true },
			{ id: 'members', label: 'Members', href: '/settings/members', description: 'Who has access, and their roles.', meta: '6 members' },
			{ id: 'data', label: 'Data', href: '/settings/data', description: 'Retention, exports and deletion.', keywords: ['privacy', 'retention'] },
			{ id: 'billing', label: 'Billing', href: '/settings/billing', description: 'Plan, seats and invoices.', lock: 'permission' },
			{ id: 'security', label: 'Security', href: '/settings/security', description: 'Sign-in rules and sessions.', disabled: 'Available on the Business plan.' }
		]
	}
];

/** One search entry per setting (row-level, with anchors). */
export const SAMPLE_SETTINGS_SEARCH: SettingsSearchEntry[] = [
	{ id: 'display-name', label: 'Display name', section: 'Profile', href: '/settings/profile#display-name', keywords: ['name'] },
	{ id: 'contact-email', label: 'Contact email', section: 'Profile', href: '/settings/profile#contact-email', keywords: ['address', 'mail'] },
	{ id: 'email-digest', label: 'Email digest', section: 'Notifications', href: '/settings/notifications#email-digest', description: 'A summary once a day.' },
	{ id: 'theme', label: 'Theme', section: 'Appearance', href: '/settings/appearance#theme', keywords: ['dark mode', 'light mode'] },
	{ id: 'reduce-motion', label: 'Reduce motion', section: 'Appearance', href: '/settings/appearance#reduce-motion', description: 'Fewer animations.' },
	{ id: 'team-name', label: 'Team name', section: 'General', href: '/settings/general#team-name' },
	{ id: 'retention', label: 'Data retention', section: 'Data', href: '/settings/data#retention', description: 'How long activity is kept before it is deleted.', keywords: ['history', 'privacy'] },
	{ id: 'export', label: 'Export data', section: 'Data', href: '/settings/data#export', description: 'Download everything as a zip file.' },
	{ id: 'resume', label: 'Résumé visibility', section: 'Profile', href: '/settings/profile#resume', description: 'Who can see your résumé.' },
	{ id: 'seats', label: 'Seats', section: 'Billing', href: '/settings/billing#seats', keywords: ['members', 'licences'] }
];

/** Staged fields of the sample "General" form. */
export const SAMPLE_SETTINGS_FIELDS: SettingsFieldDescriptor[] = [
	{ name: 'teamName', label: 'Team name' },
	{ name: 'retention', label: 'Data retention' },
	{ name: 'digest', label: 'Email digest' },
	{ name: 'channels', label: 'Channels' }
];

/** Saved values of the sample "General" form. */
export const SAMPLE_SETTINGS_SAVED = { teamName: 'Northwind Studio', retention: '90', digest: true, channels: ['email'] };

/** Retention choices. */
export const SAMPLE_RETENTION_OPTIONS: ChoiceOption[] = [
	{ value: '30', label: '30 days' },
	{ value: '90', label: '90 days', description: 'Recommended.' },
	{ value: '365', label: '1 year' },
	{ value: 'forever', label: 'Forever', lock: { kind: 'plan', reason: 'Available on the Business plan.' } }
];

/** Theme choices. */
export const SAMPLE_THEME_OPTIONS: ChoiceOption[] = [
	{ value: 'system', label: 'System', description: 'Follows your device.' },
	{ value: 'light', label: 'Light' },
	{ value: 'dark', label: 'Dark' }
];

/** Read-only facts about a sample connection. */
export const SAMPLE_SETTINGS_FACTS: SettingsFact[] = [
	{ id: 'status', label: 'Status', value: 'Connected', tone: 'success' },
	{ id: 'team-id', label: 'Team ID', value: 'tm_8f3k2q9x', mono: true, copy: true },
	{ id: 'region', label: 'Region', value: 'Frankfurt', source: 'Set by your administrator' },
	{ id: 'version', label: 'Version', value: '4.12.0', mono: true, detail: 'Released 3 days ago' }
];

/** Members of the sample team, plus one pending invite. */
export const SAMPLE_SETTINGS_MEMBERS: SettingsItem[] = [
	{ id: 'm1', label: 'Ada Park', description: 'ada@northwind.example', avatar: { name: 'Ada Park' }, badges: [{ label: 'Owner', tone: 'accent' }], current: true, lock: { kind: 'permission', reason: 'Owners cannot remove themselves.' } },
	{ id: 'm2', label: 'Ben Ortiz', description: 'ben@northwind.example', avatar: { name: 'Ben Ortiz' }, meta: ['Admin', 'Joined May 2026'] },
	{ id: 'm3', label: 'Chloé Martin', description: 'chloe@northwind.example', avatar: { name: 'Chloé Martin' }, meta: ['Member'] },
	{ id: 'm4', label: 'Dev Rao', description: 'dev@northwind.example', avatar: { name: 'Dev Rao' }, meta: ['Member'], status: { label: 'Away', tone: 'warning' } },
	{ id: 'i1', label: 'erin@northwind.example', group: 'invited', meta: ['Invited 2 days ago'], isNew: true }
];

/** What deleting the sample team does. */
export const SAMPLE_CONSEQUENCES: ConsequenceGroup[] = [
	{
		label: 'What happens',
		items: [
			{ tone: 'no', label: 'All documents and their history are deleted', aside: '2.4 GB' },
			{ tone: 'no', label: '6 members lose access' },
			{ tone: 'warn', label: 'Open invites stop working' }
		]
	},
	{
		label: 'What stays',
		items: [
			{ tone: 'ok', label: 'Invoices remain available to the billing contact' },
			{ tone: 'info', label: 'Exports you already downloaded are yours to keep' }
		]
	}
];

/** Things in the sample area that need attention. */
export const SAMPLE_ATTENTION: AttentionItem[] = [
	{ id: 'unsaved', tone: 'accent', label: 'Unsaved changes in General', description: '2 changes are not saved yet.', action: { label: 'Review', href: '/settings/general' } },
	{ id: 'seats', tone: 'warning', label: 'Almost out of seats', description: '42 of 50 seats used.', action: { label: 'Add seats', href: '/settings/billing#seats' }, dismissible: true },
	{ id: 'email', tone: 'neutral', label: 'Confirm your contact email', action: { label: 'Send link', href: '/settings/profile#contact-email' }, dismissible: true }
];

/** A stale save: someone else changed two fields. */
export const SAMPLE_CONFLICT_FIELDS: ConflictField[] = [
	{ name: 'teamName', label: 'Team name', mine: 'Northwind Design', theirs: 'Northwind Studio Ltd' },
	{ name: 'channels', label: 'Channels', mine: 'Email, Chat', theirs: 'Email, Phone', allowBoth: true },
	{ name: 'retention', label: 'Data retention', mine: '30 days', theirs: '1 year', allowBoth: false, bothReason: 'Only one retention period can apply.' }
];

/** Storage use, by kind. */
export const SAMPLE_STORAGE_SEGMENTS: MeterSegment[] = [
	{ id: 'files', label: 'Files', value: 18.2, tone: 'accent' },
	{ id: 'history', label: 'History', value: 6.4, tone: 'neutral' },
	{ id: 'cache', label: 'Cache', value: 3.1, tone: 'muted' }
];
