<script lang="ts">
	import { Info, Lock } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Badge } from '../../primitives/display';
	import { DANGER_TEXT } from '../../primitives/form/classes';
	import { cn } from '../../ui/cn';
	import type { UiTone } from '../../ui/styles';
	import { getSectionContext, getSettingsScope, setSectionContext, setSettingsScope, type SettingsScope } from '../shared/context';
	import { pickLock } from '../shared/lock';
	import { ReadyGate } from '../shared/ready.svelte';
	import { RECIPES, SETTINGS_CONTAINER } from '../shared/recipes';
	import type { SettingLock, SettingsHandler } from '../shared/types';
	import LockReason, { type LockReasonLabels } from './LockReason.svelte';

	export interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children' | 'title'> {
		/** Names the section: its heading, and the section's accessible name. */
		title: string;
		/** Help text under the title. */
		description?: string | Snippet;
		/** Id of the root, for deep links (`#notifications`). */
		id?: string;
		/** Heading level. Default 2, or one below the enclosing section. */
		headingLevel?: 2 | 3 | 4;
		/** A count shown beside the title ("6"). */
		count?: string | number;
		/** A status badge beside the title. The label says it; the tone only adds colour. */
		status?: { label: string; tone?: UiTone; dot?: boolean };
		/** Trailing header content (a link, a button). */
		actions?: Snippet;
		/** `danger` for a danger zone, placed last on the page. */
		tone?: 'default' | 'danger';
		/** Locks everything inside. Rows below are disabled and described by this one reason, shown in the header. */
		lock?: SettingLock;
		/** Request flow for the section's lock. */
		onRequest?: SettingsHandler<[]>;
		lockLabels?: Partial<LockReasonLabels>;
		/** `columns` lays nested sections side by side on wide containers. */
		layout?: 'rows' | 'columns';
		/** False renders the body as a plain block (facts, a paragraph) instead of a `<ul role="list">` of rows. */
		list?: boolean;
		/** The rows: SettingsRow, SettingsToggle, RequestedChange or nested SettingsSection, each an `<li>`. */
		children: Snippet;
		/** Shown, without JavaScript too, while the list holds no rows. */
		empty?: Snippet;
		/** A strip at the bottom of the card (an add row, a save bar). */
		footer?: Snippet;
		/** A footnote below the card. */
		note?: string | Snippet;
		noteIcon?: 'info' | 'lock' | 'none';
		/** An explainer beside the card on wide containers, below it on narrow ones. */
		aside?: Snippet;
		asideTitle?: string;
		asideWidth?: 'sm' | 'md';
		class?: string;
	}

	let {
		title,
		description,
		id,
		headingLevel,
		count,
		status,
		actions,
		tone = 'default',
		lock,
		onRequest,
		lockLabels,
		layout = 'rows',
		list = true,
		children,
		empty,
		footer,
		note,
		noteIcon = 'info',
		aside,
		asideTitle,
		asideWidth = 'sm',
		class: className = '',
		...rest
	}: Props = $props();

	const uid = $props.id();
	const parent = getSectionContext();
	const parentScope = getSettingsScope();
	const gate = new ReadyGate();
	const nested = parent !== undefined;

	const level = $derived(headingLevel ?? (parent ? (Math.min(parent.headingLevel + 1, 5) as 2 | 3 | 4 | 5) : 2));
	const titleId = `${uid}-title`;
	const reasonId = `${uid}-reason`;
	const asideTitleId = `${uid}-aside-title`;
	const danger = $derived(tone === 'danger');

	const effectiveLock = $derived(pickLock(lock, parentScope?.lock?.lock));
	/** The header shows the reason only for this section's own lock; a stronger outer lock is explained where it is set. */
	const ownLock = $derived(Boolean(lock && effectiveLock === lock));

	setSectionContext({
		get depth() {
			return (parent?.depth ?? 0) + 1;
		},
		get headingLevel() {
			return level;
		},
		get layout() {
			return layout;
		}
	});
	const scope: SettingsScope = {
		ready: () => (parentScope ? parentScope.ready() : gate.current),
		get lock() {
			if (ownLock && effectiveLock) return { lock: effectiveLock, reasonId };
			return parentScope?.lock;
		}
	};
	setSettingsScope(scope);
</script>

