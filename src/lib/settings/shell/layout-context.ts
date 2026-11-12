/**
 * Tells shell components they sit inside SettingsLayout. Inside it they follow the layout's
 * `settings` container (the rail and the back link switch together); on their own they become a
 * `settings` container themselves, so they still respond to their own width.
 */
import { getContext, setContext } from 'svelte';

const LAYOUT = Symbol('agents-kit-settings-layout');

/** Called by SettingsLayout while it initialises. */
export function markSettingsLayout(): void {
	setContext(LAYOUT, true);
}

/** True below a SettingsLayout. Call while a component initialises. */
export function insideSettingsLayout(): boolean {
	return getContext<boolean | undefined>(LAYOUT) === true;
}
