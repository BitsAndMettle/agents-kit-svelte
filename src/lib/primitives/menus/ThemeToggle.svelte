<!--
	@component
	Light, Dark or System, from a menu behind one icon button named Theme. `<html data-theme>` holds the
	choice: read when the toggle is drawn, written when one is chosen, with a `dark` class cleared, as it
	would keep the page dark. With `cookie`, the choice is kept in that cookie too, for the server to
	render `<html data-theme>` from.
-->
<script lang="ts">
	import { SunMoon } from '@lucide/svelte';
	import { buttonClass } from '../../ui/styles';
	import DropdownMenu, { type Props as DropdownMenuProps } from './DropdownMenu.svelte';
	import { themeCookie, themeOf, type Theme } from './helpers';
	import type { MenuEntry } from './types';

	export interface Props extends Omit<DropdownMenuProps, 'items' | 'trigger' | 'triggerLabel' | 'class'> {
		/** A cookie name: each choice is written to it (a year, every path), and again each time the toggle mounts. */
		cookie?: string;
	}

	let { cookie, placement = 'bottom-end', ...rest }: Props = $props();

	let theme = $state<Theme | null>(null);

	$effect(() => {
		const html = document.documentElement;
		const drawn = themeOf(html.getAttribute('data-theme'), html.classList.contains('dark'));
		theme = drawn;
		// Safari keeps a cookie written from script for seven days at most; writing it on each visit keeps the year.
		if (cookie) document.cookie = themeCookie(cookie, drawn);
	});

	function choose(value: string) {
		const next = value as Theme;
		theme = next;
		document.documentElement.setAttribute('data-theme', next);
		document.documentElement.classList.remove('dark');
		if (cookie) document.cookie = themeCookie(cookie, next);
	}

	const items: MenuEntry[] = $derived([
		{
			kind: 'radio',
			name: 'theme',
			label: 'Theme',
			value: theme,
			onValueChange: choose,
			options: [
				{ value: 'light', label: 'Light' },
				{ value: 'dark', label: 'Dark' },
				{ value: 'system', label: 'System' }
			]
		}
	]);
</script>

<DropdownMenu {...rest} {placement} {items}>
	{#snippet trigger(part)}
		<button aria-label="Theme" {...part} class={buttonClass('ghost', 'icon')}><SunMoon aria-hidden="true" /></button>
	{/snippet}
</DropdownMenu>
