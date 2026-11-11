<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Menu } from '../../headless/patterns/menu.svelte';
	import type { ChangeReason } from '../../headless/runtime/parts';
	import { cn } from '../../ui/cn';
	import { MENU_SURFACE } from './classes';
	import { menuEntries } from './DropdownMenu.svelte';
	import type { MenuEntry } from './types';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		/** The rows, as data (the same shape as DropdownMenu). */
		items: MenuEntry[];
		/** Accessible name of the menu, e.g. "File actions". */
		label: string;
		/** The region that opens the menu on right-click, Shift+F10 or the ContextMenu key. */
		children: Snippet;
		/** Bindable. */
		open?: boolean;
		onOpenChange?: (open: boolean, reason: ChangeReason) => void;
		/** Class for the menu surface. */
		menuClass?: string;
		/** Class for the region. */
		class?: string;
	}

	let {
		items,
		label,
		children,
		open = $bindable(false),
		onOpenChange,
		menuClass = '',
		class: className = '',
		...rest
	}: Props = $props();

	const id = $props.id();
	const menu = new Menu({
		id,
		trigger: 'contextmenu',
		get label() {
			return label;
		},
		open: () => open,
		onOpenChange: (next, reason) => {
			open = next;
			onOpenChange?.(next, reason);
		}
	});
</script>

<div {...rest} {...menu.trigger} class={cn('relative', className)}>
	{@render children()}
	<div {...menu.content} class={cn(MENU_SURFACE, menuClass)}>
		{@render menuEntries(menu, items)}
	</div>
</div>
