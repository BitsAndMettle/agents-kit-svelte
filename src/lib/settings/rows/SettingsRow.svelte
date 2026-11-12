<script lang="ts" module>
	/**
	 * Only a disabled native control (a switch, a checkbox) may hide behind a lock badge: it takes no
	 * focus. A copy that holds anything focusable (a link, or a button that ignores the field's
	 * disabled) shows itself again. It is CSS, so it holds before hydration and without
	 * JavaScript too; a Tab stop is never invisible.
	 */
	const HIDDEN_COPY_CLASS =
		"sr-only [&:has(:is(a[href],button:not(:disabled),input:not(:disabled):not([type=hidden]),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex^='-'])))]:not-sr-only";

	/** Words of a SettingsRow. */
	export interface SettingsRowLabels {
		/** Tag on a row with an unsaved change. */
		unsaved: string;
		/** The saved value while the row has an unsaved change ("was 90 days"). */
		was: (value: string) => string;
		/** Announced while saving. */
		saving: string;
		/** Shown and announced after a save. */
		saved: string;
		/** Shown when `status` is `error` and no `error` text is given. */
		failed: string;
		/** Shown when `status` is `conflict`. */
		conflict: string;
		/** The summary mode's link. */
		edit: string;
		/** Name of the menu that holds the actions beyond the second. */
		moreActions: string;
		/** Shown when an action's `onSelect` rejects or throws (a returned `{error}` shows its own text). */
		actionFailed: string;
	}
</script>

