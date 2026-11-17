<script lang="ts">
	import Badge from '../primitives/display/Badge.svelte';
	import Progress from '../primitives/display/Progress.svelte';
	import Table, { type TableColumn, type TableProps } from '../primitives/display/Table.svelte';
	import { READABLE_TONE_TEXT } from '../primitives/display/helpers';
	import { USAGE_TONE, usageFree, usageText, usageWindowText } from '../state/usage';
	import type { AccountUsage } from '../types';
	import type { UiTone } from '../ui/styles';

	interface Props extends Omit<TableProps, 'columns' | 'children'> {
		/** One agent's accounts on one machine, in the order they are used. The first column counts them from 1. */
		accounts: AccountUsage[];
		/** Time zone for reset times. Defaults to UTC so server and browser agree. */
		timeZone?: string;
		/** The status of an `off` account. */
		offLabel?: string;
		/** The status of an account that can take work and was never read. */
		unreadLabel?: string;
	}

	let { accounts, timeZone = 'UTC', offLabel = 'Off', unreadLabel = 'Not read yet', ...rest }: Props = $props();

	const COLUMNS: TableColumn[] = [{ label: '#', class: 'w-12' }, { label: 'Account' }, { label: '5-hour window' }, { label: 'Week' }, { label: 'Status' }];
	const WINDOWS = [
		['fiveHour', '5-hour window'],
		['week', 'Week']
	] as const;

	function status(account: AccountUsage): { text: string; tone: UiTone } {
		if (account.status === 'off') return { text: offLabel, tone: 'neutral' };
		if (usageFree(account) && account.at === undefined) return { text: unreadLabel, tone: 'neutral' };
		if (account.status === 'available') return { text: 'Available', tone: 'success' };
		return { text: usageText(account, timeZone), tone: USAGE_TONE[account.status] };
	}
</script>

<Table {...rest} columns={COLUMNS}>
	{#each accounts as account, index (index)}
		{@const badge = status(account)}
		<tr>
			<td class="tabular-nums text-fg-light">{index + 1}</td>
			<th scope="row">{account.label}</th>
			{#each WINDOWS as [key, name] (key)}
				{@const caption = usageWindowText(account, key, timeZone)}
				{@const used = account.windows[key]?.used ?? 0}
				{@const past = used < 100 && used >= (account.switchAt ?? Infinity)}
				<td>
					{#if caption === undefined}
						<span aria-hidden="true" class="text-fg-light">–</span><span class="sr-only">No reading</span>
					{:else}
						<!-- The caption is the track's value text, so it is said once. -->
						<div class="flex min-w-32 flex-col gap-1.5">
							<Progress size="sm" value={used} tone={past ? 'info' : 'neutral'} valueText={caption} aria-label="{account.label} {name}" />
							<span aria-hidden="true" class="whitespace-nowrap text-xs {past ? READABLE_TONE_TEXT.info : 'text-fg-light'}">{caption}</span>
						</div>
					{/if}
				</td>
			{/each}
			<td><Badge size="lg" tone={badge.tone}>{badge.text}</Badge></td>
		</tr>
	{/each}
</Table>
