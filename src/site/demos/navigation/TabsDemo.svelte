<script lang="ts">
	import { Tabs } from '$lib/primitives/navigation';
	import { Bell, Settings, Users } from '@lucide/svelte';

	let value = $state('overview');
	let manual = $state('members');
</script>

{#snippet overview()}
	<p class="py-3">Runs, spend and approvals for the last seven days.</p>
{/snippet}
{#snippet members()}
	<p class="py-3">Three people can approve work in this workspace.</p>
{/snippet}
{#snippet alerts()}
	<p class="py-3">Alerts mount the first time you open this tab.</p>
{/snippet}
{#snippet locked()}
	<p class="py-3">Not available.</p>
{/snippet}
{#snippet membersLabel()}<Users aria-hidden="true" />Members{/snippet}
{#snippet alertsLabel()}<Bell aria-hidden="true" />Alerts{/snippet}
{#snippet settingsLabel()}<Settings aria-hidden="true" />Settings{/snippet}

<div class="flex w-full max-w-xl flex-col gap-8">
	<div class="flex flex-col gap-2">
		<p class="text-xs font-medium text-fg-light">Underline, automatic activation. Selected: {value}</p>
		<Tabs
			aria-label="Workspace sections"
			bind:value
			items={[
				{ value: 'overview', label: 'Overview', content: overview },
				{ value: 'members', label: membersLabel, content: members },
				{ value: 'alerts', label: alertsLabel, content: alerts },
				{ value: 'billing', label: 'Billing', disabled: true, content: locked }
			]}
		/>
	</div>

	<div class="flex flex-col gap-2">
		<p class="text-xs font-medium text-fg-light">Segmented, manual activation (Enter or Space selects). Selected: {manual}</p>
		<Tabs
			aria-label="Manual sections"
			variant="segmented"
			activation="manual"
			mount="lazy"
			bind:value={manual}
			items={[
				{ value: 'members', label: membersLabel, content: members },
				{ value: 'alerts', label: alertsLabel, content: alerts },
				{ value: 'settings', label: settingsLabel, content: overview }
			]}
		/>
	</div>

	<div class="flex flex-col gap-2">
		<p class="text-xs font-medium text-fg-light">Vertical underline</p>
		<Tabs
			aria-label="Vertical sections"
			orientation="vertical"
			defaultValue="alerts"
			items={[
				{ value: 'overview', label: 'Overview', content: overview },
				{ value: 'alerts', label: 'Alerts', content: alerts },
				{ value: 'members', label: 'Members', content: members }
			]}
		/>
	</div>
</div>
