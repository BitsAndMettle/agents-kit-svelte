<script lang="ts">
	import { Eye, House, Inbox, LayoutGrid, Pencil, ShieldCheck } from '@lucide/svelte';
	import { ChoiceCards } from '$lib/settings/controls';
	import { RECIPES, type ChoiceOption, type SettingsResult } from '$lib/settings/shared';
	import { SAMPLE_RETENTION_OPTIONS } from '$lib/fixtures/settings';
	import ControlsStagedForm from './ControlsStagedForm.svelte';

	/** A slow server: answers after 600 ms. */
	const wait = (ms = 600) => new Promise<void>((resolve) => setTimeout(resolve, ms));

	const themes: ChoiceOption[] = [
		{ value: 'system', label: 'System', description: 'Follows your device.' },
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' },
		{ value: 'contrast', label: 'High contrast', badge: 'Beta', description: 'Stronger edges and text.' }
	];
	let theme = $state('system');
	async function saveTheme(): Promise<void> {
		await wait();
	}

	const densities: ChoiceOption[] = [
		{ value: 'compact', label: 'Compact' },
		{ value: 'default', label: 'Default' },
		{ value: 'spacious', label: 'Spacious' }
	];
	let density = $state('default');
	/** Spacious fails, so the revert and the generic message can be seen. */
	async function saveDensity(next: string): Promise<void> {
		await wait();
		if (next === 'spacious') throw new Error('refused');
	}

	const startPages: ChoiceOption[] = [
		{ value: 'home', label: 'Home', icon: House },
		{ value: 'inbox', label: 'Inbox', icon: Inbox },
		{ value: 'boards', label: 'Boards', icon: LayoutGrid }
	];

	const roles: ChoiceOption[] = [
		{ value: 'viewer', label: 'Viewer', description: 'Can see everything, change nothing.', icon: Eye },
		{ value: 'editor', label: 'Editor', description: 'Can create and edit documents.', icon: Pencil },
		{
			value: 'admin',
			label: 'Admin',
			description: 'Can manage members and billing.',
			icon: ShieldCheck,
			lock: { kind: 'plan', reason: 'Admin as a default role needs the Business plan.', badge: 'Business' }
		}
	];
	const ROLE_CAN: Record<string, string> = {
		viewer: 'New members can read documents and comments.',
		editor: 'New members can create, edit and comment on documents.',
		admin: 'New members can manage the team.'
	};

	/** Saving staged team defaults: 600 ms, and a 1-year retention is refused with a message. */
	async function saveDefaults(values: Record<string, unknown>): Promise<void | SettingsResult> {
		await wait();
		if (values.retention === '365') return { error: 'A 1-year retention needs approval from the billing contact.' };
	}
</script>

