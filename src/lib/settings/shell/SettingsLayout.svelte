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
	import { layoutView } from './shell';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		/** The navigation, in groups. */
		groups: SettingsNavGroup[];
		/** Id of the current section. Null or undefined in a narrow container (with `mode="auto"`) shows the index. */
		current?: string | null;
		/**
		 * What a narrow container shows. `auto`: the index until a section is current, then that
		 * section's page. `section`: always the page. `index`: always the index. Wide containers
		 * always show the rail beside the page.
		 */
		mode?: 'auto' | 'section' | 'index';
		/** The page (usually a SettingsPage). Your app loads it and passes it in. */
		children?: Snippet;
		/** Above the navigation (an account or team switcher). */
		navHeader?: Snippet;
		/** Under the navigation (a help link, a version line). */
		navFooter?: Snippet;
		/** Shown on top of the index in a narrow container (usually an AttentionList). */
		attention?: Snippet;
		/** A GET filter over the navigation (`?q=`). */
		filter?: SettingsNavFilter | false;
		/** Called as the filter text changes; it already filters in place. */
		onFilterChange?: (query: string) => void;
		/** Rail width in a wide container. Default `md`. */
		railWidth?: 'sm' | 'md';
		/** Overrides the not-yet-hydrated gate that JS-only affordances below wait for. */
		ready?: boolean;
		/** Level of the index title; group headings sit one below it. Default 2. */
		headingLevel?: 2 | 3;
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
	const title = $derived(labels?.title ?? 'Settings');
	const RAIL = { sm: '@3xl/settings:grid-cols-[13rem_minmax(0,1fr)]', md: '@3xl/settings:grid-cols-[15.5rem_minmax(0,1fr)]' } as const;
</script>

<div {...rest} data-view={view} class={cn('@container/settings w-full min-w-0 text-fg-main', className)}>
	<div class={cn('flex min-w-0 flex-col @3xl/settings:grid', RAIL[railWidth])}>
		<div data-settings-rail class={cn('min-w-0 @3xl/settings:block @3xl/settings:self-stretch @3xl/settings:border-e @3xl/settings:border-canvas-border', view === 'index' ? 'block' : 'hidden')}>
			<div class="flex min-w-0 flex-col gap-4 p-4 @3xl/settings:sticky @3xl/settings:top-0 @3xl/settings:max-h-svh @3xl/settings:overflow-y-auto @3xl/settings:px-3 @3xl/settings:py-5">
				{@render navHeader?.()}
				<SettingsNav {groups} {current} variant="auto" {filter} {onFilterChange} {headingLevel} title={title || undefined} {labels}>
					{#snippet top()}
						{#if attention}<div class="@3xl/settings:hidden">{@render attention()}</div>{/if}
					{/snippet}
					{#snippet footer()}{@render navFooter?.()}{/snippet}
				</SettingsNav>
			</div>
		</div>
		{#if children}
			<div data-settings-page class={cn('min-w-0', view === 'index' ? 'hidden @3xl/settings:block' : 'block')}>
				{@render children()}
			</div>
		{/if}
	</div>
</div>
