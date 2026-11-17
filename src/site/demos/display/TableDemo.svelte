<script lang="ts">
	import { Badge, Table } from '$lib/primitives/display';

	const MACHINES = [
		{ name: 'Build box', slots: '2 of 3 free', seen: 'Now', online: true },
		{ name: 'Laptop', slots: '1 of 1 free', seen: '4 min ago', online: true },
		{ name: 'Old mini', slots: 'None', seen: '3 days ago', online: false }
	];

	const RETURNS = [
		{ account: 'Work', when: 'Tue 18:20', why: 'The 5-hour window resets' },
		{ account: 'Spare', when: 'Thu 20:00', why: 'The week resets' }
	];
</script>

<div class="mx-auto grid w-full max-w-xl gap-6">
	<Table
		aria-label="Machines"
		columns={[{ label: 'Machine' }, { label: 'Slots', class: 'w-28' }, { label: 'Last seen', class: 'w-28' }, { label: 'State', hideLabel: true, class: 'w-24' }]}
	>
		{#each MACHINES as machine (machine.name)}
			<tr>
				<th scope="row">{machine.name}</th>
				<td>{machine.slots}</td>
				<td class="text-fg-light">{machine.seen}</td>
				<td><Badge tone={machine.online ? 'success' : 'neutral'} dot>{machine.online ? 'Online' : 'Offline'}</Badge></td>
			</tr>
		{/each}
	</Table>
	<div class="grid gap-2">
		<p class="m-0 text-xs font-medium text-fg-light">Every label hidden: the header row is for screen readers only</p>
		<Table aria-label="When they come back" columns={[{ label: 'Account', hideLabel: true }, { label: 'Back at', hideLabel: true }, { label: 'Why', hideLabel: true }]}>
			{#each RETURNS as row (row.account)}
				<tr>
					<th scope="row">{row.account}</th>
					<td class="tabular-nums">{row.when}</td>
					<td class="text-fg-light">{row.why}</td>
				</tr>
			{/each}
		</Table>
	</div>
</div>
