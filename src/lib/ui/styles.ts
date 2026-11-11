/**
 * Shared class recipes for the Agents Kit Svelte visual language.
 *
 * A soft, warm foundation: pill buttons and tabs, warm hairlines, generous card and
 * window radii, diffuse shadows, slim progress tracks and 14–16px Lucide icons. Components compose these strings so
 * every collection shares one look without a parallel component layer.
 */

export type UiTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon-xs' | 'icon-sm' | 'icon';

const BUTTON_CORE =
	'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0';
const BUTTON_BASE = `${BUTTON_CORE} rounded-full`;

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
	primary: 'bg-fg-main text-fg-inverse hover:bg-fg-main/85',
	accent: 'bg-accent-primary text-white hover:bg-accent-primary/90',
	secondary:
		'border border-card-border bg-card-bg text-fg-main ak-shadow-btn hover:bg-canvas-primary',
	ghost: 'text-fg-light hover:bg-canvas-secondary hover:text-fg-main',
	danger:
		'border border-card-border bg-card-bg text-status-danger ak-shadow-btn hover:bg-status-danger-subtle'
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
	xs: 'h-6 px-2.5 text-xs [&_svg]:size-3',
	sm: 'h-7 px-3 text-xs [&_svg]:size-3.5',
	md: 'h-8 px-3.5 text-[13px] [&_svg]:size-3.5',
	lg: 'h-10 px-5 text-sm [&_svg]:size-4',
	'icon-xs': 'size-6 [&_svg]:size-3.5',
	'icon-sm': 'size-7 [&_svg]:size-3.5',
	icon: 'size-8 [&_svg]:size-4'
};

/**
 * Builds the class list for a button or button-like link.
 *
 * @param variant - Visual weight (default `secondary`).
 * @param size - Height and padding preset (default `sm`).
 * @param extra - Additional classes appended last.
 * @returns Space-separated class string.
 */
export function buttonClass(
	variant: ButtonVariant = 'secondary',
	size: ButtonSize = 'sm',
	extra = ''
): string {
	return `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${extra}`.trim();
}

/**
 * Touch target extender. On a coarse pointer (touch), an invisible `::after` grows to at least
 * 44 by 44px, centred on the element, so small controls are easy to hit; the visible face and the
 * fine-pointer (mouse) layout do not change. The pseudo-element is positioned against the nearest
 * positioned ancestor: put it on a `relative` element, or on a native input whose wrapper is
 * `relative` and the same size as the face. Overlapping neighbours win where they cover it.
 */
export const TOUCH_TARGET_CLASS =
	'pointer-coarse:after:absolute pointer-coarse:after:top-1/2 pointer-coarse:after:left-1/2 pointer-coarse:after:h-[max(100%,44px)] pointer-coarse:after:w-[max(100%,44px)] pointer-coarse:after:-translate-x-1/2 pointer-coarse:after:-translate-y-1/2';

/** Plain colored text for status labels ("Running", "Failed"), as upstream uses. */
export const STATUS_TEXT_CLASS: Record<UiTone, string> = {
	neutral: 'text-fg-light',
	accent: 'text-accent-primary',
	success: 'text-status-success',
	warning: 'text-status-warning',
	danger: 'text-status-danger'
};

const BADGE_TONES: Record<UiTone, string> = {
	neutral: 'bg-canvas-secondary text-fg-light',
	accent: 'bg-accent-subtle text-accent-primary',
	success: 'bg-status-success-subtle text-status-success',
	warning: 'bg-status-warning-subtle text-status-warning',
	danger: 'bg-status-danger-subtle text-status-danger'
};

/**
 * Builds the class list for a compact chip/badge.
 *
 * @param tone - Semantic tone (default `neutral`).
 * @param extra - Additional classes appended last.
 * @returns Space-separated class string.
 */
export function badgeClass(tone: UiTone = 'neutral', extra = ''): string {
	return `inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-px text-[11px] font-medium leading-4 whitespace-nowrap [&_svg]:size-3 ${BADGE_TONES[tone]} ${extra}`.trim();
}

/** Background fill per tone for status dots and progress fills. */
export const TONE_FILL_CLASS: Record<UiTone, string> = {
	neutral: 'bg-fg-light',
	accent: 'bg-accent-primary',
	success: 'bg-status-success',
	warning: 'bg-status-warning',
	danger: 'bg-status-danger'
};

/** Slim 6px progress track. Pair with `progressFillClass`. */
export const PROGRESS_TRACK_CLASS = 'h-1.5 overflow-hidden rounded-full bg-canvas-secondary';

/**
 * Builds the class list for a progress fill inside `PROGRESS_TRACK_CLASS`.
 *
 * @param tone - Semantic tone (default `accent`).
 * @returns Space-separated class string.
 */
export function progressFillClass(tone: UiTone = 'accent'): string {
	return `block h-full rounded-full transition-[width] duration-300 ease-out ${TONE_FILL_CLASS[tone]}`;
}