{#snippet text(content: string | Snippet)}
	{#if typeof content === 'string'}{content}{:else}{@render content()}{/if}
{/snippet}

{#snippet heading(cls: string)}
	<svelte:element this={`h${level}`} id={titleId} class={cls}>{title}</svelte:element>
{/snippet}

{#snippet meta()}
	{#if count !== undefined}<Badge tone="neutral" size="sm" class="tabular-nums">{count}</Badge>{/if}
	{#if status}<Badge tone={status.tone ?? 'neutral'} dot={status.dot} size="sm">{status.label}</Badge>{/if}
{/snippet}

{#snippet body()}
	{#if list}
		<ul role="list" class={cn(RECIPES.list, 'peer/rows [&:not(:has(>li))]:hidden', layout === 'columns' && 'grid gap-0 @3xl/settings:grid-cols-2 @3xl/settings:[&>li+li]:border-l @3xl/settings:[&>li+li]:border-canvas-border')}>
			{@render children()}
		</ul>
		{#if empty}
			<div class="hidden px-4 py-6 text-center text-[13px] text-fg-light peer-[:not(:has(>li))]/rows:block">{@render empty()}</div>
		{/if}
	{:else}
		<div class="min-w-0">{@render children()}</div>
	{/if}
{/snippet}

{#snippet noteLine()}
	{#if note}
		<p class={cn(RECIPES.note, 'm-0 mt-2 px-1')}>
			{#if noteIcon === 'info'}<Info aria-hidden="true" />{:else if noteIcon === 'lock'}<Lock aria-hidden="true" />{/if}
			<span>{@render text(note)}</span>
		</p>
	{/if}
{/snippet}

{#if nested}
	<li {...rest} {id} data-tone={tone} class={cn('min-w-0 border-t border-canvas-border first:border-t-0', SETTINGS_CONTAINER, className)}>
		<div class="flex flex-wrap items-start gap-x-3 gap-y-1 px-4 pt-3 pb-1">
			<div class="flex min-w-0 flex-1 flex-col gap-0.5">
				<div class="flex flex-wrap items-center gap-2">
					{@render heading(cn('m-0 text-xs font-semibold tracking-wide text-fg-light uppercase', danger && DANGER_TEXT))}
					{@render meta()}
				</div>
				{#if description}<p class="m-0 text-xs leading-5 text-fg-light">{@render text(description)}</p>{/if}
			</div>
			{#if actions}<div class="flex shrink-0 items-center gap-2">{@render actions()}</div>{/if}
			{#if effectiveLock && ownLock}<LockReason lock={effectiveLock} id={reasonId} {onRequest} labels={lockLabels} class="basis-full" />{/if}
		</div>
		{@render body()}
		{#if footer}<div class={cn(RECIPES.sectionFooter, 'border-t-0')}>{@render footer()}</div>{/if}
		{#if note}<div class="px-4 pb-3">{@render noteLine()}</div>{/if}
	</li>
{:else}
	<section {...rest} {id} aria-labelledby={titleId} data-tone={tone} class={cn('min-w-0', SETTINGS_CONTAINER, className)}>
		<div class={cn('grid min-w-0 gap-4', aside && (asideWidth === 'md' ? '@3xl/settings:grid-cols-[minmax(0,1fr)_17rem]' : '@3xl/settings:grid-cols-[minmax(0,1fr)_14rem]'))}>
			<div class="min-w-0">
				<div class={cn(RECIPES.section, danger && RECIPES.danger)}>
					<header class={cn(RECIPES.sectionHeader, danger && 'bg-status-danger-subtle/40')}>
						<div class="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
							<div class="flex flex-wrap items-center gap-2">
								{@render heading(cn('m-0 text-sm leading-6 font-semibold text-fg-main', danger && DANGER_TEXT))}
								{@render meta()}
							</div>
							{#if description}<p class="m-0 text-xs leading-5 text-fg-light">{@render text(description)}</p>{/if}
						</div>
						{#if actions}<div class="flex shrink-0 flex-wrap items-center gap-2">{@render actions()}</div>{/if}
						{#if effectiveLock && ownLock}<LockReason lock={effectiveLock} id={reasonId} {onRequest} labels={lockLabels} class="basis-full pt-1" />{/if}
					</header>
					{@render body()}
					{#if footer}<div class={RECIPES.sectionFooter}>{@render footer()}</div>{/if}
				</div>
				{@render noteLine()}
			</div>
			{#if aside}
				<aside aria-labelledby={asideTitle ? asideTitleId : undefined} aria-label={asideTitle ? undefined : title} class="min-w-0 self-start rounded-card border border-canvas-border bg-canvas-secondary/50 p-4 text-xs leading-5 text-fg-light">
					{#if asideTitle}<p id={asideTitleId} class="m-0 mb-1.5 text-[13px] font-semibold text-fg-main">{asideTitle}</p>{/if}
					{@render aside()}
				</aside>
			{/if}
		</div>
	</section>
{/if}
