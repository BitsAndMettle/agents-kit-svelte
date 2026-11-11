<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Menu } from '../../headless/patterns/menu.svelte';
	import type { ChangeReason } from '../../headless/runtime/parts';
	import { cn } from '../../ui/cn';
	import { MENU_SURFACE } from './classes';
	import { menuEntries } from './DropdownMenu.svelte';
	import type { MenuEntry } from './types';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		/** The rows, as data (the same shape as DropdownMenu). */
		items: MenuEntry[];
		/** Accessible name of the menu, e.g. "File actions". Name the region itself with `aria-label` if it needs one. */
		menuLabel?: string;
		/** The region that opens the menu on right-click, Shift+F10 or the ContextMenu key. */
		children: Snippet;
		/** Bindable. */
		open?: boolean;
		defaultOpen?: boolean;
		onOpenChange?: (open: boolean, reason: ChangeReason) => void;
		/** Class for the menu surface. */
		menuClass?: string;
		/** The region element. Bindable. */
		ref?: HTMLDivElement | null;
		/** Class for the region. */
		class?: string;
	}

	let {
		items,
		menuLabel = 'Actions',
		children,
		open = $bindable(),
		defaultOpen = false,
		onOpenChange,
		ref = $bindable(null),
		menuClass = '',
		class: className = '',
		...rest
	}: Props = $props();

	if (untrack(() => open) === undefined) open = untrack(() => defaultOpen);

	const id = $props.id();
	const menu = new Menu({
		id,
		trigger: 'contextmenu',
		get label() {
			return menuLabel;
		},
		open: () => open ?? false,
		onOpenChange: (next, reason) => {
			open = next;
			onOpenChange?.(next, reason);
		}
	});
</script>

<div {...rest} {...menu.trigger} bind:this={ref} class={cn('relative', className)}>
	{@render children()}
	<div {...menu.content} class={cn(MENU_SURFACE, menuClass)}>
		{@render menuEntries(menu, items)}
	</div>
</div>
