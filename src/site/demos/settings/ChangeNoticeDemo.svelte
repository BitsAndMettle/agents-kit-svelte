<script lang="ts">
	import { ChangeNotice } from '$lib/settings/save';
	import { SettingsSection } from '$lib/settings/rows';
	import { InstantSetting, RECIPES, SETTINGS_CONTAINER, type SettingsResult } from '$lib/settings/shared';
	import { Spinner } from '$lib/primitives/display';
	import { cn } from '$lib/ui/cn';

	const DENSITY = [
		{ value: 'comfortable', label: 'Comfortable' },
		{ value: 'compact', label: 'Compact' },
		{ value: 'spacious', label: 'Spacious' }
	];
	const labelOf = (value: string) => DENSITY.find((d) => d.value === value)?.label ?? value;

	const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	let failNext = $state(false);

	/** Pretends to store the preference: 600 ms, and fails once when asked to. */
	async function store(): Promise<SettingsResult | void> {
		await wait(600);
		if (failNext) {
			failNext = false;
			return { error: 'Couldn’t save the density. It was changed back.' };
		}
	}

	const density = new InstantSetting<string>({ value: () => 'comfortable', commit: () => store });

	interface Notice {
		key: number;
		lead: string;
		detail: string;
		token?: number;
	}
	let notices = $state<Notice[]>([]);
	let next = 0;

	async function choose(value: string): Promise<void> {
		const before = density.committed;
		if (value === before && density.status !== 'pending') return;
		await density.set(value);
		// Only the change that settled last reports, and only a success gets a notice.
		if (density.status !== 'saved' || density.committed !== value) return;
		notices = [{ key: ++next, lead: `Density set to ${labelOf(value).toLowerCase()}`, detail: `It was ${labelOf(before).toLowerCase()}.`, token: density.undoToken }, ...notices].slice(0, 2);
	}

	let retentionUndone = $state(false);
	const TEAM_LOCK = { kind: 'permission', reason: 'Only admins can change the team’s theme.' } as const;
	let retentionDismissed = $state(false);
</script>

<div class={cn(SETTINGS_CONTAINER, 'mx-auto grid w-full max-w-2xl gap-3')}>
	<SettingsSection title="Team theme" description="Set by an admin for everyone in the team." headingLevel={3} lock={TEAM_LOCK} list={false} data-testid="cnd-locked">
		<div class="p-3">
			<ChangeNotice
				tone="neutral"
				lead="Theme set to dark for the team"
				detail="Ada Park changed it a minute ago."
				undoToken="t-7"
				onUndo={async () => {
					await wait(600);
				}}
				secondary={{ label: 'Reset to default', onSelect: () => wait(600) }}
			/>
		</div>
	</SettingsSection>

	<section aria-labelledby="cnd-heading" class={RECIPES.section}>
		<header class={RECIPES.sectionHeader}>
			<div class="min-w-0 flex-1">
				<h3 id="cnd-heading" class="m-0 text-sm font-semibold text-fg-main">Appearance</h3>
				<p class="m-0 text-xs leading-5 text-fg-light">Applies as soon as you choose. Only on this device.</p>
			</div>
		</header>
		<ul role="list" class={RECIPES.list}>
			<li class={RECIPES.row}>
				<div class="min-w-0">
					<p id="cnd-density" class="m-0 text-[13px] font-medium text-fg-main">Density</p>
					<p class="m-0 text-xs leading-5 text-fg-light">How much fits on one screen.</p>
				</div>
				<div class="flex min-w-0 items-center gap-2">
					<span class="inline-flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
						{#if density.pending}<Spinner size="sm" />{/if}
					</span>
					<div role="radiogroup" aria-labelledby="cnd-density" aria-busy={density.pending || undefined} class="inline-flex min-w-0 max-w-full flex-wrap items-center gap-0.5 rounded-2xl bg-canvas-secondary p-0.5">
						{#each DENSITY as option (option.value)}
							<label class="relative inline-flex h-7 cursor-pointer items-center whitespace-nowrap rounded-full px-2.5 text-xs @max-lg/settings:px-2 font-medium text-fg-light transition-colors hover:text-fg-main has-[:checked]:bg-card-bg has-[:checked]:text-fg-main has-[:checked]:shadow-btn has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-accent-primary">
								<input type="radio" name="cnd-density" value={option.value} checked={density.current === option.value} onchange={() => choose(option.value)} class="absolute inset-0 m-0 cursor-pointer appearance-none rounded-full opacity-0" />
								{option.label}
							</label>
						{/each}
					</div>
				</div>
			</li>
		</ul>
		<div class={RECIPES.sectionFooter}>
			<label class="inline-flex items-center gap-1.5">
				<input type="checkbox" bind:checked={failNext} class="size-3.5 accent-accent-primary" />
				Make the next change fail
			</label>
			<span role="status" class="ml-auto text-xs">
				{#if density.status === 'error'}<span class="text-status-danger">{density.error ?? 'Couldn’t save. Changed back.'}</span>{/if}
			</span>
		</div>
	</section>

	<div class="grid gap-2" data-testid="cnd-notices">
		{#each notices as notice (notice.key)}
			<ChangeNotice
				lead={notice.lead}
				detail={notice.detail}
				undoToken={notice.token}
				currentToken={density.undoToken ?? null}
				onUndo={async (token) => ((await density.undo(token)) ? undefined : { error: 'Couldn’t undo: a newer change replaced it.' })}
				secondary={{
					label: 'Use for the whole team',
					onSelect: async () => {
						await wait(600);
						return { error: 'Only admins can set the team’s density.' };
					}
				}}
				onDismiss={() => (notices = notices.filter((n) => n.key !== notice.key))}
			/>
		{/each}
	</div>

	{#if !retentionDismissed}
		<ChangeNotice
			tone="neutral"
			lead="Data retention set to 30 days"
			detail="Activity older than 30 days will be deleted tonight."
			undoToken="r-42"
			undone={retentionUndone}
			undoAction="/settings-demo/undo"
			hidden={{ setting: 'retention' }}
			onUndo={async () => {
				await wait(600);
				retentionUndone = true;
			}}
			secondary={{ label: 'Review data settings', href: '#settings-form' }}
			onDismiss={() => (retentionDismissed = true)}
			data-testid="cnd-native"
		/>
	{/if}
</div>
