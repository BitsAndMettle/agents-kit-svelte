<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { SettingLock, SettingsAction } from '../shared/types';

	/** Every word the page frame shows or announces. */
	export interface SettingsPageLabels {
		/** The back link to the index, shown in a narrow container. */
		back: string;
		/** Accessible name of the breadcrumb. */
		breadcrumb: string;
		/** Shown (as an alert) when a scope action's callback rejected. A returned `{ error }` is shown instead. */
		actionFailed: string;
	}

	/**
	 * A non-dismissible note about the whole page (test mode, preview, read-only, sample). With
	 * `lock`, every control below is locked and described by the lock's reason.
	 */
	export interface SettingsPageScope {
		label: string;
		description?: string | Snippet;
		tone?: 'neutral' | 'accent' | 'warning';
		/**
		 * Up to two ways forward ("Request access"). An `href` is a link. An `intent` posts
		 * `intent=<value>` from a small `<form method="post">` (to `formAction`), which works without
		 * JavaScript; with an `onSelect` as well, the callback runs instead and the post is cancelled.
		 * A callback's `{ error }` or rejection is shown under the note.
		 */
		actions?: SettingsAction[];
		/** Where an `intent` action posts. Default: the current page. */
		formAction?: string;
		lock?: SettingLock;
	}
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { ArrowLeft, Info, Lock } from '@lucide/svelte';
	import { cn } from '../../ui/cn';
	import { isThenable } from '../../core/promise';
	import { Button } from '../../primitives/actions';
	import { Alert } from '../../primitives/display';
	import { Breadcrumb } from '../../primitives/navigation';
	import { getSettingsDraft, getSettingsScope, setSettingsScope, type SettingsScope } from '../shared/context';
	import { ReadyGate } from '../shared/ready.svelte';
	import { lockReasonText, pickLock } from '../shared/lock';
	import { LOCK_ICONS } from '../shared/lock-icons';
	import { actionButtonProps, RECIPES } from '../shared/recipes';
	import type { SettingsIcon } from '../shared/types';
	import { insideSettingsLayout } from './layout-context';
	import { readResult } from '../shared/undo';
	import { coveringLock } from './shell';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'title'> {
		/** The page heading. */
		title: string;
		/** One sentence under the title. */
		lead?: string | Snippet;
		/** Drawn in a tile before the title. */
		icon?: SettingsIcon;
		/** Badges after the title ("Beta", "Admin"). */
		badges?: Snippet;
		/** Buttons or links at the end of the header. */
		actions?: Snippet;
		/** The index, for the back link a narrow container shows. Omit for no back link. */
		backHref?: string;
		/** Parent pages of a sub-page, outermost first; the title is added as the current page. */
		breadcrumb?: { label: string; href?: string }[];
		/** A non-dismissible note about the whole page that can also lock everything below. */
		scope?: SettingsPageScope;
		/** Above the body (a ChangeNotice, an Alert). */
		banner?: Snippet;
		/** A closing note under the body. */
		footnote?: string | Snippet;
		footnoteIcon?: 'info' | 'lock' | 'none';
		/** Most the body grows to. `md` 48rem, `lg` 64rem, `full` no limit. Default `md`. */
		width?: 'md' | 'lg' | 'full';
		/** Level of the title. Default 1. */
		headingLevel?: 1 | 2;
		/** The body. It receives the page's settings scope, so plain controls can take its lock (`lockAttrs`). */
		children: Snippet<[SettingsScope]>;
		/** Words, merged over the English defaults. */
		labels?: Partial<SettingsPageLabels>;
		class?: string;
	}

	let {
		title,
		lead,
		icon: Icon,
		badges,
		actions,
		backHref,
		breadcrumb,
		scope,
		banner,
		footnote,
		footnoteIcon = 'info',
		width = 'md',
		headingLevel = 1,
		children,
		labels,
		class: className = '',
		...rest
	}: Props = $props();

	const text = $derived<SettingsPageLabels>({
		back: 'All settings',
		breadcrumb: 'Breadcrumb',
		actionFailed: 'Couldn’t complete that. Nothing changed; try again.',
		...labels
	});

	const id = $props.id();
	const reasonId = `${id}-scope-reason`;
	const parent = getSettingsScope();
	const gate = parent ? undefined : new ReadyGate();
	const ownContainer = !insideSettingsLayout();
	/** Inside a SettingsForm the intent buttons post with it: forms never nest. */
	const insideDraft = getSettingsDraft() !== undefined;

	/** The strongest of the page's own lock and one from above. */
	const covering = $derived(coveringLock(scope?.lock, reasonId, parent?.lock, pickLock));

	const pageScope: SettingsScope = {
		ready: () => parent?.ready() ?? gate?.current ?? false,
		get lock() {
			return covering;
		}
	};
	setSettingsScope(pageScope);

	const scopeActions = $derived((scope?.actions ?? (scope?.lock?.action ? [scope.lock.action] : [])).slice(0, 2));
	let busy = $state<Record<number, boolean>>({});
	/**
	 * What each scope action's last run reported: its `{ error }`, or the generic label after a
	 * rejection. Kept per action, so one action finishing never clears another's error.
	 */
	let failures = $state<Record<number, string | undefined>>({});

	async function run(index: number, onSelect: () => unknown): Promise<void> {
		if (busy[index]) return;
		failures[index] = undefined;
		let result: unknown;
		try {
			result = onSelect();
			if (isThenable(result)) {
				busy[index] = true;
				result = await result;
			}
		} catch {
			failures[index] = text.actionFailed;
			return;
		} finally {
			busy[index] = false;
		}
		const outcome = readResult(result);
		failures[index] = outcome.ok ? undefined : (outcome.error ?? text.actionFailed);
	}

	function select(event: MouseEvent, index: number, action: SettingsAction): void {
		if (!action.onSelect) return;
		// A handler takes over from the native post.
		if (action.intent !== undefined) event.preventDefault();
		void run(index, action.onSelect);
	}

	const WIDTH = { md: 'max-w-3xl', lg: 'max-w-5xl', full: '' } as const;
	const headingTag = $derived(`h${headingLevel}`);
	const ScopeIcon = $derived(scope?.lock ? LOCK_ICONS[scope.lock.kind] : undefined);
	const crumbs = $derived(breadcrumb?.length ? [...breadcrumb, { label: title }] : []);
