<script lang="ts">
	import { tick } from 'svelte';
	import { ConflictResolver, SaveBar, SettingsForm, type ConflictKeep } from '$lib/settings/save';
	import { RECIPES, SETTINGS_CONTAINER, type ConflictField, type SettingsDraft, type SettingsResult, type SettingsSubmitContext, type SettingsValues } from '$lib/settings/shared';
	import { Input, NativeSelect } from '$lib/primitives/form';
	import { Button } from '$lib/primitives/actions';
	import { Dialog } from '$lib/primitives/overlays';
	import { cn } from '$lib/ui/cn';

	const RETENTION = [
		{ value: '30', label: '30 days' },
		{ value: '90', label: '90 days' },
		{ value: '365', label: '1 year' }
	];
	const retentionLabel = (value: string) => RETENTION.find((r) => r.value === value)?.label ?? value;
	const fields = [
		{ name: 'teamName', label: 'Team name' },
		{ name: 'channels', label: 'Channels' },
		{ name: 'retention', label: 'Data retention' }
	];
	/** What a teammate saved while you were editing. */
	const LATEST = { teamName: 'Northwind Studio Ltd', channels: 'Email, Phone', retention: '365' };
	/** Five minutes before the page was built, so server and browser agree. */
	const CHANGED_AT = Date.UTC(2026, 10, 12, 9, 25);
	const NOW = Date.UTC(2026, 10, 12, 9, 30);

	let revision = $state(12);
	let controller = $state<SettingsDraft>();
	let form = $state<HTMLFormElement | null>(null);
	let conflict = $state<ConflictField[]>([]);
	let keep = $state<Record<string, ConflictKeep>>({});
	let reviewing = $state(false);
	let stale = $state(true);
	let log = $state('');

	const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	function merged(choices: Record<string, ConflictKeep>, mine: Record<string, string>): Record<string, string> {
		const out: Record<string, string> = { ...mine };
		for (const field of conflict) {
			const choice = choices[field.name];
			if (choice === 'theirs') out[field.name] = LATEST[field.name as keyof typeof LATEST];
			if (choice === 'both') out[field.name] = [...new Set([...mine[field.name].split(', '), ...LATEST.channels.split(', ')])].join(', ');
		}
		return out;
	}

	/** The first save is stale (a teammate saved revision 13); the resubmit wins. */
	async function save(values: SettingsValues, context: SettingsSubmitContext): Promise<SettingsResult | void> {
		await wait(600);
		const mine = { teamName: String(values.teamName), channels: String(values.channels), retention: String(values.retention) };
		if (stale && Number(context.revision) === 12) {
			conflict = [
				{ name: 'teamName', label: 'Team name', mine: mine.teamName, theirs: LATEST.teamName },
				{ name: 'channels', label: 'Channels', mine: mine.channels, theirs: LATEST.channels, allowBoth: true },
				{ name: 'retention', label: 'Data retention', mine: retentionLabel(mine.retention), theirs: retentionLabel(LATEST.retention), bothReason: 'Only one retention period can apply.' }
			];
			keep = {};
			return { conflict: { message: 'Ben Ortiz saved these settings while you were editing. Your changes are kept.', revision: 13, fields: conflict } };
		}
		stale = false;
		revision = Number(context.revision) + 1;
		log = `Saved revision ${revision}: ${mine.teamName} · ${mine.channels} · ${retentionLabel(mine.retention)}`;
	}

	/** Writes the merged values into the form and saves against the latest revision. */
	function applyChoices(event: SubmitEvent): void {
		event.preventDefault();
		if (!form) return;
		const read = (name: string) => (form?.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null)?.value ?? '';
		const result = merged(keep, { teamName: read('teamName'), channels: read('channels'), retention: read('retention') });
		const set = (name: string, value: string) => {
			const control = form?.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
			if (control) control.value = value;
		};
		set('teamName', result.teamName);
		set('channels', result.channels);
		set('retention', result.retention);
		revision = 13;
		reviewing = false;
		// Let the new revision reach the hidden field first.
		void tick().then(() => form?.requestSubmit());
	}

	let postedNative = $state('');
</script>