/** Card surface, section header/footer bands and typographic roles. */
export const SURFACE = {
	card: 'overflow-hidden rounded-card border border-card-border bg-card-bg',
	window: 'overflow-hidden rounded-window border border-card-border bg-card-bg',
	header: 'border-b border-canvas-border px-4 py-3',
	footer: 'border-t border-canvas-border px-4 py-2.5 text-xs text-fg-light',
	inset: 'rounded-control bg-canvas-secondary',
	eyebrow: 'text-xs font-medium text-fg-light',
	title: 'text-sm font-semibold text-fg-main',
	heading: 'text-base font-semibold tracking-[-0.01em] text-fg-main',
	description: 'text-xs leading-5 text-fg-light'
} as const;

/** Text input / select / textarea recipe. */
export const INPUT_CLASS =
	'h-8 w-full rounded-control border border-card-border bg-card-bg px-3 text-[13px] text-fg-main placeholder:text-fg-light transition-[border-color,box-shadow] focus:border-accent-primary/50 focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-accent-primary)_14%,transparent)] focus:outline-none';

/**
 * Builds the class list for a segmented/tab trigger.
 *
 * @param active - Whether this trigger is selected.
 * @returns Space-separated class string.
 */
export function segmentClass(active: boolean): string {
	return `inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors [&_svg]:size-3.5 ${
		active
			? 'bg-card-bg text-fg-main ak-shadow-btn'
			: 'text-fg-light hover:text-fg-main'
	}`;
}

/** Container for `segmentClass` triggers. */
export const SEGMENT_GROUP_CLASS = 'inline-flex items-center gap-0.5 rounded-full bg-canvas-secondary p-0.5';

/**
 * Builds the class list for a ghost toggle button (toolbar, feedback, filters).
 *
 * @param active - Whether the toggle is on.
 * @param size - Height and padding preset (default `sm`).
 * @param extra - Additional classes appended last.
 * @returns Space-separated class string.
 */
export function toggleButtonClass(active: boolean, size: ButtonSize = 'sm', extra = ''): string {
	return `${BUTTON_BASE} ${BUTTON_SIZES[size]} ${
		active ? 'bg-canvas-secondary text-fg-main' : 'text-fg-light hover:bg-canvas-secondary hover:text-fg-main'
	} ${extra}`.trim();
}

/**
 * Soft chat language: warm paper surfaces, pill controls and diffuse shadows,
 * used by the conversation components (composer, messages, tool cards).
 */
export const SOFT = {
	card: 'overflow-hidden rounded-soft border border-chat-border bg-card-bg ak-shadow-soft-sm',
	panel: 'rounded-[12px] bg-chat-surface',
	header: 'px-4 pt-3.5 pb-3',
	footer: 'border-t border-chat-border/70 bg-chat-surface/60 px-4 py-3',
	chip: 'inline-flex items-center gap-1.5 rounded-full bg-chat-user px-2.5 py-0.5 text-xs text-fg-main [&_svg]:size-3',
	avatar:
		'inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-chat-accent-subtle text-chat-accent [&_svg]:size-3.5'
} as const;

const PILL_VARIANTS: Record<ButtonVariant, string> = {
	primary: 'bg-fg-main text-fg-inverse hover:bg-fg-main/85',
	accent: 'bg-chat-accent text-white hover:bg-chat-accent/90',
	secondary: 'border border-chat-border bg-card-bg text-fg-main hover:bg-chat-surface',
	ghost: 'text-fg-light hover:bg-chat-user/70 hover:text-fg-main',
	danger: 'border border-chat-border bg-card-bg text-status-danger hover:bg-status-danger-subtle'
};

const PILL_SIZES: Record<ButtonSize, string> = {
	xs: 'h-6 px-2.5 text-xs [&_svg]:size-3',
	sm: 'h-7 px-3 text-xs [&_svg]:size-3.5',
	md: 'h-8 px-3.5 text-[13px] [&_svg]:size-3.5',
	lg: 'h-10 px-5 text-sm [&_svg]:size-4',
	'icon-xs': 'size-6 [&_svg]:size-3.5',
	'icon-sm': 'size-7 [&_svg]:size-3.5',
	icon: 'size-8 [&_svg]:size-4'
};

/**
 * Builds the class list for a fully rounded "pill" button in the soft chat style.
 *
 * @param variant - Visual weight (default `secondary`).
 * @param size - Height and padding preset (default `sm`).
 * @param extra - Additional classes appended last.
 * @returns Space-separated class string.
 */
export function pillClass(
	variant: ButtonVariant = 'secondary',
	size: ButtonSize = 'sm',
	extra = ''
): string {
	return `${BUTTON_CORE} rounded-full ${PILL_VARIANTS[variant]} ${PILL_SIZES[size]} ${extra}`.trim();
}

/**
 * Builds the class list for a soft pill toggle (feedback, filters inside chat).
 *
 * @param active - Whether the toggle is on.
 * @param size - Height and padding preset (default `sm`).
 * @param extra - Additional classes appended last.
 * @returns Space-separated class string.
 */
export function togglePillClass(active: boolean, size: ButtonSize = 'sm', extra = ''): string {
	return `${BUTTON_CORE} rounded-full ${PILL_SIZES[size]} ${
		active ? 'bg-chat-user text-fg-main' : 'text-fg-light hover:bg-chat-user/70 hover:text-fg-main'
	} ${extra}`.trim();
}