<script lang="ts">
	import { Check, Ellipsis } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Button } from '../../primitives/actions';
	import { Badge, Spinner } from '../../primitives/display';
	import { DANGER_TEXT } from '../../primitives/form/classes';
	import { createFieldState, fieldControlAttrs, setFieldContext, type FieldControlAttrs, type FieldState } from '../../primitives/form/field';
	import { DropdownMenu } from '../../primitives/menus';
	import type { MenuEntry } from '../../primitives/menus/types';
	import { cn } from '../../ui/cn';
	import { buttonClass, STATUS_TEXT_CLASS, TOUCH_TARGET_CLASS } from '../../ui/styles';
	import { getSettingsDraft, getSettingsScope } from '../shared/context';
	import { pickLock } from '../shared/lock';
	import { ReadyGate } from '../shared/ready.svelte';
	import { actionButtonProps, RECIPES } from '../shared/recipes';
	import type { SettingLock, SettingsAction, SettingsHandler, SettingStatus } from '../shared/types';
	import LockReason, { type LockReasonLabels } from './LockReason.svelte';
	import { splitActions } from './helpers';
	import { SettingsHandlerRun } from '../shared/run.svelte';

	export interface Props extends Omit<HTMLAttributes<HTMLLIElement>, 'class' | 'children'> {
		/** Names the setting. With a `control`, it is the control's one `<label>`. */
		label: string | Snippet;
		/** Help text under the label; describes the control. */
		description?: string | Snippet;
		/** Inside a SettingsForm: the control's form name. The row registers it (`label`, `format`) so its change counts and shows "was X". */
		name?: string;
		/** The control. Kit controls inside wire themselves to the label, description, status and lock reason; the argument wires any other element. */
		control?: Snippet<[FieldControlAttrs]>;
		/** Id the control takes (default generated). Set it here, not on the control. */
		controlId?: string;
		/** The label is the control's `<label for>` (default). Set false for a control a `<label>` cannot name, such as a link: the label is then plain text, and the control spreads only the argument's `aria-describedby` so the description still describes it. */
		labelFor?: boolean;
		/** The control is several inputs (a RadioGroup, checkboxes): the right side becomes one group (a `<fieldset>`) named by the label and described by the description, status and lock reason. A lock disables everything in it. A kit RadioGroup inside takes no second name from the row. */
		group?: boolean;
		/** A read-only value shown instead of a control. */
		value?: string | Snippet;
		/** Shows `value` in the monospace face (ids, versions, paths). */
		mono?: boolean;
		/** An icon or avatar before the label. */
		leading?: Snippet;
		/** One trailing action, or your own snippet. An `onSelect` may return `{error}` or a promise: the button loads, and a failure shows in the row's alert. */
		action?: SettingsAction | Snippet;
		/** Trailing actions. More than two collapse into a "More actions" menu once the page is interactive; links and form intents always stay buttons. */
		actions?: SettingsAction[];
		/** Where the row's own change stands (instant controls set it). Wins over the form's state. */
		status?: SettingStatus;
		/** Error text; marks the control invalid. Inside a SettingsForm, the form's error for `name` is used when this is not set. */
		error?: string;
		/** Polite status text that replaces the default for the current status ("Undone"). */
		statusText?: string;
		/** Marks an unsaved change. Default: from the SettingsForm (`name`). */
		dirty?: boolean;
		/** The saved value's text while dirty. Default: from the SettingsForm (`name`). */
		previous?: string;
		/** What the change will do, shown only while dirty. */
		impact?: string | Snippet;
		/** Locks this row. The strongest of this, its section's and its page's lock applies. A `badge` hides a single disabled switch or checkbox behind it (still there for assistive technology); anything focusable stays visible beside the badge, and a `group` row always does. */
		lock?: SettingLock;
		/** Id of a reason shown elsewhere (one LockReason describing several rows). The row then shows no reason of its own. */
		reasonId?: string;
		/** Request flow for the row's own lock reason. */
		onRequest?: SettingsHandler<[]>;
		required?: boolean;
		/** Turns a posted value into display text for change summaries ("30" → "30 days"). */
		format?: (raw: string | string[]) => string;
		/** `auto` stacks on narrow containers and goes inline from 32rem; `inline` and `stacked` fix it. */
		layout?: 'auto' | 'inline' | 'stacked';
		/** Narrow summary mode: below 32rem, this summary and an Edit link replace the control. */
		summary?: Snippet;
		/** Where the summary's Edit link goes. */
		editHref?: string;
		/** Extra content on the status line, such as a Retry or Undo button. */
		feedback?: Snippet;
		labels?: Partial<SettingsRowLabels>;
		/** Words for the row's own lock reason. */
		lockLabels?: Partial<LockReasonLabels>;
		class?: string;
	}

	let {
		label,
		description,
		name,
		control,
		controlId,
		labelFor = true,
		group = false,
		value,
		mono = false,
		leading,
		action,
		actions,
		status,
		error,
		statusText,
		dirty,
		previous,
		impact,
		lock,
		reasonId,
		onRequest,
		required = false,
		format,
		layout = 'auto',
		summary,
		editHref,
		feedback,
		labels = {},
		lockLabels,
		class: className = '',
		...rest
	}: Props = $props();

	const uid = $props.id();
	const draft = getSettingsDraft();
	const scope = getSettingsScope();
	const ready = new ReadyGate(() => (scope ? scope.ready() : undefined));

	const words = $derived<SettingsRowLabels>({
		unsaved: 'Unsaved',
		was: (v) => `was ${v}`,
		saving: 'Saving…',
		saved: 'Saved',
		failed: "Couldn't save.",
		conflict: 'Changed elsewhere. Review it before saving.',
		edit: 'Edit',
		moreActions: 'More actions',
		actionFailed: "Couldn't do that. Try again.",
		...labels
	});

	const labelText = $derived(typeof label === 'string' ? label : (name ?? ''));

	$effect(() => {
		if (!draft || !name) return;
		return draft.register({ name, label: labelText, format });
	});

	const effectiveLock = $derived(pickLock(lock, scope?.lock?.lock));
	/** The row draws its own reason only for its own lock, and only when no shared reason is named. */
	const ownReason = $derived(Boolean(effectiveLock && effectiveLock === lock && !reasonId));
	const lockReasonId = $derived(
		effectiveLock ? (reasonId ?? (effectiveLock === lock ? `${uid}-reason` : scope?.lock?.reasonId)) : undefined
	);

	const isDirty = $derived(dirty ?? (draft && name ? draft.isDirty(name) : false));
	const was = $derived(previous ?? (draft && name ? draft.previous(name) : undefined));
	const errorText = $derived(
		error ?? (draft && name ? draft.fieldError(name) : undefined) ?? (status === 'error' ? words.failed : status === 'conflict' ? words.conflict : undefined)
	);
	const shownStatus = $derived<SettingStatus>(status ?? (errorText ? 'error' : 'idle'));
	/** The row's own actions: one runs at a time; its failure shows in the alert, its notice in the status. */
	const actionRun = new SettingsHandlerRun();
	let running = $state.raw<SettingsAction | undefined>(undefined);
	const actionError = $derived(actionRun.status === 'failed' ? (actionRun.error ?? words.actionFailed) : undefined);
	const liveText = $derived(
		statusText ??
			(shownStatus === 'pending' ? words.saving : shownStatus === 'saved' ? words.saved : actionRun.status === 'done' ? (actionRun.notice ?? '') : '')
	);

	const changeId = `${uid}-change`;
	const impactId = `${uid}-impact`;
	const statusId = `${uid}-status`;
	const labelId = `${uid}-label`;

	const field = createFieldState({
		id: uid,
		controlId: () => controlId,
		description: () => Boolean(description),
		error: () => Boolean(errorText),
		required: () => required,
		disabled: () => Boolean(effectiveLock),
		group: () => group,
		describedBy: () => [isDirty ? changeId : undefined, isDirty && impact ? impactId : undefined, liveText ? statusId : undefined, lockReasonId]
	});
	// In a group row the fieldset is the one group the label names, so the control gets no label id:
	// a RadioGroup would otherwise name itself by it too ("Size, group" then "Size, radio group").
	// The rest of the field state is the row's own, read through the prototype.
	setFieldContext(
		Object.create(field, {
			labelId: { enumerable: true, get: () => (group ? undefined : field.labelId) }
		}) as FieldState
	);
	const attrs = $derived(fieldControlAttrs(field));
	const groupDescribedBy = $derived(
		group ? [field.descriptionId, ...(field.describedBy ?? []), field.errorId].filter(Boolean).join(' ') || undefined : undefined
	);

	const actionList = $derived(actions ?? (action && typeof action !== 'function' ? [action as SettingsAction] : []));
	const split = $derived(ready.current ? splitActions(actionList) : { visible: actionList, overflow: [] });
	const menuItems = $derived<MenuEntry[]>(
		split.overflow.map((a, index) => ({
			value: `action-${index}`,
			label: a.label,
			tone: a.tone === 'danger' ? 'danger' : 'neutral',
			disabled: Boolean(a.unavailable),
			// Links and intents never reach the menu (splitActions), so an item only calls back.
			onSelect: () => void startAction(a)
		}))
	);

	/** Runs an action's `onSelect` unless one is pending. True when it returned a promise (now loading). */
	function startAction(a: SettingsAction): boolean {
		if (!a.onSelect || actionRun.pending) return false;
		running = a;
		void actionRun.run(a.onSelect);
		return actionRun.pending;
	}

	function runAction(a: SettingsAction, event: MouseEvent): void {
		// A promise means the callback handles it: a link with one does not also navigate.
		if (startAction(a)) event.preventDefault();
	}

	const layoutClass = $derived(
		layout === 'inline'
			? 'flex-row items-start justify-between gap-4 @lg/settings:items-center @lg/settings:gap-6'
			: layout === 'stacked'
				? '@lg/settings:flex-col @lg/settings:items-stretch @lg/settings:justify-start @lg/settings:gap-2'
				: ''
	);
	/** A lock badge ("Always on") replaces what the row shows. A control stays in the page, visually hidden and disabled, so assistive technology meets the same switch either way. */
	const badgeOnly = $derived(Boolean(effectiveLock?.badge));
	/** A group row shows its controls disabled beside the badge; a single control hides (see HIDDEN_COPY_CLASS). */
	const hideControl = $derived(badgeOnly && !group);
