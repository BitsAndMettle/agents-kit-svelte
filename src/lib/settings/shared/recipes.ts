/**
 * Class recipes and layout constants every Settings group uses, on semantic tokens only. A leaf.
 *
 * Tailwind only generates classes it finds written out in full, so container-query classes are
 * written literally in components (`@lg/settings:flex-row`), never built from `CQ` at runtime.
 * `CQ` names the only two breakpoints those classes may use; `tests/settings-shared.test.ts`
 * enforces it over every settings component.
 */
import type { SettingsAction } from './types';

/** The settings container: put it on SettingsLayout's root (or any standalone settings surface). Inline-size container named `settings`. */
export const SETTINGS_CONTAINER = '@container/settings';

/**
 * The one breakpoint set, as Tailwind container variants of the `settings` container. Prefix
 * with `@max-` for "below": `@max-lg/settings:`.
 *
 * - `row` (32rem): rows go inline (label left, control right) and facts sit side by side; below, everything stacks.
 * - `wide` (48rem): the rail shows beside the page, asides sit beside their card, columns go side by side; below, index or section mode and sheets.
 */
export const CQ = {
	row: '@lg/settings',
	wide: '@3xl/settings'
} as const;

/** Shared class recipes. Compose with `cn()`; your `class` goes last. */
export const RECIPES = {
	/** A section card. */
	section: 'min-w-0 overflow-hidden rounded-card border border-card-border bg-card-bg',
	/** The section header band: title, description, count, status, actions. */
	sectionHeader: 'flex flex-wrap items-start gap-x-3 gap-y-1 border-b border-canvas-border px-4 py-3',
	/** The footer strip (a SaveBar footer, an add row). */
	sectionFooter: 'flex flex-wrap items-center gap-2 border-t border-canvas-border px-4 py-2.5 text-xs text-fg-light',
	/** Added to `section` for a danger zone (placed last on the page). */
	danger: 'border-status-danger/40',
	/** The flush `<ul role="list">` inside a section. */
	list: 'm-0 flex list-none flex-col p-0',
	/** One `<li>` row: stacked below `CQ.row`, inline from it, divided from the row above. */
	row: 'relative flex min-w-0 flex-col gap-2 border-t border-canvas-border px-4 py-3 first:border-t-0 @lg/settings:flex-row @lg/settings:items-center @lg/settings:justify-between @lg/settings:gap-6',
	/** Added to `row` while it has an unsaved change: accent tint and an inset accent bar. */
	rowStaged: 'bg-accent-subtle/60 shadow-[inset_3px_0_0_var(--color-accent-primary)]',
	/** A quiet note or footnote line with a leading icon. */
	note: 'flex items-start gap-2 text-xs leading-5 text-fg-light [&_svg]:mt-0.5 [&_svg]:size-3.5 [&_svg]:shrink-0',
	/** A square icon tile (page header, index rows, attention items). */
	iconTile: 'inline-flex size-8 shrink-0 items-center justify-center rounded-control bg-canvas-secondary text-fg-main [&_svg]:size-4'
} as const;

/** Props for the kit `Button` that draw one `SettingsAction`. */
export interface SettingsActionButtonProps {
	href?: string;
	target?: '_blank';
	rel?: 'noopener noreferrer';
	type?: 'button' | 'submit';
	name?: 'intent';
	value?: string;
	variant: 'secondary' | 'accent' | 'danger';
	softDisabled?: true;
	'aria-label'?: string;
	'aria-describedby'?: string;
}

/** Where an action button stands, for `actionButtonProps`. */
export interface SettingsActionButtonOptions {
	/**
	 * False until the page is interactive (a `ReadyGate`, or `getSettingsScope()?.ready()`).
	 * Default true. Pass it from every component: a handler-only action does nothing before then.
	 */
	ready?: boolean;
	/**
	 * Whether the button sits in a form that posts its `intent` (its own, or the SettingsForm it is
	 * inside). Default true. False makes an `intent` action a handler action: without a form there
	 * is nothing to post.
	 */
	inForm?: boolean;
}

/**
 * Turns a `SettingsAction` into `Button` props, so every group renders actions the same way:
 *
 * - `href` makes a link (with `target`/`rel` when `external`).
 * - `intent` inside a form makes a submit button posting `name="intent" value={intent}`, which
 *   works without JavaScript.
 * - `unavailable` drops the link and makes it `softDisabled` (focusable, announced as unavailable),
 *   described by `reasonId`, which must point at the visible reason text. Never a dead `<a>`.
 * - Anything else only works through `onSelect`: a `type="button"`, `softDisabled` until `ready`
 *   (it would do nothing without JavaScript, and a click before hydration would be lost), and
 *   for good when there is no `onSelect` to call. That includes an `intent` outside a form.
 * - `tone` picks the variant.
 *
 * `onSelect` is not included: wire `onclick` yourself so the button can show `loading` while a
 * returned promise settles (`isThenable`).
 */
export function actionButtonProps(action: SettingsAction, reasonId?: string, options: SettingsActionButtonOptions = {}): SettingsActionButtonProps {
	const variant = action.tone === 'danger' ? 'danger' : action.tone === 'accent' ? 'accent' : 'secondary';
	const props: SettingsActionButtonProps = { variant };
	if (action.ariaLabel) props['aria-label'] = action.ariaLabel;
	if (action.unavailable) {
		props.softDisabled = true;
		props.type = 'button';
		if (reasonId) props['aria-describedby'] = reasonId;
		return props;
	}
	if (action.href !== undefined) {
		props.href = action.href;
		if (action.external) {
			props.target = '_blank';
			props.rel = 'noopener noreferrer';
		}
		return props;
	}
	if (action.intent !== undefined && options.inForm !== false) {
		props.type = 'submit';
		props.name = 'intent';
		props.value = action.intent;
		return props;
	}
	props.type = 'button';
	if (options.ready === false || action.onSelect === undefined) props.softDisabled = true;
	return props;
}
