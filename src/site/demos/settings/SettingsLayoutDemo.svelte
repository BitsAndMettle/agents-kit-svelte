<script lang="ts">
	import { Bell, CreditCard, Database, LifeBuoy, Palette, ShieldCheck, SlidersHorizontal, UserRound, Users } from '@lucide/svelte';
	import { AttentionList, SettingsLayout, SettingsPage } from '$lib/settings/shell';
	import { Badge } from '$lib/primitives/display';
	import { NativeSelect, Switch } from '$lib/primitives/form';
	import { RECIPES, type AttentionItem, type SettingsIcon, type SettingsLink, type SettingsNavGroup } from '$lib/settings/shared';
	import { SAMPLE_ATTENTION, SAMPLE_SETTINGS_NAV } from '$lib/fixtures/settings';
	import { cn } from '$lib/ui/cn';
	import { segmentClass, SEGMENT_GROUP_CLASS } from '$lib/ui/styles';

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

	/** The sample navigation with icons. Links carry `?section=`, as a server route would read; the demo's router below follows them in place. */
	const groups: SettingsNavGroup[] = SAMPLE_SETTINGS_NAV.map((group) => ({
		...group,
		items: group.items.map((link) => ({ ...link, icon: ICONS[link.id], href: `?section=${link.id}#settings-layout` }))
	}));
	const links = groups.flatMap((g) => g.items);
	const INDEX_HREF = '?section=#settings-layout';

	/** What each sample section shows. */
	const ROWS: Record<string, { id: string; label: string; description: string; kind: 'switch' | 'select' | 'value'; on?: boolean; value?: string }[]> = {
		profile: [
			{ id: 'name', label: 'Display name', description: 'Shown on your comments and in member lists.', kind: 'value', value: 'Ada Park' },
			{ id: 'email', label: 'Contact email', description: 'Where we send receipts and security notices.', kind: 'value', value: 'ada@northwind.example' }
		],
		notifications: [
			{ id: 'digest', label: 'Email digest', description: 'A summary of activity once a day.', kind: 'switch', on: true },
			{ id: 'mentions', label: 'Mentions', description: 'When someone mentions you by name.', kind: 'switch', on: true },
			{ id: 'product', label: 'Product news', description: 'A short note when something new ships.', kind: 'switch', on: false }
		],
		appearance: [
			{ id: 'theme', label: 'Theme', description: 'Follows your device unless you pick one.', kind: 'select', value: 'system' },
			{ id: 'motion', label: 'Reduce motion', description: 'Fewer animations across the app.', kind: 'switch', on: false }
		],
		general: [
			{ id: 'team', label: 'Team name', description: 'Shown to everyone you invite.', kind: 'value', value: 'Northwind Studio' },
			{ id: 'week', label: 'Week starts on', description: 'Used by calendars and reports.', kind: 'select', value: 'monday' }
		],
		members: [
			{ id: 'seats', label: 'Members', description: '6 people have access.', kind: 'value', value: '6 of 50 seats' },
			{ id: 'invites', label: 'Allow members to invite', description: 'Otherwise only admins can.', kind: 'switch', on: true }
		],
		data: [
			{ id: 'retention', label: 'Data retention', description: 'How long activity is kept before it is deleted.', kind: 'select', value: '90' },
			{ id: 'export', label: 'Last export', description: 'Exports include every document and its history.', kind: 'value', value: '3 days ago' }
		],
		billing: [
			{ id: 'plan', label: 'Plan', description: 'Billed yearly.', kind: 'value', value: 'Team' },
			{ id: 'seats', label: 'Seats', description: 'Add seats before you invite more people.', kind: 'value', value: '42 of 50' }
		]
	};
	const SELECTS: Record<string, { value: string; label: string }[]> = {
		theme: [
			{ value: 'system', label: 'System' },
			{ value: 'light', label: 'Light' },
			{ value: 'dark', label: 'Dark' }
		],
		week: [
			{ value: 'monday', label: 'Monday' },
			{ value: 'sunday', label: 'Sunday' }
		],
		retention: [
			{ value: '30', label: '30 days' },
			{ value: '90', label: '90 days' },
			{ value: '365', label: '1 year' }
		]
	};

	const WIDTHS = [
		{ id: 'phone', label: 'Phone', px: 360 },
		{ id: 'tablet', label: 'Tablet', px: 900 },
		{ id: 'desktop', label: 'Desktop', px: 1300 }
	] as const;
	let width = $state<(typeof WIDTHS)[number]>(WIDTHS[1]);
	let current = $state<string | null>('notifications');
	let query = $state('');
	let attention = $state<AttentionItem[]>(SAMPLE_ATTENTION.map((item) => ({ ...item, action: { ...item.action, href: '?section=general#settings-layout' } })));
	const link = $derived<SettingsLink | undefined>(links.find((l) => l.id === current));

	/** The app's router: follows in-page links inside the frame. */
	function route(event: MouseEvent): void {
		const anchor = (event.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href$="#settings-layout"]');
		if (!anchor) return;
		event.preventDefault();
		const section = new URL(anchor.href).searchParams.get('section');
		if (section !== null) current = section || null;
	}

	async function dismiss(id: string): Promise<void> {
		await new Promise((resolve) => setTimeout(resolve, 600));
		attention = attention.filter((item) => item.id !== id);
	}
