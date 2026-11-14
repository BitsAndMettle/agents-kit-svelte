/**
 * Types shared by every Settings group. A leaf: type-only imports, so node tests can load it.
 * Each component's `XLabels` type stays with its component.
 */
import type { Component } from 'svelte';
import type { UiTone } from '../../ui/styles';
import type { TimeInput } from '../../core/time';
import type { FormResult } from '../../primitives/form/submit.svelte';

/** Where a setting's change stands. The same five words everywhere. */
export type SettingStatus = 'idle' | 'pending' | 'saved' | 'error' | 'conflict';

/** Why something cannot be changed. `pickLock` orders them (strongest first: readonly, permission, managed, inherited, plan, awaiting-approval, unsupported). */
export type LockKind = 'permission' | 'plan' | 'managed' | 'inherited' | 'readonly' | 'unsupported' | 'awaiting-approval';

/** An icon component, such as one from `@lucide/svelte`. Rendered with `class` only. */
export type SettingsIcon = Component<{ class?: string }>;

/**
 * One action a settings surface offers: a link, a callback, or a form intent. Render it with
 * `actionButtonProps` so every group draws it the same way.
 */
export interface SettingsAction {
	label: string;
	/** Accessible name when the visible label is not enough ("Remove Ada"). */
	ariaLabel?: string;
	/** Makes it a link (works without JavaScript). */
	href?: string;
	/** Called on click; a returned promise makes the owning button load until it settles. */
	onSelect?: () => unknown;
	/** Inside a form: the button posts `name="intent" value={intent}`. */
	intent?: string;
	tone?: 'default' | 'accent' | 'danger';
	/** Opens in a new tab (`target="_blank" rel="noopener noreferrer"`). */
	external?: boolean;
	/** Why the action is unavailable now. Visible text; the button is softDisabled and described by it, never a dead link. */
	unavailable?: string;
}

/** Why a setting cannot be changed, and an optional way forward. */
export interface SettingLock {
	kind: LockKind;
	/** The sentence shown. Defaults to the kind's sentence (`LOCK_LABELS`, or the component's labels). */
	reason?: string;
	/** Who or what holds the lock ("by your administrator"). */
	source?: string;
	/** Short text shown in place of the control, e.g. "Always on". */
	badge?: string;
	/** A way forward: request access, upgrade, open the managing place. */
	action?: SettingsAction;
}

/** One link in the settings navigation. */
export interface SettingsLink {
	id: string;
	label: string;
	href: string;
	icon?: SettingsIcon;
	group?: string;
	description?: string;
	/** A short trailing line in the index variant ("3 members"). */
	meta?: string;
	/** Extra words the filter matches. */
	keywords?: string[];
	badge?: string | number;
	badgeTone?: UiTone;
	/** Has unsaved changes (a dot plus screen-reader text). */
	dirty?: boolean;
	/** Shows a lock mark. */
	lock?: LockKind;
	/** Why the link is unavailable; rendered as non-focusable text plus this reason. */
	disabled?: string;
}

/** A group of links in the settings navigation. */
export interface SettingsNavGroup {
	id: string;
	label?: string;
	description?: string;
	items: SettingsLink[];
}

/** One searchable setting (a row, not just a section). `href` deep-links to the row anchor. */
export interface SettingsSearchEntry {
	id: string;
	label: string;
	/** The section it lives in, shown with the result. */
	section: string;
	href: string;
	description?: string;
	keywords?: string[];
	icon?: SettingsIcon;
}

/** How a staged field is named and shown in change summaries. */
export interface SettingsFieldDescriptor {
	/** The control's form `name`. */
	name: string;
	/** Shown in change summaries ("Retention: 30 days → 90 days"). */
	label: string;
	/** Turns the raw value(s) into display text; default: option or label text, else the value. */
	format?: (raw: string | string[]) => string;
}

/** One staged change, from the saved value to the draft. */
export interface SettingsChange {
	name: string;
	label: string;
	from?: string;
	to: string;
}

/** One field in an edit conflict: what you set against what someone else saved. */
export interface ConflictField {
	name: string;
	label: string;
	mine: string;
	theirs: string;
	/** Both can be kept (a list merge). */
	allowBoth?: boolean;
	/** Why Both is not offered, shown when `allowBoth` is false. */
	bothReason?: string;
}

