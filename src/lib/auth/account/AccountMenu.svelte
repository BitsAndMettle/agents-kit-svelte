<script lang="ts" module>
	/** Every word the account menu shows or announces. */
	export interface AccountMenuLabels {
		/** Accessible name of the trigger, from the person's name (or email). */
		menuLabel: (name: string) => string;
		signOut: string;
	}
</script>

<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { LogOut } from '@lucide/svelte';
	import { cn } from '../../ui/cn';
	import { Avatar } from '../../primitives/display';
	import { DropdownMenu, type MenuEntry } from '../../primitives/menus';
	import type { OverlayPlacement } from '../../primitives/placement';
	import type { ChangeReason } from '../../headless/runtime/parts';
	import type { AuthUser } from '../shared';

	export interface Props extends Omit<HTMLButtonAttributes, 'class' | 'children' | 'type' | 'aria-label'> {
		/** The signed-in person. Shown on the avatar and in the menu header. */
		user: AuthUser;
		/** Rows between the header and "Sign out", in DropdownMenu's own item format (links, icons, separators, tones). */
		items?: MenuEntry[];
		/** Choosing "Sign out". Your app ends the session. */
		onSignOut?: () => unknown;
		/** Shows the person's name next to the avatar. Default false. */
		showName?: boolean;
		/** Bindable. */
		open?: boolean;
		onOpenChange?: (open: boolean, reason: ChangeReason) => void;
		/** Default `bottom-end`. */
		placement?: OverlayPlacement;
		/** Words, merged over the English defaults. */
		labels?: Partial<AccountMenuLabels>;
		/** The trigger button. Bindable. */
		ref?: HTMLElement | null;
		/** Classes for the trigger button. */
		class?: string;
	}

	let {
		user,
		items = [],
		onSignOut,
		showName = false,
		open = $bindable(false),
		onOpenChange,
		placement = 'bottom-end',
		labels,
		ref = $bindable(null),
		class: className = '',
		...rest
	}: Props = $props();

	const text = $derived<AccountMenuLabels>({
		menuLabel: (name) => `Account menu for ${name}`,
		signOut: 'Sign out',
		...labels
	});
	const TRIGGER =
		'inline-flex min-h-8 items-center gap-2 rounded-full p-0.5 text-[13px] font-medium text-fg-main transition-colors hover:bg-chat-user focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary/70';
	const display = $derived(user.name || user.email || '');
	const entries: MenuEntry[] = $derived([
		...items,
		...(items.length > 0 ? ([{ kind: 'separator' }] satisfies MenuEntry[]) : []),
		{ value: 'account-menu-sign-out', label: text.signOut, icon: LogOut, onSelect: () => void onSignOut?.() }
	]);
</script>

<DropdownMenu items={entries} bind:open {onOpenChange} {placement} bind:ref>
	{#snippet trigger(part)}
		<button {...rest} {...part} class={cn(TRIGGER, showName && 'pr-3', className)}>
			<Avatar decorative src={user.avatarSrc} name={display} size="md" />
			{#if showName && display}<span aria-hidden="true" class="max-w-40 truncate">{display}</span>{/if}
			<span class="sr-only">{text.menuLabel(display)}</span>
		</button>
	{/snippet}
	{#snippet header()}
		<div class="min-w-0 px-2 py-1.5">
			{#if user.name}<p class="m-0 truncate text-[13px] font-semibold text-fg-main">{user.name}</p>{/if}
			{#if user.email}<p class={cn('m-0 truncate text-xs text-fg-light', !user.name && 'text-[13px] font-semibold text-fg-main')}>{user.email}</p>{/if}
		</div>
		<div aria-hidden="true" class="my-1 h-px bg-canvas-border"></div>
	{/snippet}
</DropdownMenu>