</script>

{#snippet body(sectionId: string)}
	{@const rows = ROWS[sectionId] ?? []}
	<section class={RECIPES.section} aria-labelledby="layout-demo-{sectionId}-title">
		<div class={RECIPES.sectionHeader}>
			<h3 id="layout-demo-{sectionId}-title" class="m-0 text-sm font-semibold text-fg-main">Preferences</h3>
		</div>
		{#if rows.length}
			<ul role="list" class={RECIPES.list}>
				{#each rows as row (row.id)}
					<li class={RECIPES.row}>
						<div class="min-w-0">
							<p id="layout-demo-{sectionId}-{row.id}" class="m-0 text-[13px] font-medium text-fg-main">{row.label}</p>
							<p id="layout-demo-{sectionId}-{row.id}-help" class="m-0 text-xs leading-5 text-fg-light">{row.description}</p>
						</div>
						{#if row.kind === 'switch'}
							<Switch defaultChecked={row.on} aria-labelledby="layout-demo-{sectionId}-{row.id}" aria-describedby="layout-demo-{sectionId}-{row.id}-help" />
						{:else if row.kind === 'select'}
							<NativeSelect class="w-full @lg/settings:w-44" options={SELECTS[row.id]} defaultValue={row.value} aria-labelledby="layout-demo-{sectionId}-{row.id}" aria-describedby="layout-demo-{sectionId}-{row.id}-help" />
						{:else}
							<span class="text-[13px] text-fg-main">{row.value}</span>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="m-0 px-4 py-6 text-[13px] text-fg-light">Nothing to set here yet.</p>
		{/if}
	</section>
{/snippet}

{#snippet attentionSlot()}
	<AttentionList items={attention} onDismiss={dismiss} headingLevel={3} />
{/snippet}

{#snippet help()}
	<a href="?help#settings-layout" class="inline-flex items-center gap-2 rounded-control px-2 py-1.5 text-[13px] text-fg-light no-underline hover:text-fg-main"><LifeBuoy aria-hidden="true" class="size-4" />Help and feedback</a>
{/snippet}

<div class="flex min-w-0 flex-col gap-4">
	<div class="flex flex-wrap items-center gap-3">
		<div role="group" aria-label="Frame width: phone, tablet or desktop" class={SEGMENT_GROUP_CLASS}>
			{#each WIDTHS as option (option.id)}
				<button type="button" aria-pressed={width.id === option.id} class={segmentClass(width.id === option.id)} onclick={() => (width = option)}>{option.px} px</button>
			{/each}
		</div>
		<p class="m-0 text-xs text-fg-light">Showing <span data-testid="layout-current">{current ?? 'the index'}</span>. Pick a section, then use the back link at phone width. With nothing picked, every width shows the index.</p>
	</div>
	<!-- The frame is a stand-in for the app's window; the router below is the app's, not the layout's. -->
	<div class="min-w-0 overflow-hidden rounded-window border border-card-border bg-canvas-primary">
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div data-testid="layout-frame" class="mx-auto max-w-full transition-[width] duration-300" style="width: {width.px}px" onclick={route}>
			<SettingsLayout {groups} {current} filter={{ value: query }} onFilterChange={(q) => (query = q)} attention={attention.length ? attentionSlot : undefined} navFooter={help}>
				<!-- With nothing current the layout shows the index on its own, attention on top, at every width. -->
				{#if link}
					<SettingsPage headingLevel={2} title={link.label} lead={link.description} icon={link.icon} backHref={INDEX_HREF} footnote="Changes here apply to everyone on the team.">
						{#snippet badges()}{#if link.dirty}<Badge tone="accent" size="sm">Unsaved</Badge>{/if}{/snippet}
						{@render body(link.id)}
					</SettingsPage>
				{/if}
			</SettingsLayout>
		</div>
	</div>
	<div class="min-w-0">
		<div class="flex flex-wrap gap-4 [&>figure]:m-0">
			<figure class="flex w-[360px] max-w-full flex-col gap-2">
				<figcaption class="text-xs text-fg-light">Phone, nothing selected: the index, attention on top</figcaption>
				<div data-testid="layout-index-frame" class="overflow-hidden rounded-window border border-card-border bg-canvas-primary">
					<SettingsLayout {groups} current={null} attention={attentionSlot} labels={{ title: 'Settings' }} />
				</div>
			</figure>
			<figure class="flex w-[360px] max-w-full flex-col gap-2">
				<figcaption class="text-xs text-fg-light">Phone, filtered by the server with <code>?q=webhooks</code></figcaption>
				<div data-testid="layout-nomatch-frame" class="overflow-hidden rounded-window border border-card-border bg-canvas-primary">
					<SettingsLayout {groups} current={null} filter={{ value: 'webhooks', action: '?#settings-layout' }} labels={{ title: 'Settings' }} />
				</div>
			</figure>
		</div>
	</div>
</div>