/** A stale-revision save. The draft is kept. */
export interface SettingsConflict {
	message?: string;
	reviewHref?: string;
	/** The latest revision, to resubmit against. */
	revision?: string | number;
	fields?: ConflictField[];
	changedBy?: { name: string; at: TimeInput };
}

/** What a settings handler can hand back: field and form errors, a conflict, a notice, an undo token. */
export type SettingsResult<F extends string = string> = FormResult<F> & {
	conflict?: SettingsConflict;
	notice?: string;
	undoToken?: string | number;
};

/** Any settings callback: return nothing, a `SettingsResult`, or a promise of either. */
export type SettingsHandler<A extends unknown[], F extends string = string> = (
	...args: A
) => void | SettingsResult<F> | Promise<void | SettingsResult<F>>;

/** One effect of a confirmed action. The tone is spoken (an sr-only prefix), never colour alone. */
export interface ConsequenceItem {
	id?: string;
	tone: 'ok' | 'no' | 'warn' | 'info';
	label: string;
	description?: string;
	/** A short fact on the right ("2.4 GB"). */
	aside?: string;
}

/** A titled list of effects ("What changes", "What stays"). */
export interface ConsequenceGroup {
	label: string;
	items: ConsequenceItem[];
}

/** One choice in a reassignment list. */
export interface ReassignOption {
	value: string;
	label: string;
	disabled?: boolean;
}

/** Things that need a new owner before a confirmed action ("Who takes over these?"). */
export interface ReassignSpec {
	label: string;
	description?: string;
	/** Field name prefix; each dependent posts `${name}.${id}`. Default 'reassign'. */
	name?: string;
	dependents: { id: string; label: string; description?: string; tag?: string }[];
	options: ReassignOption[] | ((id: string) => ReassignOption[]);
	defaultFor?: (id: string) => string;
	summary?: (value: Record<string, string>) => string;
}

/** One "needs attention" item. */
export interface AttentionItem {
	id: string;
	tone: 'warning' | 'accent' | 'danger' | 'neutral';
	icon?: SettingsIcon;
	label: string;
	description?: string;
	action: { label: string; href?: string; onSelect?: () => unknown };
	dismissible?: boolean;
}

/** One option of a single choice (cards, rows or segmented). */
export interface ChoiceOption {
	value: string;
	label: string;
	description?: string;
	icon?: SettingsIcon;
	badge?: string;
	disabled?: boolean;
	lock?: SettingLock;
}

/** One read-only fact. */
export interface SettingsFact {
	id: string;
	label: string;
	value: string;
	/** Shorter value for narrow containers. */
	compactValue?: string;
	mono?: boolean;
	tone?: UiTone;
	detail?: string;
	/** "Managed elsewhere" caption ("Set by provider"). */
	source?: string;
	/** Offer a copy button: `true` copies `value`, a string copies that instead. */
	copy?: boolean | string;
	action?: SettingsAction;
}

/** One thing in a managed list (a member, device, key, destination). */
export interface SettingsItem {
	id: string;
	label: string;
	description?: string;
	meta?: string[];
	icon?: SettingsIcon;
	avatar?: { name: string; src?: string };
	badges?: { label: string; tone?: UiTone }[];
	status?: { label: string; tone?: UiTone };
	/** This is you, or this device. */
	current?: boolean;
	/** Id of a sub-group the item is listed under. */
	group?: string;
	href?: string;
	mono?: boolean;
	isNew?: boolean;
	lock?: SettingLock;
}

/** One row action in a managed list. */
export interface SettingsItemAction {
	id: string;
	label: string;
	ariaLabel?: string;
	tone?: 'default' | 'danger';
	href?: string;
	unavailable?: string;
	/** Ask first (an AlertDialog) before reporting the action. */
	confirm?: { title: string; description: string; confirmLabel?: string };
}

/** One part of a stacked usage meter. */
export interface MeterSegment {
	id: string;
	label: string;
	value: number;
	tone?: UiTone | 'muted';
}
