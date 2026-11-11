<script lang="ts">
	import { CreditCard, Settings, UserRound } from '@lucide/svelte';
	import type { MenuEntry } from '$lib/primitives/menus';
	import { AccountMenu } from '$lib/auth/account';
	import type { AuthUser } from '$lib/auth/shared';

	const user: AuthUser = { name: 'Ada Lovelace', email: 'ada@example.com' };
	let last = $state('nothing yet');

	const items: MenuEntry[] = [
		{ value: 'profile', label: 'Profile', icon: UserRound, onSelect: () => (last = 'Profile') },
		{ value: 'billing', label: 'Billing', icon: CreditCard, onSelect: () => (last = 'Billing') },
		{ kind: 'separator' },
		{ value: 'settings', label: 'Settings', icon: Settings, shortcut: ',', onSelect: () => (last = 'Settings') }
	];
</script>

<div class="flex flex-wrap items-center gap-6">
	<AccountMenu {user} {items} showName onSignOut={() => (last = 'Sign out')} />
	<AccountMenu user={{ email: 'grace@example.com' }} {items} onSignOut={() => (last = 'Sign out')} />
	<p class="m-0 text-[13px] text-fg-light">Last choice: <span data-testid="account-last">{last}</span></p>
</div>
