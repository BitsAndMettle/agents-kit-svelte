<script lang="ts">
	import { UsageMeter } from '$lib/settings/controls';
	import { RECIPES } from '$lib/settings/shared';
	import { SAMPLE_STORAGE_SEGMENTS } from '$lib/fixtures/settings';

	// A fixed "now", so the reset line reads the same on the server and in the browser.
	const NOW = Date.UTC(2026, 10, 12, 9, 0);
	const RESETS = Date.UTC(2026, 11, 1);
	const gb = (n: number) => `${n.toLocaleString('en-US', { maximumFractionDigits: 1 })} GB`;

	let seats = $state(42);
	let log = $state('');
	async function addSeats(): Promise<void> {
		await new Promise((resolve) => setTimeout(resolve, 600));
		log = 'Opened seat checkout';
	}

	const hours = [
		{ id: 'design', label: 'Design', value: 31 },
		{ id: 'research', label: 'Research', value: 12 },
		{ id: 'support', label: 'Support', value: 44 },
		{ id: 'ops', label: 'Operations', value: 36 }
	];
</script>

<div class="@container/settings mx-auto flex w-full max-w-3xl flex-col gap-4">
	<section class={RECIPES.section} aria-labelledby="um-plan">
		<div class={RECIPES.sectionHeader}>
			<div class="min-w-0 flex-1">
				<h3 id="um-plan" class="m-0 text-sm font-semibold text-fg-main">Plan usage</h3>
				<p class="m-0 mt-0.5 text-xs leading-5 text-fg-light">Team plan, billed monthly.</p>
			</div>
		</div>
		<div class="grid gap-6 px-4 py-4 @3xl/settings:grid-cols-2">
			<UsageMeter
				label="Seats"
				value={seats}
				limit={50}
				unit="seats"
				period={{ label: 'This month', resetsAt: RESETS }}
				now={NOW}
				action={{ label: 'Add seats', onSelect: addSeats }}
				data-testid="um-seats"
			/>
			<UsageMeter
				label="Storage"
				segments={SAMPLE_STORAGE_SEGMENTS}
				limit={30}
				format={gb}
				marker={{ value: 28.5, label: 'Uploads pause at' }}
				projected={{ value: 24.6, label: 'After clearing cache' }}
				description="Uploads pause before the limit, so nothing is lost."
				data-testid="um-storage"
			/>
			<UsageMeter label="Guests" value={7} limit={null} unit="guests" description="Guests are free on every plan." data-testid="um-unlimited" />
			<UsageMeter label="Automation runs" limit={1000} unit="runs" labels={{ none: 'No runs yet this month' }} data-testid="um-none" />
		</div>
		<div class={RECIPES.sectionFooter}>
			<button type="button" class="underline-offset-2 hover:underline" onclick={() => (seats = seats >= 52 ? 38 : seats + 5)}>Change seats in use (demo)</button>
			<span data-testid="um-log">{log}</span>
		</div>
	</section>

	<section class={RECIPES.section} aria-labelledby="um-hours">
		<div class={RECIPES.sectionHeader}>
			<div class="min-w-0 flex-1">
				<h3 id="um-hours" class="m-0 text-sm font-semibold text-fg-main">Hours by team</h3>
				<p class="m-0 mt-0.5 text-xs leading-5 text-fg-light">Each team has 40 hours a month. One scale for every row.</p>
			</div>
		</div>
		<ul role="list" class={RECIPES.list}>
			{#each hours as row (row.id)}
				<li class="border-t border-canvas-border px-4 py-3 first:border-t-0">
					<UsageMeter variant="row" size="sm" label={row.label} value={row.value} limit={40} max={50} format={(n) => `${n} h`} data-testid="um-row-{row.id}" />
				</li>
			{/each}
		</ul>
	</section>

	<div class="grid gap-3 @lg/settings:grid-cols-3">
		<div class="rounded-card border border-card-border bg-card-bg p-3"><UsageMeter variant="compact" size="sm" label="Disk" value={58.2} limit={64} format={gb} /></div>
		<div class="rounded-card border border-card-border bg-card-bg p-3"><UsageMeter variant="compact" size="sm" label="Memory" value={9.1} limit={16} format={gb} /></div>
		<div class="rounded-card border border-card-border bg-card-bg p-3"><UsageMeter variant="compact" size="sm" label="Uploads today" value={212} limit={200} unit="files" data-testid="um-over" /></div>
	</div>
</div>