{#snippet swatch(option: ChoiceOption)}
	{@const look = {
		system: ['bg-[oklch(0.98_0.005_80)]', 'bg-[oklch(0.24_0.01_80)]'],
		light: ['bg-[oklch(0.98_0.005_80)]', 'bg-[oklch(0.98_0.005_80)]'],
		dark: ['bg-[oklch(0.24_0.01_80)]', 'bg-[oklch(0.24_0.01_80)]'],
		contrast: ['bg-[oklch(1_0_0)]', 'bg-[oklch(0_0_0)]']
	}[option.value] ?? ['', '']}
	<span class="grid h-16 grid-cols-2">
		{#each look as tint, i (i)}
			<span class={['flex flex-col gap-1 p-2', tint]}>
				<span class={['h-1.5 w-2/3 rounded-full', i === 0 && option.value !== 'dark' ? 'bg-[oklch(0.8_0.01_80)]' : 'bg-[oklch(0.5_0.01_80)]']}></span>
				<span class="h-1.5 w-1/2 rounded-full bg-[oklch(0.62_0.15_45)]"></span>
				<span class={['mt-auto h-3 w-full rounded-sm', i === 0 && option.value !== 'dark' ? 'bg-[oklch(0.92_0.01_80)]' : 'bg-[oklch(0.34_0.01_80)]']}></span>
			</span>
		{/each}
	</span>
{/snippet}

{#snippet roleReadout(value: string | null)}
	{value ? ROLE_CAN[value] : 'Pick a role for people who join.'}
{/snippet}

<div class="@container/settings mx-auto flex w-full max-w-3xl flex-col gap-4">
	<section class={RECIPES.section} aria-labelledby="cc-appearance">
		<div class={RECIPES.sectionHeader}>
			<div class="min-w-0 flex-1">
				<h3 id="cc-appearance" class="m-0 text-sm font-semibold text-fg-main">Appearance</h3>
				<p class="m-0 mt-0.5 text-xs leading-5 text-fg-light">Saved as you choose, for this browser.</p>
			</div>
		</div>
		<div class="flex flex-col gap-6 px-4 py-4">
			<div class="flex flex-col gap-2">
				<div>
					<p id="cc-theme" class="m-0 text-[13px] font-medium text-fg-main">Theme</p>
					<p id="cc-theme-help" class="m-0 text-xs leading-5 text-fg-light">Without JavaScript, choose and press Apply.</p>
				</div>
				<ChoiceCards
					name="theme"
					aria-labelledby="cc-theme"
					aria-describedby="cc-theme-help"
					options={themes}
					bind:value={theme}
					savedValue={theme}
					onCommit={saveTheme}
					action="/settings-demo/appearance"
					columns={4}
					preview={swatch}
					data-testid="cc-theme"
				/>
				<p class="m-0 text-xs text-fg-light" data-testid="cc-theme-saved">Saved theme: {theme}</p>
			</div>
			<div class="flex flex-col gap-2 @lg/settings:flex-row @lg/settings:items-center @lg/settings:justify-between @lg/settings:gap-6">
				<div class="min-w-0">
					<p id="cc-density" class="m-0 text-[13px] font-medium text-fg-main">Density</p>
					<p class="m-0 text-xs leading-5 text-fg-light">How much fits on screen. Spacious is refused in this demo.</p>
				</div>
				<ChoiceCards name="density" aria-labelledby="cc-density" variant="segmented" options={densities} bind:value={density} onCommit={saveDensity} class="@lg/settings:w-72" data-testid="cc-density" />
			</div>
			<div class="flex flex-col gap-2">
				<p id="cc-start" class="m-0 text-[13px] font-medium text-fg-main">Start page</p>
				<ChoiceCards
					name="start"
					aria-labelledby="cc-start"
					variant="rows"
					options={startPages}
					defaultValue="inbox"
					lock={{ kind: 'managed', reason: 'Your administrator sets the start page for everyone.', source: 'Northwind Studio policy' }}
					data-testid="cc-start"
				/>
			</div>
		</div>
	</section>

	<ControlsStagedForm title="Team defaults" description="Changes apply when you save." action="/settings-demo/defaults" save={saveDefaults} testid="cc-defaults">
		<div class="flex flex-col gap-2">
			<p id="cc-role" class="m-0 text-[13px] font-medium text-fg-main">Default role</p>
			<ChoiceCards name="role" aria-labelledby="cc-role" variant="rows" options={roles} defaultValue="editor" readout={roleReadout} data-testid="cc-role" />
		</div>
		<div class="flex flex-col gap-2">
			<p id="cc-retention" class="m-0 text-[13px] font-medium text-fg-main">Data retention</p>
			<p class="m-0 -mt-1 text-xs leading-5 text-fg-light">Cards when there is room, a segmented control when narrow. 1 year is refused in this demo.</p>
			<ChoiceCards name="retention" aria-label="Data retention" variant="auto" options={SAMPLE_RETENTION_OPTIONS} defaultValue="90" data-testid="cc-retention" />
		</div>
	</ControlsStagedForm>
</div>
