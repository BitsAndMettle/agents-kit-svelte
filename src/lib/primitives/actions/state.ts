/** The state that decides how one action element is marked up. */
export interface ActionState {
	disabled: boolean;
	loading: boolean;
	href: string | undefined;
	/** Disabled for now but still focusable (a wait, e.g. a resend cooldown): marked with aria-disabled, never `disabled`, so keyboard focus stays put. */
	softDisabled?: boolean;
}

/** The attributes one action element gets for its disabled and loading state. */
export function actionAttrs({ disabled, loading, href, softDisabled = false }: ActionState): Record<string, string | boolean | undefined> {
	if (href === undefined) {
		return {
			disabled: disabled || undefined,
			'aria-disabled': (loading || softDisabled) && !disabled ? 'true' : undefined,
			'aria-busy': loading || undefined,
			'data-loading': loading || undefined
		};
	}
	return {
		// A disabled link has no destination, so keyboard and pointer cannot follow it.
		href: disabled ? undefined : href,
		role: disabled ? 'link' : undefined,
		'aria-disabled': disabled || loading || softDisabled ? 'true' : undefined,
		'aria-busy': loading || undefined,
		'data-loading': loading || undefined
	};
}

/** True when a click, Enter or Space on the element must do nothing. */
export function isBlocked(state: Pick<ActionState, 'disabled' | 'loading' | 'softDisabled'>): boolean {
	return state.disabled || state.loading || Boolean(state.softDisabled);
}
