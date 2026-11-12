<script lang="ts">
	import { Field, NativeSelect, type NativeSelectOptionGroup } from '$lib/primitives/form';
	import DemoForm from './DemoForm.svelte';

	const regions: NativeSelectOptionGroup[] = [
		{
			label: 'Europe',
			options: [
				{ value: 'fra', label: 'Frankfurt' },
				{ value: 'ams', label: 'Amsterdam' }
			]
		},
		{
			label: 'Americas',
			options: [
				{ value: 'iad', label: 'Virginia' },
				{ value: 'sjc', label: 'San Jose (full)', disabled: true }
			]
		}
	];

	let region = $state('');
	let sort = $state('recent');

	const roles = [
		{ value: 'owner', label: 'Owner' },
		{ value: 'admin', label: 'Admin' },
		{ value: 'member', label: 'Member' },
		{ value: 'viewer', label: 'Read-only viewer' }
	];
	let role = $state('member');
</script>

<DemoForm label="Deployment" class="mx-auto w-full max-w-xl">
	<div class="grid gap-4 sm:grid-cols-2">
		<Field label="Region" required description="Where the runner lives.">
			<NativeSelect name="region" placeholder="Choose a region" options={regions} bind:value={region} />
		</Field>
		<Field label="Sort runs by">
			<NativeSelect name="sort" bind:value={sort}>
				<option value="recent">Most recent</option>
				<option value="duration">Longest first</option>
				<option value="cost">Highest cost</option>
			</NativeSelect>
		</Field>
	</div>
	<div class="flex flex-wrap items-center gap-3">
		<NativeSelect size="sm" aria-label="Page size" class="w-28" options={[{ value: '20', label: '20 rows' }, { value: '50', label: '50 rows' }]} defaultValue="20" />
		<NativeSelect size="lg" aria-label="Disabled select" class="w-40" disabled options={[{ value: 'locked', label: 'Locked' }]} defaultValue="locked" />
	</div>
	<div class="flex flex-col gap-2 rounded-control border border-card-border p-3 text-[13px] text-fg-main">
		<p class="m-0 text-xs font-medium text-fg-light">Pill variant: a compact chip sized to the chosen option</p>
		<div class="flex flex-wrap items-center gap-2">
			<span class="min-w-0 flex-1 font-medium">Chloé Martin</span>
			<NativeSelect variant="pill" size="sm" aria-label="Role for Chloé Martin" options={roles} bind:value={role} />
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<span class="min-w-0 flex-1 font-medium">Ben Ortiz</span>
			<NativeSelect variant="pill" size="sm" aria-label="Role for Ben Ortiz" defaultValue="admin">
				<option value="admin">Admin</option>
				<option value="member">Member</option>
			</NativeSelect>
			<NativeSelect variant="pill" size="sm" aria-label="Role for Ada Park" disabled options={roles} defaultValue="owner" />
		</div>
		<p class="m-0 text-xs text-fg-light" data-testid="pill-role">Chloé is now: {role}</p>
	</div>
</DemoForm>
