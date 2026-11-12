<script lang="ts">
	import { Bell, CreditCard, Database, Palette, ShieldCheck, SlidersHorizontal, UserRound, Users } from '@lucide/svelte';
	import { SettingsNav } from '$lib/settings/shell';
	import type { SettingsIcon, SettingsNavGroup } from '$lib/settings/shared';
	import { SAMPLE_SETTINGS_NAV } from '$lib/fixtures/settings';

	const ICONS: Record<string, SettingsIcon> = {
		profile: UserRound,
		notifications: Bell,
		appearance: Palette,
		general: SlidersHorizontal,
		members: Users,
		data: Database,
		billing: CreditCard,
		security: ShieldCheck
	};

	/** One set of groups feeds both looks. Links carry `?section=`; the demo's router follows them in place. */
	const groups: SettingsNavGroup[] = SAMPLE_SETTINGS_NAV.map((group) => ({
		...group,
		description: group.id === 'team' ? 'Changes here apply to everyone on the team.' : undefined,
		items: group.items.map((link) => ({
			...link,
			icon: ICONS[link.id],
			href: `?section=${link.id}#settings-nav`,
			// Written without a full stop, as many apps do: the nav still speaks it as its own sentence.
			...(link.id === 'members' && { description: 'Who has access, and their roles' })
		}))
	}));

	let current = $state('general');
	let reported = $state('');

	function route(event: MouseEvent): void {
		const anchor = (event.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href$="#settings-nav"]');
		if (!anchor) return;
		event.preventDefault();
		current = new URL(anchor.href).searchParams.get('section') ?? current;
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="flex min-w-0 flex-col gap-3" onclick={route}>
	<div class="flex min-w-0 flex-wrap items-start gap-6">
		<div class="flex w-60 max-w-full flex-col gap-2">
			<p class="m-0 text-xs font-medium text-fg-light">Rail</p>
			<div class="rounded-window border border-card-border bg-canvas-primary px-2 py-3">
				<SettingsNav data-testid="nav-rail" {groups} {current} variant="rail" filter={{}} onFilterChange={(q) => (reported = q)} labels={{ nav: 'Settings sections' }} />
			</div>
		</div>
		<div class="flex min-w-0 flex-1 basis-80 flex-col gap-2">
			<p class="m-0 text-xs font-medium text-fg-light">Index (what a phone shows)</p>
			<div class="max-w-[26rem] rounded-window border border-card-border bg-canvas-secondary p-3">
				<SettingsNav data-testid="nav-index" {groups} {current} variant="index" title="Settings" description="Northwind Studio" labels={{ nav: 'Settings index' }} />
			</div>
		</div>
	</div>
	<div class="flex min-w-0 flex-col gap-2">
		<p class="m-0 text-xs font-medium text-fg-light">Index, two up (<code>auto</code>: two cards from 32rem, the rail from 48rem)</p>
		<div class="max-w-[44rem] rounded-window border border-card-border bg-canvas-secondary p-3">
			<SettingsNav data-testid="nav-two-up" groups={groups.slice(1)} {current} variant="auto" columns={2} labels={{ nav: 'Team settings' }} />
		</div>
	</div>
	<p class="m-0 text-xs text-fg-light">Current: <span data-testid="nav-current" class="text-fg-main">{current}</span> · Filter reported: <span data-testid="nav-filter" class="text-fg-main">{reported || '—'}</span></p>
</div>
