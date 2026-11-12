<script lang="ts">
	import { Bell, Database, Palette, Search, SlidersHorizontal, UserRound, CreditCard } from '@lucide/svelte';
	import { SettingsSearch } from '$lib/settings/shell';
	import { CommandPalette } from '$lib/primitives/menus';
	import { KBD } from '$lib/primitives/menus/classes';
	import { toPaletteCommands, type SettingsIcon, type SettingsSearchEntry } from '$lib/settings/shared';
	import { SAMPLE_SETTINGS_SEARCH } from '$lib/fixtures/settings';
	import { pillClass } from '$lib/ui/styles';

	const ICONS: Record<string, SettingsIcon> = {
		Profile: UserRound,
		Notifications: Bell,
		Appearance: Palette,
		General: SlidersHorizontal,
		Data: Database,
		Billing: CreditCard
	};

	/** One entry per setting. `?setting=` links stand in for the app's deep links (`/settings/data#retention`). */
	const entries: SettingsSearchEntry[] = SAMPLE_SETTINGS_SEARCH.map((entry) => ({
		...entry,
		icon: ICONS[entry.section],
		href: `?setting=${entry.id}#settings-search`
	}));

	let query = $state('');
	let opened = $state('');
	let paletteOpen = $state(false);

	/** The palette's navigate, standing in for the app's router. */
	const commands = toPaletteCommands(entries, (href) => (opened = href));
</script>

<div class="flex min-w-0 flex-col gap-6">
	<div class="flex min-w-0 flex-wrap items-start gap-6">
		<div class="flex w-72 max-w-full flex-col gap-2">
			<p class="m-0 text-xs font-medium text-fg-light">Inline, at the top of a rail. Press <kbd class={KBD}>/</kbd> to jump here.</p>
			<div class="rounded-window border border-card-border bg-canvas-primary p-3">
				<SettingsSearch data-testid="search-inline" {entries} bind:value={query} shortcut="/" onSelect={(entry) => (opened = entry.href)} />
			</div>
		</div>
		<div class="flex min-w-0 flex-1 basis-72 flex-col gap-2">
			<p class="m-0 text-xs font-medium text-fg-light">The same entries in a command palette (in your app, give it <code>shortcut="mod+k"</code>)</p>
			<CommandPalette {commands} bind:open={paletteOpen} shortcut={false} searchLabel="Search settings" placeholder="Search settings…" emptyText="No settings match.">
				{#snippet trigger(part)}
					<button {...part} class={pillClass('secondary', 'md', 'w-full max-w-72 justify-start gap-2 text-fg-light')}>
						<Search aria-hidden="true" />
						<span class="flex-1 text-left">Jump to a setting…</span>
					</button>
				{/snippet}
			</CommandPalette>
			<p class="m-0 text-xs text-fg-light">Query: <span data-testid="search-query" class="text-fg-main">{query || '—'}</span> · Opened: <span data-testid="search-opened" class="text-fg-main">{opened || '—'}</span></p>
		</div>
	</div>
	<div class="flex min-w-0 flex-col gap-2">
		<p class="m-0 text-xs font-medium text-fg-light">A results page, rendered by the server for <code>?q=email</code> (works without JavaScript)</p>
		<div class="rounded-window border border-card-border bg-canvas-primary p-4">
			<SettingsSearch data-testid="search-page" {entries} variant="page" defaultValue="email" labels={{ label: 'Search all settings' }} />
		</div>
	</div>
</div>
