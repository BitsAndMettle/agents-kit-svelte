<script lang="ts" module>
	/** Every word SettingsItemList shows or announces. */
	export interface SettingsItemListLabels {
		/** Badge on the item that is you, or this device. */
		current: string;
		/** Badge on a new item. */
		isNew: string;
		/** Accessible name of a row's overflow menu. */
		actionsFor: (label: string) => string;
		/** Announced on a row whose action failed without a message of its own. */
		failed: (label: string) => string;
		/** The selection summary: "3 selected". */
		selected: (count: number) => string;
		/** Accessible name of a row's selection checkbox. */
		select: (label: string) => string;
		/** Accessible name of the filter box. */
		filter: string;
		filterPlaceholder: string;
		/** The filter's submit button, shown until the page is ready (no JavaScript). */
		applyFilter: string;
		clearFilter: string;
		/** Shown when the filter matches nothing. */
		noMatch: (query: string) => string;
		/** Shown when there are no items and no `empty` prop. */
		empty: string;
		cancel: string;
		/** Default confirm button of a confirm-first action. */
		confirm: string;
	}
</script>

<script lang="ts" generics="T extends SettingsItem">
	import { tick, untrack, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Ellipsis, Plus } from '@lucide/svelte';
	import { cn } from '../../ui/cn';
	import { buttonClass, TONE_FILL_CLASS, TOUCH_TARGET_CLASS } from '../../ui/styles';
	import { isThenable } from '../../core/promise';
	import { Button } from '../../primitives/actions';
	import { Avatar, Badge, EmptyState } from '../../primitives/display';
	import { Checkbox, Input, createFieldState, setFieldContext } from '../../primitives/form';
	import { DANGER_TEXT } from '../../primitives/form/classes';
	import { DropdownMenu } from '../../primitives/menus';
	import { AlertDialog } from '../../primitives/overlays';
	import {
		actionButtonProps,
		getSettingsDraft,
		LOCK_ICONS,
		lockReasonText,
		nextFocusAfterRemoval,
		ReadyGate,
		RECIPES,
		restoreFocus,
		type SettingsAction,
		type SettingsItem,
		type SettingsItemAction,
		type SettingsResult
	} from '../shared';
	import { filterSettingsItems, groupSettingsItems, selectableIds } from './item-list';
	import { idPart } from './ids';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children' | 'title' | 'defaultValue'> {
		items: T[];
		/** The list's heading. */
		title?: string;
		description?: string;
		/** Shown beside the title ("6", "6 of 10 seats"). */
		count?: string | number;
		/** Heading level of the title (sub-group headings take the next level). Default 3. */
		headingLevel?: 2 | 3 | 4;
		/** Named sub-groups ("Invited"); items join one through `item.group`. */
		groups?: { id: string; label: string; description?: string }[];
		/** A control at the end of each row: a Switch, a NativeSelect pill for a role, a Button. */
		trailing?: Snippet<[T]>;
		/**
		 * Row actions. More than two (links aside) collapse into a menu once the page is ready. A `confirm`
		 * action never posts without its confirmation: give it an `href` (a ConsequenceDialog route) to
		 * work without JavaScript; without one it waits for the page to be ready.
		 */
		actions?: (item: T) => SettingsItemAction[];
		/** A row action was chosen (after its confirm). A promise shows loading on the row; return `{ error }` or reject to show a failure. Your app removes items. */
		onAction?: (actionId: string, item: T) => unknown;
		/** Without JavaScript (or `onAction`), row buttons post `actionId=itemId` here, and bulk buttons post `intent=actionId` with the selection. */
		formAction?: string;
		/** Buttons or links beside the title. */
		headerActions?: Snippet;
		/** Extra content in the footer strip. */
		footer?: Snippet;
		/** An "Add" action in the footer; `unavailable` shows its reason. */
		addAction?: SettingsAction;
		/** What an empty list says. */
		empty?: { title: string; description?: string; action?: SettingsAction };
		/** A filter box. Without JavaScript it is a GET form (`name`, default `q`); with it, the list filters as you type. `false` or absent: no filter. */
		filter?: { value?: string; name?: string } | false;
		onFilterChange?: (query: string) => void;
		/** Adds a checkbox to each row (locked rows cannot be selected). */
		selectable?: boolean;
		/** Selected ids. Bindable. A selection survives filtering. */
		value?: string[];
		defaultValue?: string[];
		/** Form name of the selection checkboxes. Default `selected`. */
		name?: string;
		onValueChange?: (ids: string[]) => void;
		/** The selection line: "3 selected · frees 2.9 GB". Default `labels.selected(n)`. */
		selectionSummary?: (ids: string[]) => string;
		/** Actions on the whole selection, in the selection footer. A `confirm` action waits for the page to be ready. */
		bulkActions?: SettingsItemAction[];
		/** A bulk action was chosen (after its confirm), with the selected ids that are not locked. A promise shows loading. */
		onBulkAction?: (actionId: string, ids: string[]) => unknown;
		/** Words, merged over the English defaults. */
		labels?: Partial<SettingsItemListLabels>;
		class?: string;
	}

	let {
		items,
		title,
		description,
		count,
		headingLevel = 3,
		groups = [],
		trailing,
		actions,
		onAction,
		formAction,
		headerActions,
		footer,
		addAction,
		empty,
		filter,
		onFilterChange,
		selectable = false,
		defaultValue,
		value = $bindable(defaultValue ?? []),
		name = 'selected',
		onValueChange,
		selectionSummary,
		bulkActions = [],
		onBulkAction,
		labels,
		class: className = '',
		...rest
	}: Props = $props();

	const text = $derived<SettingsItemListLabels>({
		current: 'This device',
		isNew: 'New',
		actionsFor: (label) => `More actions for ${label}`,
		failed: (label) => `Couldn't finish that for ${label}. Try again.`,
		selected: (n) => `${n} selected`,
		select: (label) => `Select ${label}`,
		filter: 'Filter',
		filterPlaceholder: 'Filter…',
		applyFilter: 'Filter',
		clearFilter: 'Clear filter',
		noMatch: (q) => `Nothing matches “${q}”.`,
		empty: 'Nothing here yet.',
		cancel: 'Cancel',
		confirm: 'Confirm',
		...labels
	});

	const uid = $props.id();
	const headingId = `${uid}-title`;
	const addReasonId = `${uid}-add-reason`;
	const draft = getSettingsDraft();
	const ready = new ReadyGate();
	// Row controls (a role pill, a switch) are their own controls: a surrounding Field must not name them.
	setFieldContext(createFieldState({ id: `${uid}-rows`, group: () => true }));

	/** Row buttons post natively only in a form of our own: never inside a SettingsForm. */
	const nativeForm = $derived(Boolean(formAction) && !draft);
	const subHeading = $derived(Math.min(headingLevel + 1, 6));

	let root = $state<HTMLElement | null>(null);
	let heading = $state<HTMLElement | null>(null);
	let query = $state(untrack(() => (filter ? (filter.value ?? '') : '')));
	let pending = $state<Record<string, string>>({});
	let failed = $state<Record<string, string>>({});
	let bulkPending = $state<string | null>(null);
	let bulkFailed = $state('');
	let asking = $state<{ action: SettingsItemAction; item?: T; ids?: string[] } | null>(null);
	let dialogOpen = $state(false);
	let postForm = $state<HTMLFormElement | null>(null);
	/** Where focus goes if an acted-on row disappears: its list and position. */
	const removals = new Map<string, { list: string; index: number }>();

	const shown = $derived(filterSettingsItems(items, query));
	const split = $derived(groupSettingsItems(shown, groups));
	const selected = $derived(new Set(value));
	const hiddenSelected = $derived(value.filter((id) => !shown.some((item) => item.id === id) && items.some((item) => item.id === id)));
	const actionable = $derived(selectableIds(items, value));
	/**
	 * Failures that arrived while the filter hid their row: the row's own status is not on the page,
	 * so the list announces them. Only new failures: hiding a row that already failed says nothing again.
	 */
	let unseenFailures = $state<Record<string, string>>({});
	const hiddenFailures = $derived(
		Object.keys(unseenFailures)
			.filter((id) => items.some((item) => item.id === id))
			.map((id) => unseenFailures[id])
			.join(' ')
	);

	// Once its row is shown again, the row carries its own failure and the list forgets it.
	$effect(() => {
		for (const item of shown) if (item.id in unseenFailures) delete unseenFailures[item.id];
	});

	function fail(item: T, message: string): void {
		removals.delete(item.id);
		failed[item.id] = message;
		if (!shown.some((s) => s.id === item.id)) unseenFailures[item.id] = message;
	}

	// A removed row takes its focused button with it: move focus to the next row, the previous, then the heading.
	$effect(() => {
		const ids = new Set(items.map((item) => item.id));
		const gone = [...removals].filter(([id]) => !ids.has(id));
		if (gone.length === 0) return;
		for (const [id] of gone) removals.delete(id);
		const [, at] = gone[gone.length - 1];
		void tick().then(() => {
			const active = document.activeElement;
			if (active && active !== document.body && root?.contains(active)) return;
			const list = root?.querySelector<HTMLElement>(`[data-list="${at.list}"]`);
			const target = list ? nextFocusAfterRemoval(list, at.index, heading) : heading;
			target?.focus();
		});
	});

	function setSelected(id: string, on: boolean): void {
		const next = on ? [...value.filter((v) => v !== id), id] : value.filter((v) => v !== id);
		value = next;
		onValueChange?.(next);
	}

	function failureOf(result: unknown): string | undefined {
		const r = result as SettingsResult | undefined;
		if (!r || typeof r !== 'object') return undefined;
		return r.error || Object.values(r.errors ?? {}).find(Boolean) || r.conflict?.message || undefined;
	}

	async function perform(action: SettingsItemAction, item: T): Promise<void> {
		if (pending[item.id]) return;
		const list = root?.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(item.id)}"]`)?.closest<HTMLElement>('[data-list]');
		if (list) removals.set(item.id, { list: list.dataset.list ?? '', index: Array.from(list.children).findIndex((li) => (li as HTMLElement).dataset.itemId === item.id) });
		delete failed[item.id];
		delete unseenFailures[item.id];
		// Let a cleared message reach the page first, so a failure that comes straight back is announced again.
		await tick();
		try {
			let result = onAction?.(action.id, item);
			if (isThenable(result)) {
				pending[item.id] = action.id;
				result = await result;
			}
			const message = failureOf(result);
			if (message) fail(item, message);
		} catch {
			fail(item, text.failed(item.label));
		} finally {
			delete pending[item.id];
		}
	}

	async function performBulk(action: SettingsItemAction, ids: string[]): Promise<void> {
		if (bulkPending) return;
		bulkFailed = '';
		await tick();
		try {
			let result = onBulkAction?.(action.id, ids);
			if (isThenable(result)) {
				bulkPending = action.id;
				result = await result;
			}
			bulkFailed = failureOf(result) ?? '';
		} catch {
			bulkFailed = text.failed(action.label);
		} finally {
			bulkPending = null;
		}
	}

	function choose(action: SettingsItemAction, item: T): void {
		if (action.unavailable || item.lock) return;
		if (action.confirm) {
			asking = { action, item };
			dialogOpen = true;
			return;
		}
		void perform(action, item);
	}

	function chooseBulk(action: SettingsItemAction): void {
		const ids = actionable;
		if (action.unavailable || ids.length === 0) return;
		if (action.confirm) {
			asking = { action, ids };
			dialogOpen = true;
			return;
		}
		void performBulk(action, ids);
	}

	/** A confirmed action with no handler posts the way its button would have: `actionId=itemId` or `intent=actionId`. */
	function postNatively(fieldName: string, fieldValue: string): void {
		if (!postForm) return;
		const field = document.createElement('input');
		field.type = 'hidden';
		field.name = fieldName;
		field.value = fieldValue;
		postForm.append(field);
		postForm.requestSubmit();
		field.remove();
	}

	function confirmed(): void {
		const target = asking;
		if (!target) return;
		if (target.item) {
			if (onAction) void perform(target.action, target.item);
			else if (nativeForm) postNatively(target.action.id, target.item.id);
		} else if (target.ids) {
			if (onBulkAction) void performBulk(target.action, target.ids);
			else if (nativeForm) postNatively('intent', target.action.id);
		}
	}

	/**
	 * The confirm dialog closed (cancelled, escaped or confirmed). When its opener was a menu item it
	 * is gone, and focus would fall to the page: give it to the row's menu button (or the action
	 * button) instead. A removed row hands focus on through the removal effect.
	 */
	function returnFocus(): void {
		const target = asking;
		const active = document.activeElement;
		if (!target || !root || (active && active !== document.body && !active.closest('dialog'))) return;
		if (target.item) {
			const row = root.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(target.item.id)}"]`);
			restoreFocus(row?.querySelector<HTMLElement>('[data-row-menu]'), row?.querySelector<HTMLElement>(`[data-action="${CSS.escape(target.action.id)}"]`), heading);
		} else {
			restoreFocus(root.querySelector<HTMLElement>(`[data-bulk="${CSS.escape(target.action.id)}"]`), heading);
		}
	}

	let addLoading = $state(false);
	async function runAdd(): Promise<void> {
		if (!addAction?.onSelect || addAction.unavailable || addLoading) return;
		const result = addAction.onSelect();
		if (!isThenable(result)) return;
		addLoading = true;
		try {
			await result;
		} catch {
			// The app reports its own failure.
		} finally {
			addLoading = false;
		}
	}

	function setQuery(next: string): void {
		query = next;
		onFilterChange?.(next);
	}

	const reasonId = (item: T, suffix: string) => `${uid}-${idPart(item.id)}-${suffix}`;
	const actionReasonId = (item: T, action: SettingsItemAction) => reasonId(item, `a${idPart(action.id)}`);
	/** A link stays a link unless it must ask first and can (ready, with a handler): then it opens the confirm. */
	const asLink = (action: SettingsItemAction, item: T) =>
		Boolean(action.href) && !action.unavailable && !item.lock && !(action.confirm && ready.current && onAction);
	/** Only a plain, available action on an unlocked row posts on its own. */
	const posts = (action: SettingsItemAction, item?: T) => nativeForm && !action.unavailable && !item?.lock && !action.confirm;