</script>

{#snippet scopeIcon()}
	{#if ScopeIcon}<ScopeIcon />{:else}<Info />{/if}
{/snippet}

{#snippet scopeButtonList()}
	{#each scopeActions as action, index (index)}
		{@const reason = `${id}-action-${index}`}
		<Button size="sm" {...actionButtonProps(action, reason, { ready: pageScope.ready() })} loading={busy[index] ?? false} onclick={action.onSelect ? (event: MouseEvent) => select(event, index, action) : undefined}>{action.label}</Button>
		{#if action.unavailable}<span id={reason} class="text-xs text-fg-light">{action.unavailable}</span>{/if}
	{/each}
{/snippet}

<!--
	The wrapper never changes while the page is shown: swapping it as actions come and go would
	rebuild every button and drop focus. Links and unavailable buttons inside the form post nothing.
-->
{#snippet scopeButtons()}
	{#if !insideDraft}
		<form method="post" action={scope?.formAction} data-settings-scope-form class="contents">{@render scopeButtonList()}</form>
	{:else}
		{@render scopeButtonList()}
	{/if}
{/snippet}

<div {...rest} class={cn('w-full min-w-0 text-fg-main', ownContainer && '@container/settings', className)}>
	<div class={cn('flex w-full min-w-0 flex-col gap-5 px-4 py-5 @lg/settings:px-6 @lg/settings:py-6', WIDTH[width])}>
		{#if backHref || crumbs.length}
			<div class="flex min-w-0 flex-col gap-2">
				{#if backHref}
					<a href={backHref} data-settings-back class="inline-flex items-center gap-1.5 self-start rounded-control py-1 pe-2 text-[13px] font-medium text-fg-light no-underline hover:text-fg-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary @3xl/settings:hidden">
						<ArrowLeft aria-hidden="true" class="size-4 rtl:-scale-x-100" />{text.back}
					</a>
				{/if}
				{#if crumbs.length}<Breadcrumb items={crumbs} aria-label={text.breadcrumb} class="text-[13px]" />{/if}
			</div>
		{/if}
		<header class="flex min-w-0 flex-wrap items-start gap-x-4 gap-y-3">
			{#if Icon}<span aria-hidden="true" class={cn(RECIPES.iconTile, 'size-10 [&_svg]:size-5')}><Icon /></span>{/if}
			<div class="flex min-w-0 flex-1 basis-40 flex-col gap-1">
				<div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
					<svelte:element this={headingTag} class="m-0 text-xl font-semibold tracking-[-0.015em] break-words text-fg-main">{title}</svelte:element>
					{@render badges?.()}
				</div>
				{#if typeof lead === 'string'}<p class="m-0 text-[13px] leading-5 text-fg-light">{lead}</p>{:else if lead}<div class="text-[13px] leading-5 text-fg-light">{@render lead()}</div>{/if}
			</div>
			{#if actions}<div class="flex flex-wrap items-center gap-2">{@render actions()}</div>{/if}
		</header>
		{#if scope}
			<Alert tone={scope.tone ?? 'neutral'} title={scope.label} description={typeof scope.description === 'string' ? scope.description : ''} icon={scopeIcon} actions={scopeActions.length ? scopeButtons : undefined} data-settings-scope={scope.lock?.kind ?? ''}>
				{#if typeof scope.description === 'function'}{@render scope.description()}{/if}
				{#if scope.lock}
					<p id={reasonId} class="m-0 text-[13px] text-fg-main/80">{lockReasonText(scope.lock)}{#if scope.lock.source}<span class="block text-xs text-fg-main/70">{scope.lock.source}</span>{/if}</p>
				{/if}
				{#each scopeActions as _, index (index)}
					{#if failures[index]}<p role="alert" data-settings-scope-error class="m-0 text-[13px] font-medium text-fg-main">{failures[index]}</p>{/if}
				{/each}
			</Alert>
		{/if}
		{@render banner?.()}
		<div class="flex min-w-0 flex-col gap-6">
			{@render children(pageScope)}
		</div>
		{#if footnote}
			<div class={RECIPES.note}>
				{#if footnoteIcon === 'info'}<Info aria-hidden="true" />{:else if footnoteIcon === 'lock'}<Lock aria-hidden="true" />{/if}
				{#if typeof footnote === 'string'}<p class="m-0">{footnote}</p>{:else}<div>{@render footnote()}</div>{/if}
			</div>
		{/if}
	</div>
</div>