<div class={cn(SETTINGS_CONTAINER, 'mx-auto grid w-full max-w-2xl gap-4')}>
	<SettingsForm {fields} {revision} onSubmit={save} bind:controller bind:ref={form} aria-label="Team profile">
		<section aria-labelledby="crd-heading" class={RECIPES.section}>
			<header class={RECIPES.sectionHeader}>
				<div class="min-w-0 flex-1">
					<h3 id="crd-heading" class="m-0 text-sm font-semibold text-fg-main">Team profile</h3>
					<p class="m-0 text-xs leading-5 text-fg-light">Change anything and save: a teammate has saved a newer version in the meantime.</p>
				</div>
			</header>
			<ul role="list" class={RECIPES.list}>
				<li class={RECIPES.row}>
					<label for="crd-team" class="text-[13px] font-medium text-fg-main">Team name</label>
					<Input id="crd-team" name="teamName" defaultValue="Northwind Studio" class="@lg/settings:w-60" />
				</li>
				<li class={RECIPES.row}>
					<label for="crd-channels" class="text-[13px] font-medium text-fg-main">Channels</label>
					<Input id="crd-channels" name="channels" defaultValue="Email" class="@lg/settings:w-60" />
				</li>
				<li class={RECIPES.row}>
					<label for="crd-retention" class="text-[13px] font-medium text-fg-main">Data retention</label>
					<NativeSelect id="crd-retention" name="retention" options={RETENTION} defaultValue="90" class="@lg/settings:w-60" />
				</li>
			</ul>
			<SaveBar layout="footer" onReviewConflict={() => (reviewing = true)} />
		</section>
	</SettingsForm>
	<p class="m-0 min-h-5 text-xs text-fg-light" aria-live="polite" data-testid="crd-log">{log}</p>

	<Dialog bind:open={reviewing} title="Review changes" description="Pick what to keep, then save again against the latest version." size="lg" narrow="sheet">
		<form id="crd-review" method="post" onsubmit={applyChoices} class={cn(SETTINGS_CONTAINER, 'grid gap-3')}>
			<ConflictResolver fields={conflict} bind:value={keep} changedBy={{ name: 'Ben Ortiz', at: CHANGED_AT }} now={NOW}>
				{#snippet preview(choices)}
					{@const result = merged(choices, { teamName: conflict[0]?.mine ?? '', channels: conflict[1]?.mine ?? '', retention: RETENTION.find((r) => r.label === conflict[2]?.mine)?.value ?? '90' })}
					<p class="m-0 text-[13px] text-fg-main">{result.teamName} · {result.channels} · {retentionLabel(result.retention)}</p>
				{/snippet}
			</ConflictResolver>
		</form>
		{#snippet footer(close)}
			<Button variant="ghost" onclick={close}>Keep editing</Button>
			<Button type="submit" form="crd-review" variant="primary">Save with these choices</Button>
		{/snippet}
	</Dialog>

	<div class="grid gap-2">
		<p class="m-0 text-xs font-medium text-fg-light">In a narrow container (360px), posting natively:</p>
		<div class={cn(SETTINGS_CONTAINER, 'w-full max-w-[360px] rounded-window border border-card-border bg-card-bg p-3')}>
			<form
				method="post"
				action="/settings-demo/resolve"
				data-testid="crd-native"
				onsubmit={(event) => {
					event.preventDefault();
					postedNative = [...new FormData(event.currentTarget).entries()].map(([k, v]) => `${k}=${v}`).join(' · ');
				}}
				class="grid gap-3"
			>
				<input type="hidden" name="revision" value="13" />
				<ConflictResolver
					fields={[
						{ name: 'teamName', label: 'Team name', mine: 'Northwind Design', theirs: 'Northwind Studio Ltd' },
						{ name: 'channels', label: 'Channels', mine: 'Email, Chat', theirs: 'Email, Phone', allowBoth: true },
						{ name: 'retention', label: 'Data retention', mine: '30 days', theirs: '1 year', bothReason: 'Only one retention period can apply.' }
					]}
					defaultValue={{ teamName: 'mine' }}
					labels={{ legend: 'Keep which version?' }}
				/>
				<Button type="submit" variant="primary" class="justify-self-end">Apply choices</Button>
			</form>
		</div>
		<p class="m-0 min-h-5 text-xs text-fg-light" aria-live="polite" data-testid="crd-native-log">{postedNative}</p>
	</div>
</div>