</script>

{#snippet actionButtons(item: T)}
	{@const all = actions?.(item) ?? []}
	{@const links = all.filter((a) => asLink(a, item))}
	{@const buttons = all.filter((a) => !asLink(a, item))}
	{@const collapse = all.length > 2 && buttons.length > 0 && ready.current}
	{#each links as action (action.id)}
		<Button size="sm" variant={action.tone === 'danger' ? 'danger' : 'secondary'} href={action.href} aria-label={action.ariaLabel}>{action.label}</Button>
	{/each}
	{#if collapse}
		<DropdownMenu
			aria-label={text.actionsFor(item.label)}
			placement="bottom-end"
			items={buttons.map((action) => ({
				value: action.id,
				label: action.label,
				tone: action.tone === 'danger' ? ('danger' as const) : ('neutral' as const),
				disabled: Boolean(action.unavailable) || Boolean(item.lock) || Boolean(pending[item.id]),
				onSelect: () => choose(action, item)
			}))}
		>
			{#snippet trigger(part)}
				<button {...part} type="button" data-row-menu="" aria-busy={pending[item.id] ? 'true' : undefined} class={buttonClass('ghost', 'icon-sm', cn('relative', TOUCH_TARGET_CLASS))}><Ellipsis aria-hidden="true" /></button>
			{/snippet}
		</DropdownMenu>
	{:else}
		{#each buttons as action (action.id)}
			<Button
				size="sm"
				variant={action.tone === 'danger' ? 'danger' : 'secondary'}
				type={posts(action, item) ? 'submit' : 'button'}
				name={posts(action, item) ? action.id : undefined}
				value={posts(action, item) ? item.id : undefined}
				softDisabled={Boolean(action.unavailable) || Boolean(item.lock) || (Boolean(action.confirm) && !ready.current)}
				aria-label={action.ariaLabel}
				aria-describedby={action.unavailable ? actionReasonId(item, action) : item.lock ? reasonId(item, 'lock') : undefined}
				loading={pending[item.id] === action.id}
				data-action={action.id}
				onclick={(event: MouseEvent) => {
					if (!onAction && !action.confirm) return;
					event.preventDefault();
					choose(action, item);
				}}
			>
				{action.label}
			</Button>
		{/each}
	{/if}
{/snippet}

{#snippet row(item: T)}
	{@const LockIcon = item.lock ? LOCK_ICONS[item.lock.kind] : undefined}
	{@const ItemIcon = item.icon}
	{@const unavailable = (actions?.(item) ?? []).filter((a) => a.unavailable)}
	{@const isSelected = selected.has(item.id)}
	<li
		data-item-id={item.id}
		data-current={item.current ? '' : undefined}
		data-new={item.isNew ? '' : undefined}
		data-locked={item.lock?.kind}
		class={cn(
			'relative flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 border-t border-canvas-border px-4 py-3 first:border-t-0',
			item.isNew && 'bg-accent-subtle/40',
			isSelected && 'bg-canvas-secondary/60'
		)}
	>
		<!-- The checkbox, icon and text stay on one line; only the trailing controls wrap below them. -->
		<div class="flex min-w-0 flex-1 basis-56 items-center gap-3">
			{#if selectable}
				<Checkbox
					{name}
					value={item.id}
					checked={isSelected}
					disabled={Boolean(item.lock)}
					aria-label={text.select(item.label)}
					aria-describedby={item.lock ? reasonId(item, 'lock') : undefined}
					onCheckedChange={(on) => setSelected(item.id, on)}
				/>
			{/if}
			{#if item.avatar}
				<Avatar name={item.avatar.name} src={item.avatar.src} size="sm" decorative />
			{:else if ItemIcon}
				<span aria-hidden="true" class={RECIPES.iconTile}><ItemIcon /></span>
			{/if}
			<div class="min-w-0 flex-1">
				<p class="m-0 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-5">
					{#if item.href}
						<a href={item.href} class={cn('min-w-0 font-medium break-words text-fg-main underline-offset-2 hover:underline', item.mono && 'font-mono text-xs')}>{item.label}</a>
					{:else}
						<span class={cn('min-w-0 font-medium break-words text-fg-main', item.mono && 'font-mono text-xs')}>{item.label}</span>
					{/if}
					{#if item.current}<Badge size="sm" tone="accent">{text.current}</Badge>{/if}
					{#if item.isNew}<Badge size="sm" tone="accent" variant="outline">{text.isNew}</Badge>{/if}
					{#each item.badges ?? [] as badge (badge.label)}<Badge size="sm" tone={badge.tone ?? 'neutral'}>{badge.label}</Badge>{/each}
				</p>
				{#if item.description || item.meta?.length || item.status}
					<p class="m-0 mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs leading-5 text-fg-light">
						{#if item.description}<span class="min-w-0 break-words">{item.description}</span>{/if}
						{#each item.meta ?? [] as meta, mi (mi)}
							{#if item.description || mi > 0}<span aria-hidden="true">·</span>{/if}<span>{meta}</span>
						{/each}
						{#if item.status}
							{#if item.description || item.meta?.length}<span aria-hidden="true">·</span>{/if}
							<span class="inline-flex items-center gap-1 font-medium text-fg-main" data-tone={item.status.tone ?? 'neutral'}>
								<span aria-hidden="true" class={cn('size-1.5 rounded-full', TONE_FILL_CLASS[item.status.tone ?? 'neutral'])}></span>{item.status.label}
							</span>
						{/if}
					</p>
				{/if}
				{#if item.lock && LockIcon}
					<p id={reasonId(item, 'lock')} class={cn(RECIPES.note, 'm-0 mt-1')}><span aria-hidden="true" class="contents"><LockIcon /></span><span>{lockReasonText(item.lock)}</span></p>
				{/if}
				{#each unavailable as action (action.id)}
					<p id={actionReasonId(item, action)} class="m-0 mt-1 text-xs leading-5 text-fg-light">{action.label}: {action.unavailable}</p>
				{/each}
				<p role="status" class={cn('m-0 text-xs leading-5 font-medium', DANGER_TEXT, !failed[item.id] && 'sr-only')}>{failed[item.id] ?? ''}</p>
			</div>
		</div>
		{#if trailing || actions}
			<div class="flex shrink-0 flex-wrap items-center justify-end gap-2 @max-lg/settings:w-full @max-lg/settings:pl-11">
				{#if trailing}{@render trailing(item)}{/if}
				{@render actionButtons(item)}
			</div>
		{/if}
	</li>
{/snippet}

{#snippet body()}
	{#if items.length === 0}
		{#if empty}
			<EmptyState size="compact" title={empty.title} description={empty.description} headingLevel={subHeading as 3 | 4 | 5}>
				{#snippet primaryAction()}
					{#if empty.action}<Button size="sm" {...actionButtonProps(empty.action, `${uid}-empty-reason`)}>{empty.action.label}</Button>{/if}
				{/snippet}
			</EmptyState>
			{#if empty.action?.unavailable}<p id="{uid}-empty-reason" class="m-0 px-4 pb-4 text-center text-xs text-fg-light">{empty.action.unavailable}</p>{/if}
		{:else}
			<p class="m-0 px-4 py-6 text-center text-[13px] text-fg-light">{text.empty}</p>
		{/if}
	{:else if shown.length === 0}
		<div class="flex flex-col items-center gap-2 px-4 py-6 text-center">
			<p class="m-0 text-[13px] text-fg-light">{text.noMatch(query)}</p>
			<Button size="xs" variant="ghost" onclick={() => setQuery('')}>{text.clearFilter}</Button>
		</div>
	{:else}
		{#if split.main.length > 0}
			<ul role="list" data-list="main" class={RECIPES.list}>
				{#each split.main as item (item.id)}{@render row(item)}{/each}
			</ul>
		{/if}
		{#each groups as group (group.id)}
			{@const members = split.groups.get(group.id) ?? []}
			{#if members.length > 0}
				<div class="border-t border-canvas-border">
					<div class="bg-canvas-secondary/40 px-4 pt-3 pb-2">
						<svelte:element this={`h${subHeading}`} class="m-0 text-xs font-semibold text-fg-main">{group.label} <span class="font-normal text-fg-light">· {members.length}</span></svelte:element>
						{#if group.description}<p class="m-0 text-xs leading-5 text-fg-light">{group.description}</p>{/if}
					</div>
					<ul role="list" data-list={group.id} class={RECIPES.list}>
						{#each members as item (item.id)}{@render row(item)}{/each}
					</ul>
				</div>
			{/if}
		{/each}
	{/if}

	<p role="status" data-list-status="" class={cn('m-0 text-xs leading-5 font-medium', DANGER_TEXT, hiddenFailures ? 'border-t border-canvas-border px-4 py-2' : 'sr-only')}>{hiddenFailures}</p>

	<!-- Selected rows the filter hides still post. -->
	{#each hiddenSelected as id (id)}<input type="hidden" {name} value={id} />{/each}

	{#if selectable}
		<div class={cn(RECIPES.sectionFooter, 'justify-between')} data-selection="">
			<p role="status" class="m-0 font-medium text-fg-main tabular-nums">{value.length > 0 && selectionSummary ? selectionSummary(value) : text.selected(value.length)}</p>
			{#if bulkActions.length > 0}
				<div class="flex flex-wrap items-center gap-2">
					{#each bulkActions as action (action.id)}
						<Button
							size="sm"
							variant={action.tone === 'danger' ? 'danger' : 'secondary'}
							type={posts(action) ? 'submit' : 'button'}
							name={posts(action) ? 'intent' : undefined}
							value={posts(action) ? action.id : undefined}
							softDisabled={Boolean(action.unavailable) || (Boolean(action.confirm) && !ready.current) || (ready.current && actionable.length === 0)}
							aria-label={action.ariaLabel}
							loading={bulkPending === action.id}
							data-bulk={action.id}
							onclick={(event: MouseEvent) => {
								if (!onBulkAction && !action.confirm) return;
								event.preventDefault();
								chooseBulk(action);
							}}
						>
							{action.label}
						</Button>
					{/each}
				</div>
			{/if}
			<p role="status" class={cn('m-0 text-xs font-medium', DANGER_TEXT, bulkFailed ? 'w-full' : 'sr-only')}>{bulkFailed}</p>
		</div>
	{/if}

	{#if addAction || footer}
		<div class={RECIPES.sectionFooter}>
			{#if addAction}
				<Button size="sm" {...actionButtonProps(addAction, addReasonId)} loading={addLoading} onclick={addAction.onSelect && !addAction.unavailable ? runAdd : undefined}>
					{#snippet leading()}<Plus aria-hidden="true" />{/snippet}
					{addAction.label}
				</Button>
				{#if addAction.unavailable}<span id={addReasonId} class="text-xs leading-5 text-fg-light">{addAction.unavailable}</span>{/if}
			{/if}
			{#if footer}{@render footer()}{/if}
		</div>
	{/if}
{/snippet}

<section {...rest} bind:this={root} aria-labelledby={title ? headingId : undefined} class={cn(RECIPES.section, className)}>
	{#if title || description || headerActions || count !== undefined}
		<div class={RECIPES.sectionHeader}>
			<div class="min-w-0 flex-1">
				<div class="flex min-w-0 flex-wrap items-center gap-2">
					{#if title}
						<svelte:element this={`h${headingLevel}`} id={headingId} bind:this={heading} tabindex="-1" class="m-0 text-sm font-semibold text-fg-main outline-none">{title}</svelte:element>
					{/if}
					{#if count !== undefined}<Badge size="sm" tone="neutral">{count}</Badge>{/if}
				</div>
				{#if description}<p class="m-0 mt-0.5 text-xs leading-5 text-fg-light">{description}</p>{/if}
			</div>
			{#if headerActions}<div class="flex shrink-0 flex-wrap items-center gap-2">{@render headerActions()}</div>{/if}
		</div>
	{/if}

	{#if filter && items.length > 0}
		{#snippet filterBox()}
			<Input
				type="search"
				size="sm"
				name={draft ? undefined : (filter && filter.name) || 'q'}
				value={query}
				aria-label={text.filter}
				placeholder={text.filterPlaceholder}
				autocomplete="off"
				onValueChange={setQuery}
				onkeydown={(event: KeyboardEvent) => {
					// Inside a SettingsForm, Enter in the filter must not save the form.
					if (draft && event.key === 'Enter') event.preventDefault();
				}}
				class="min-w-0 flex-1"
			/>
		{/snippet}
		{#if draft}
			<div role="search" class="flex items-center gap-2 border-b border-canvas-border px-4 py-2.5">{@render filterBox()}</div>
		{:else}
			<form method="get" role="search" class="m-0 flex items-center gap-2 border-b border-canvas-border px-4 py-2.5" onsubmit={(event) => event.preventDefault()}>
				{@render filterBox()}
				{#if !ready.current}<Button type="submit" size="sm" variant="secondary">{text.applyFilter}</Button>{/if}
			</form>
		{/if}
	{/if}

	{#if nativeForm}
		<form bind:this={postForm} method="post" action={formAction} class="m-0">{@render body()}</form>
	{:else}
		{@render body()}
	{/if}
</section>

<AlertDialog
	bind:open={dialogOpen}
	title={asking?.action.confirm?.title ?? ''}
	description={asking?.action.confirm?.description ?? ''}
	confirmLabel={asking?.action.confirm?.confirmLabel ?? text.confirm}
	cancelLabel={text.cancel}
	tone={asking?.action.tone === 'danger' ? 'danger' : 'neutral'}
	onConfirm={confirmed}
	onclose={returnFocus}
/>