</script>

{#snippet text(content: string | Snippet)}
	{#if typeof content === 'string'}{content}{:else}{@render content()}{/if}
{/snippet}

{#snippet controlBody(draw: Snippet<[FieldControlAttrs]>)}
	{#if group}
		<fieldset aria-labelledby={labelId} aria-describedby={groupDescribedBy} disabled={Boolean(effectiveLock) || undefined} class="m-0 min-w-0 border-0 p-0">{@render draw(attrs)}</fieldset>
	{:else}
		{@render draw(attrs)}
	{/if}
{/snippet}

{#snippet controlArea()}
	{#if control && hideControl}
		<div class={HIDDEN_COPY_CLASS}>{@render controlBody(control)}</div>
		<!-- Exposed either way: the copy may show itself (HIDDEN_COPY_CLASS), and CSS cannot toggle aria-hidden. -->
		<Badge tone="neutral" variant="outline" size="lg">{effectiveLock?.badge}</Badge>
	{:else if control}
		{@render controlBody(control)}
		{#if badgeOnly}<Badge tone="neutral" variant="outline" size="lg">{effectiveLock?.badge}</Badge>{/if}
	{:else if badgeOnly}
		<Badge tone="neutral" variant="outline" size="lg">{effectiveLock?.badge}</Badge>
	{:else if value !== undefined}
		<span class={cn('min-w-0 text-[13px] break-words text-fg-main', mono && 'font-mono text-xs')}>{@render text(value)}</span>
	{/if}
{/snippet}

<li {...rest}
	aria-busy={shownStatus === 'pending' ? 'true' : undefined}
	data-status={shownStatus}
	data-dirty={isDirty ? '' : undefined}
	data-locked={effectiveLock?.kind}
	class={cn(RECIPES.row, isDirty && RECIPES.rowStaged, layoutClass, className)}
>
	<div class="flex min-w-0 flex-1 items-start gap-3">
		{#if leading}<div class="shrink-0 pt-0.5">{@render leading()}</div>{/if}
		<div class="flex min-w-0 flex-1 flex-col gap-0.5">
			<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
				{#if control && !group && labelFor}
					<label id={labelId} for={field.controlId} class="text-[13px] leading-5 font-medium text-fg-main">{@render text(label)}{#if required}<span aria-hidden="true" class="text-status-danger"> *</span>{/if}</label>
				{:else}
					<span id={labelId} class="text-[13px] leading-5 font-medium text-fg-main">{@render text(label)}</span>
				{/if}
				{#if isDirty}<Badge tone="accent" size="sm" aria-hidden="true">{words.unsaved}</Badge>{/if}
			</div>
			{#if description}
				<p id="{uid}-description" class="m-0 text-xs leading-5 text-fg-light">{@render text(description)}</p>
			{/if}
			{#if isDirty}
				<p id={changeId} class="m-0 text-xs leading-5 font-medium text-[color-mix(in_oklch,var(--ak-color-accent)_55%,var(--ak-color-fg))]">
					<span class="sr-only">{words.unsaved}{was !== undefined ? ', ' : ''}</span>{#if was !== undefined}{words.was(was)}{/if}
				</p>
				{#if impact}
					<p id={impactId} class="m-0 text-xs leading-5 text-fg-main">{@render text(impact)}</p>
				{/if}
			{/if}
			{#if effectiveLock && ownReason}
				<LockReason lock={effectiveLock} id={lockReasonId} {onRequest} labels={lockLabels} class="mt-1" />
			{/if}
			<div id="{uid}-error" role="alert" class={cn('text-xs leading-5 font-medium', DANGER_TEXT)}>{#if errorText}<p class="m-0">{errorText}</p>{/if}{#if actionError}<p class="m-0">{actionError}</p>{/if}</div>
			{#if feedback}<div class="flex flex-wrap items-center gap-2 empty:hidden">{@render feedback()}</div>{/if}
			{#each split.visible as a, index (index)}
				{#if a.unavailable}<p id="{uid}-action-{index}" class="m-0 text-xs leading-5 text-fg-light">{a.unavailable}</p>{/if}
			{/each}
		</div>
	</div>
	{#if control || value !== undefined || badgeOnly || actionList.length || (action && typeof action === 'function') || shownStatus === 'pending' || shownStatus === 'saved'}
		<div class="flex min-w-0 flex-wrap items-center gap-2 @lg/settings:shrink-0 @lg/settings:flex-nowrap @lg/settings:justify-end">
			{#if shownStatus === 'pending'}
				<Spinner size="sm" decorative class="text-fg-light" />
			{:else if shownStatus === 'saved'}
				<span aria-hidden="true" class={cn('inline-flex items-center gap-1 text-xs font-medium', STATUS_TEXT_CLASS.success)}><Check class="size-3.5" />{statusText ?? words.saved}</span>
			{/if}
			{#if summary}
				<div class="flex min-w-0 items-center gap-2 @lg/settings:hidden">
					<span class="min-w-0 text-[13px] text-fg-main">{@render summary()}</span>
					{#if editHref !== undefined}
						<Button href={editHref} size="xs" variant="secondary">{words.edit}<span class="sr-only"> {labelText}</span></Button>
					{/if}
				</div>
				<div class="min-w-0 @max-lg/settings:hidden">{@render controlArea()}</div>
			{:else}
				{@render controlArea()}
			{/if}
			{#if action && typeof action === 'function'}
				{@render (action as Snippet)()}
			{/if}
			{#each split.visible as a, index (index)}
				<Button {...actionButtonProps(a, a.unavailable ? `${uid}-action-${index}` : undefined, { ready: ready.current })} size="sm" loading={actionRun.pending && running === a} onclick={(event: MouseEvent) => runAction(a, event)}>{a.label}</Button>
			{/each}
			{#if split.overflow.length}
				<DropdownMenu items={menuItems} placement="bottom-end">
					{#snippet trigger(part)}
						<button {...part} type="button" aria-label={words.moreActions} class={cn(buttonClass('ghost', 'icon-sm'), TOUCH_TARGET_CLASS, 'relative')}><Ellipsis aria-hidden="true" /></button>
					{/snippet}
				</DropdownMenu>
			{/if}
		</div>
	{/if}
	<span id={statusId} role="status" class="sr-only">{liveText}</span>
</li>
