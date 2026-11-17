<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import Badge from '../primitives/display/Badge.svelte';
	import Progress from '../primitives/display/Progress.svelte';
	import { USAGE_TONE, usageText, usageWindow } from '../state/usage';
	import type { AccountUsage } from '../types';

	interface Props extends Omit<HTMLAttributes<HTMLUListElement>, 'class' | 'children'> {
		accounts: AccountUsage[];
		/** Time zone for reset times. Defaults to UTC so server and browser agree. */
		timeZone?: string;
		class?: string;
	}

	let { accounts, timeZone = 'UTC', class: className = '', ...rest }: Props = $props();
</script>

<ul {...rest} class={cn('@container flex flex-col text-[13px]', className)}>
	{#each accounts as account (account.agent + account.label)}
		{@const text = usageText(account, timeZone)}
		<li class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 py-2 @md:grid-cols-[5rem_minmax(0,1fr)_auto]">
			<span class="truncate font-medium text-fg-main">{account.label}</span>
			<Progress
				class="order-last col-span-2 @md:order-none @md:col-span-1"
				size="sm"
				value={usageWindow(account)?.used ?? 0}
				tone={USAGE_TONE[account.status]}
				aria-label="{account.label} usage"
				valueText={text}
			/>
			<Badge tone={USAGE_TONE[account.status]}>{text}</Badge>
		</li>
	{/each}
</ul>
