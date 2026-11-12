<script lang="ts" module>
	import type { SettingsNavLabels } from './SettingsNav.svelte';

	/** Every word the layout shows or announces: the navigation's words plus the index title. */
	export interface SettingsLayoutLabels extends SettingsNavLabels {
		/** Heading above the navigation. Empty for none. */
		title: string;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { setSettingsScope } from '../shared/context';
	import { ReadyGate } from '../shared/ready.svelte';
	import type { SettingsNavGroup } from '../shared/types';
	import SettingsNav, { type SettingsNavFilter } from './SettingsNav.svelte';
	import { markSettingsLayout } from './layout-context';
	import { layoutOverview, layoutView } from './shell';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		/** The navigation, in groups. */
		groups: SettingsNavGroup[];
		/**
		 * Id of the current section. With none (and `mode` not `section`), every width shows the
		 * index on its own: attention on top, then the grouped links, and `children` is not rendered.
		 */
		current?: string | null;
		/**
		 * What a narrow container shows while a section is current. `auto` and `section`: that
		 * section's page. `index`: the index. Wide containers show the rail beside the page.
		 * `section` also keeps the page (not the index) when nothing is current.
		 */
		mode?: 'auto' | 'section' | 'index';
		/** The page (usually a SettingsPage) for the current section. Your app loads it and passes it in. */
		children?: Snippet;
		/** Above the navigation (an account or team switcher). */
		navHeader?: Snippet;
		/** Under the navigation (a help link, a version line). */
		navFooter?: Snippet;
		/** Shown on top of the index (usually an AttentionList): in a narrow container, and at every width when nothing is current. */
		attention?: Snippet;
		/** A GET filter over the navigation (`?q=`). */
		filter?: SettingsNavFilter | false;
		/** Called as the filter text changes; it already filters in place. */
		onFilterChange?: (query: string) => void;
		/** Rail width in a wide container. Default `md`. */
		railWidth?: 'sm' | 'md';
		/** Overrides the not-yet-hydrated gate that JS-only affordances below wait for. */
		ready?: boolean;
		/** Level of the index title; group headings sit one below it. Default 2; use 1 when the layout is the whole page and nothing is current. */
		headingLevel?: 1 | 2 | 3;
		/** Words, merged over the English defaults. */
		labels?: Partial<SettingsLayoutLabels>;
		class?: string;
	}

	let {
		groups,
		current = null,
		mode = 'auto',
		children,
		navHeader,
		navFooter,
		attention,
		filter,
		onFilterChange,
		railWidth = 'md',
		ready,
		headingLevel = 2,
		labels,
		class: className = '',
		...rest
	}: Props = $props();

	const gate = new ReadyGate(() => ready);
	setSettingsScope({ ready: () => gate.current });
	markSettingsLayout();

	const view = $derived(layoutView(mode, current));
	/** Nothing is current: the index stands alone at every width, rather than a rail beside an empty page. */
	const overview = $derived(layoutOverview(mode, current));
	const title = $derived(labels?.title ?? 'Settings');
	const RAIL = { sm: '@3xl/settings:grid-cols-[13rem_minmax(0,1fr)]', md: '@3xl/settings:grid-cols-[15.5rem_minmax(0,1fr)]' } as const;
</script>

<div {...rest} data-view={view} data-overview={overview || undefined} class={cn('@container/settings w-full min-w-0 text-fg-main', className)}>
	<div class={cn('flex min-w-0 flex-col', !overview && '@3xl/settings:grid', !overview && RAIL[railWidth])}>
		<div data-settings-rail class={cn('min-w-0', overview ? 'block' : '@3xl/settings:block @3xl/settings:self-stretch @3xl/settings:border-e @3xl/settings:border-canvas-border', !overview && (view === 'index' ? 'block' : 'hidden'))}>
			<div class={cn('flex min-w-0 flex-col gap-4 p-4', overview ? 'mx-auto w-full max-w-2xl @3xl/settings:px-6 @3xl/settings:py-8' : '@3xl/settings:sticky @3xl/settings:top-0 @3xl/settings:max-h-svh @3xl/settings:overflow-y-auto @3xl/settings:px-3 @3xl/settings:py-5')}>
				{@render navHeader?.()}
				<SettingsNav {groups} {current} variant={overview ? 'index' : 'auto'} {filter} {onFilterChange} {headingLevel} title={title || undefined} {labels}>
					{#snippet top()}
						{#if attention}<div class={overview ? undefined : '@3xl/settings:hidden'}>{@render attention()}</div>{/if}
					{/snippet}
					{#snippet footer()}{@render navFooter?.()}{/snippet}
				</SettingsNav>
			</div>
		</div>
		{#if children && !overview}
			<div data-settings-page class={cn('min-w-0', view === 'index' ? 'hidden @3xl/settings:block' : 'block')}>
				{@render children()}
			</div>
		{/if}
	</div>
</div>
