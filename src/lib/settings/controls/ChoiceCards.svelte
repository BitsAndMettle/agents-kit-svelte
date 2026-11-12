<script lang="ts" module>
	/** Every word ChoiceCards shows or announces. */
	export interface ChoiceCardsLabels {
		/** Caption on the saved option. */
		current: string;
		/** Caption on a chosen option that is not saved yet. */
		changed: string;
		/** The Apply button of the no-JavaScript form (with `action`). */
		apply: string;
		saving: string;
		saved: string;
		/** Shown when an instant change failed and was reverted, unless the handler returned its own message. */
		failed: string;
		undo: string;
	}

	export type ChoiceCardsVariant = 'cards' | 'rows' | 'segmented' | 'auto';
</script>

<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Check } from '@lucide/svelte';
	import { cn } from '../../ui/cn';
	import { Button } from '../../primitives/actions';
	import { Badge, Spinner } from '../../primitives/display';
	import { getFieldContext, joinIds } from '../../primitives/form';
	import { DANGER_TEXT } from '../../primitives/form/classes';
	import {
		actionButtonProps,
		getSettingsDraft,
		getSettingsScope,
		InstantSetting,
		LOCK_ICONS,
		lockReasonText,
		pickLock,
		ReadyGate,
		RECIPES,
		type ChoiceOption,
		type SettingLock,
		type SettingsHandler
	} from '../shared';
	import { isDev } from '../shared/env';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'defaultValue'> {
		options: ChoiceOption[];
		/** The radios' form name; each posts `name=value`. */
		name: string;
		/** The chosen value. Bindable; with `onCommit` it only ever holds saved values. Ignored inside a SettingsForm. */
		value?: string | null;
		/** The starting choice, and what a form reset restores. Inside a SettingsForm, the saved value. */
		defaultValue?: string | null;
		/** The saved value, for the Current / Changed captions outside a SettingsForm. */
		savedValue?: string;
		/** Every choice, before it is saved. */
		onValueChange?: (value: string) => void;
		/** Instant mode: called with each choice; shows saving, saved, Undo, and reverts on failure. Ignored inside a SettingsForm. */
		onCommit?: SettingsHandler<[string]>;
		/** Instant mode without JavaScript: the radios post here, with an Apply button that hides once the page is ready. */
		action?: string;
		/** `cards`, `rows`, `segmented`, or `auto` (cards, segmented in a narrow settings container). Default `cards`. */
		variant?: ChoiceCardsVariant;
		/** Card columns in a wide enough settings container. Default: 2 for two options, 4 for four, else 3. */
		columns?: 2 | 3 | 4;
		/** A picture above a card's text (a theme swatch). Decorative. */
		preview?: Snippet<[ChoiceOption, { checked: boolean }]>;
		/** Replaces a card's text (an avatar and a name). Decorative: the option's label and description are what assistive technology reads. */
		option?: Snippet<[ChoiceOption, { checked: boolean }]>;
		/** A line under the choices about the chosen value (what a role can do). */
		readout?: Snippet<[string | null]>;
		required?: boolean;
		disabled?: boolean;
		invalid?: boolean;
		/** Locks the whole choice, with a visible reason. A surrounding section or page lock applies too. */
		lock?: SettingLock;
		/** Names the group when no Field or settings row does. */
		'aria-label'?: string;
		/** Words, merged over the English defaults. */
		labels?: Partial<ChoiceCardsLabels>;
		class?: string;
	}

	let {
		options,
		name,
		defaultValue,
		value = $bindable(defaultValue ?? null),
		savedValue,
		onValueChange,
		onCommit,
		action,
		variant = 'cards',
		columns,
		preview,
		option: optionSnippet,
		readout,
		required = false,
		disabled = false,
		invalid = false,
		lock,
		'aria-label': ariaLabel,
		'aria-labelledby': labelledBy,
		'aria-describedby': describedBy,
		labels,
		class: className = '',
		...rest
	}: Props = $props();

	const text = $derived<ChoiceCardsLabels>({
		current: 'Current',
		changed: 'Changed',
		apply: 'Apply',
		saving: 'Saving…',
		saved: 'Saved',
		failed: "Couldn't save. Changed back.",
		undo: 'Undo',
		...labels
	});

	const uid = $props.id();
	const statusId = `${uid}-status`;
	const lockId = `${uid}-lock`;
	const formId = `${uid}-form`;
	const field = getFieldContext();
	const scope = getSettingsScope();
	const draft = getSettingsDraft();
	// The scope's readiness (SettingsLayout `ready`) holds back an instant choice with nothing to post.
	const ready = new ReadyGate(() => scope?.ready());

	if (draft && untrack(() => onCommit) && isDev()) {
		console.warn(`ChoiceCards "${untrack(() => name)}": onCommit is ignored inside a SettingsForm; the form's Save commits it.`);
	}

	// Instant mode: outside a SettingsForm, with a commit handler.
	const instant = !draft && untrack(() => onCommit)
		? new InstantSetting<string | null>({
				value: () => value ?? null,
				commit: () => (onCommit ? (next: string | null) => (next === null ? undefined : onCommit(next)) : undefined)
			})
		: undefined;
	// The app's state only ever holds saved values.
	$effect(() => {
		if (!instant) return;
		const committed = instant.committed;
		untrack(() => {
			if (value !== committed) value = committed;
		});
	});

	// Staged mode: uncontrolled radios, so a choice made before hydration is kept. The saved and
	// chosen values are read back from the form after every edit, reset and save.
	const stagedStart = untrack(() => defaultValue ?? value ?? null);
	let stagedChosen = $state<string | null>(untrack(() => defaultValue ?? value ?? null));
	let stagedSaved = $state<string | null>(untrack(() => defaultValue ?? value ?? null));
	let root = $state<HTMLDivElement | null>(null);
	$effect(() => {
		if (!draft || !root) return;
		void draft.changes;
		const radios = Array.from(root.querySelectorAll<HTMLInputElement>(`input[type="radio"]`));
		stagedChosen = radios.find((r) => r.checked)?.value ?? null;
		stagedSaved = radios.find((r) => r.defaultChecked)?.value ?? null;
	});
	// Describe the field to the draft, so it counts as unsaved and reads "Theme: Light → Dark".
	$effect(() => {
		if (!draft) return;
		const labelIds = (labelledBy ?? (field ? field.labelId : '')).split(/\s+/).filter(Boolean);
		const own = ariaLabel ?? labelIds.map((id) => document.getElementById(id)?.textContent?.trim() ?? '').join(' ').trim();
		const byValue = new Map(options.map((o) => [o.value, o.label]));
		return draft.register({ name, label: own || name, format: (raw) => (Array.isArray(raw) ? raw : [raw]).map((v) => byValue.get(v) ?? v).join(', ') });
	});

	const chosen = $derived(draft ? stagedChosen : instant ? instant.current : (value ?? null));
	const saved = $derived(draft ? stagedSaved : savedValue);
	const showCaptions = $derived(Boolean(draft) || savedValue !== undefined);

	const groupLock = $derived(pickLock(lock, scope?.lock?.lock));
	const ownLock = $derived(groupLock !== undefined && groupLock === lock);
	const groupReasonId = $derived(groupLock ? (ownLock ? lockId : scope?.lock?.reasonId) : undefined);
	const isInvalid = $derived(invalid || Boolean(field?.invalid));
	const isRequired = $derived(required || Boolean(field?.required));
	// An instant control with nothing to post waits for the page to be ready.
	const waiting = $derived(Boolean(instant) && !action && !ready.current);
	const groupDisabled = $derived(disabled || Boolean(field?.disabled) || Boolean(groupLock) || waiting);
	const notesBelow = $derived(variant === 'segmented' || variant === 'auto');
	const cols = $derived(columns ?? (options.length <= 2 ? 2 : options.length === 4 ? 4 : 3));

	const status = $derived(instant?.status ?? 'idle');
	const describedByIds = $derived(
		joinIds(
			describedBy,
			field?.descriptionId,
			...(field?.describedBy ?? []),
			isInvalid ? field?.errorId : undefined,
			groupReasonId,
			instant ? statusId : undefined
		)
	);

	function choose(next: string): void {
		onValueChange?.(next);
		if (draft) {
			stagedChosen = next;
			return;
		}
		if (instant) {
			// The value Undo goes back to: only a change that saved offers Undo, and it started from this.
			undoTo = instant.committed;
			void instant.set(next);
			return;
		}
		value = next;
	}

	let undoTo: string | null = null;
	/**
	 * Undo hides its own button (a pending change offers none), so focus goes first to the radio the
	 * choice returns to, which is the checked one once Undo lands.
	 */
	function undo(): void {
		if (!instant || !root) return;
		const radios = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
		const target = radios.find((r) => r.value === undoTo && !r.disabled) ?? radios.find((r) => r.checked);
		target?.focus();
		void instant.undo();
	}

	const ids = (index: number) => ({
		title: `${uid}-o${index}`,
		description: `${uid}-o${index}-description`,
		badge: `${uid}-o${index}-badge`,
		caption: `${uid}-o${index}-caption`,
		lock: `${uid}-o${index}-lock`
	});

	/** Classes per part, per look. `auto` is the cards look that turns segmented below the settings `row` breakpoint. */
	const LOOK = {
		cards: {
			group: 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,7rem),1fr))] gap-2.5',
			item: 'relative flex min-w-0 cursor-pointer flex-col gap-2.5 rounded-card border border-card-border bg-card-bg p-3 text-left transition-[border-color,box-shadow,background-color] hover:border-fg-light/50 has-checked:border-accent-primary has-checked:shadow-[0_0_0_1px_var(--color-accent-primary)] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-primary/70 has-disabled:cursor-not-allowed has-disabled:hover:border-card-border group-aria-invalid/choices:border-status-danger/60',
			dot: '',
			preview: 'overflow-hidden rounded-control border border-canvas-border bg-canvas-secondary group-has-disabled/item:opacity-55',
			head: 'flex min-w-0 items-start gap-2.5 group-has-disabled/item:opacity-55',
			icon: cn(RECIPES.iconTile, 'size-7 [&_svg]:size-3.5 group-has-checked/item:bg-accent-subtle group-has-checked/item:text-accent-primary'),
			body: 'min-w-0 flex-1',
			title: 'text-[13px] leading-5 font-medium text-fg-main',
			description: 'mt-0.5 block text-xs leading-5 text-fg-light',
			badge: '',
			caption: 'flex flex-wrap items-center gap-1.5 text-[11px] leading-4 font-medium'
		},
		rows: {
			group: 'flex flex-col divide-y divide-canvas-border overflow-hidden rounded-card border border-card-border bg-card-bg group-aria-invalid/choices:border-status-danger/60',
			item: 'relative flex min-w-0 cursor-pointer flex-col gap-1 px-3.5 py-3 transition-colors hover:bg-canvas-primary has-checked:bg-accent-subtle/50 has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-accent-primary/70 has-disabled:cursor-not-allowed has-disabled:hover:bg-transparent',
			dot: '',
			preview: 'hidden',
			head: 'flex min-w-0 items-start gap-3 group-has-disabled/item:opacity-55',
			icon: cn(RECIPES.iconTile, 'size-7 [&_svg]:size-3.5'),
			body: 'min-w-0 flex-1',
			title: 'text-[13px] leading-5 font-medium text-fg-main',
			description: 'mt-0.5 block text-xs leading-5 text-fg-light',
			badge: '',
			caption: 'flex flex-wrap items-center gap-1.5 pl-7 text-[11px] leading-4 font-medium'
		},
		segmented: {
			group: 'flex w-full max-w-full min-w-0 flex-wrap items-stretch gap-0.5 rounded-2xl bg-canvas-secondary p-0.5 group-aria-invalid/choices:ring-1 group-aria-invalid/choices:ring-status-danger/60',
			item: 'relative flex h-7 min-w-0 flex-auto cursor-pointer items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-fg-light transition-colors hover:text-fg-main has-checked:bg-card-bg has-checked:text-fg-main has-checked:shadow-btn forced-colors:has-checked:outline-2 forced-colors:has-checked:-outline-offset-2 forced-colors:has-checked:outline-solid has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-accent-primary/70 has-disabled:cursor-not-allowed has-disabled:opacity-55 has-disabled:hover:text-fg-light',
			dot: 'sr-only',
			preview: 'hidden',
			head: 'flex min-w-0 items-center gap-1.5',
			icon: '[&_svg]:size-3.5 inline-flex shrink-0',
			body: 'min-w-0 truncate',
			title: 'truncate',
			description: 'sr-only',
			badge: 'sr-only',
			caption: 'sr-only'
		}
	};
	const AUTO_NARROW = {
		group: '@max-lg/settings:flex @max-lg/settings:w-full @max-lg/settings:flex-wrap @max-lg/settings:gap-0.5 @max-lg/settings:rounded-2xl @max-lg/settings:bg-canvas-secondary @max-lg/settings:p-0.5',
		item: '@max-lg/settings:h-7 @max-lg/settings:flex-auto @max-lg/settings:flex-row @max-lg/settings:items-center @max-lg/settings:justify-center @max-lg/settings:gap-1.5 @max-lg/settings:rounded-full @max-lg/settings:border-0 @max-lg/settings:bg-transparent @max-lg/settings:px-2.5 @max-lg/settings:py-0 @max-lg/settings:text-xs @max-lg/settings:text-fg-light @max-lg/settings:shadow-none @max-lg/settings:has-checked:bg-card-bg @max-lg/settings:has-checked:text-fg-main @max-lg/settings:has-checked:shadow-btn @max-lg/settings:forced-colors:has-checked:outline-2 @max-lg/settings:forced-colors:has-checked:-outline-offset-2 @max-lg/settings:forced-colors:has-checked:outline-solid',
		dot: '@max-lg/settings:sr-only',
		preview: '@max-lg/settings:hidden',
		head: '@max-lg/settings:items-center @max-lg/settings:gap-1.5 @max-lg/settings:opacity-100 @max-lg/settings:group-has-disabled/item:opacity-55',
		icon: '@max-lg/settings:size-auto @max-lg/settings:bg-transparent @max-lg/settings:text-current',
		body: '@max-lg/settings:truncate',
		title: '@max-lg/settings:text-xs @max-lg/settings:text-current',
		description: '@max-lg/settings:sr-only',
		badge: '@max-lg/settings:sr-only',
		caption: '@max-lg/settings:sr-only'
	};
	type Part = keyof typeof AUTO_NARROW;
	const look = (part: Part): string =>
		variant === 'auto' ? cn(LOOK.cards[part], AUTO_NARROW[part]) : LOOK[variant === 'rows' ? 'rows' : variant === 'segmented' ? 'segmented' : 'cards'][part];

	const COLUMNS = { 2: '@lg/settings:grid-cols-2', 3: '@lg/settings:grid-cols-3', 4: '@lg/settings:grid-cols-2 @3xl/settings:grid-cols-4' } as const;
	/** The radio dot: a ring that fills with the accent colour when checked. */
	const DOT =
		'm-0 mt-0.5 size-4 shrink-0 cursor-pointer appearance-none rounded-full border border-fg-light/60 bg-card-bg transition-[border-color,border-width] checked:border-[5px] checked:border-accent-primary disabled:cursor-not-allowed focus-visible:outline-none';
</script>

{#snippet lockNote(l: SettingLock, id: string, prefix?: string)}
	{@const Icon = LOCK_ICONS[l.kind]}
	<span id={id} class={cn(RECIPES.note, 'text-left')} data-lock={l.kind}>
		<span aria-hidden="true" class="contents"><Icon /></span>
		<span>{#if prefix}<span class="font-medium text-fg-main">{`${prefix}: `}</span>{/if}{lockReasonText(l)}{#if l.source}{' '}<span class="text-fg-light">({l.source})</span>{/if}</span>
	</span>
{/snippet}

<div {...rest}
	bind:this={root}
	role="radiogroup"
	aria-label={ariaLabel}
	aria-labelledby={ariaLabel ? labelledBy : (labelledBy ?? field?.labelId)}
	aria-describedby={describedByIds}
	aria-invalid={isInvalid ? 'true' : undefined}
	aria-required={isRequired ? 'true' : undefined}
	data-variant={variant}
	data-locked={groupLock?.kind}
	class={cn('group/choices flex min-w-0 flex-col gap-2', className)}
>
	<div class={cn(look('group'), (variant === 'cards' || variant === 'auto') && COLUMNS[cols])}>
		{#each options as option, index (option.value)}
			{@const id = ids(index)}
			{@const checked = chosen === option.value}
			{@const optionLock = option.lock}
			{@const isSaved = showCaptions && saved !== undefined && saved === option.value}
			{@const isChanged = showCaptions && checked && saved !== undefined && chosen !== saved}
			{@const badge = optionLock?.badge ?? option.badge}
			{@const Icon = option.icon}
			{@const attrs = {
				type: 'radio' as const,
				name,
				value: option.value,
				form: action && !draft ? formId : undefined,
				disabled: groupDisabled || option.disabled || Boolean(optionLock),
				required: isRequired,
				'aria-labelledby': id.title,
				'aria-describedby': joinIds(option.description ? id.description : undefined, badge ? id.badge : undefined, isSaved || isChanged ? id.caption : undefined, optionLock ? id.lock : undefined),
				'data-locked': optionLock?.kind,
				class: variant === 'segmented' ? 'sr-only' : cn(DOT, look('dot'))
			}}
			<label class={cn('group/item', look('item'))} data-checked={checked ? '' : undefined}>
				{#if preview}
					<span aria-hidden="true" class={cn('block', look('preview'))}>{@render preview(option, { checked })}</span>
				{/if}
				<span class={look('head')}>
					{#if draft}
						<!-- Uncontrolled inside a SettingsForm: the form's defaults are the saved value. -->
						<input {...attrs} defaultChecked={stagedStart === option.value} onchange={(event) => event.currentTarget.checked && choose(option.value)} />
					{:else}
						<input {...attrs} {checked} onchange={(event) => event.currentTarget.checked && choose(option.value)} />
					{/if}
					{#if Icon && !optionSnippet}<span aria-hidden="true" class={look('icon')}><Icon /></span>{/if}
					{#if optionSnippet}
						<span id={id.title} class="sr-only">{option.label}</span>
						{#if option.description}<span id={id.description} class="sr-only">{option.description}</span>{/if}
						<span aria-hidden="true" class={cn('min-w-0 flex-1', variant === 'segmented' && 'truncate')}>{@render optionSnippet(option, { checked })}</span>
					{:else}
						<span class={look('body')}>
							<span class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
								<span id={id.title} class={look('title')}>{option.label}</span>
								{#if badge}<span id={id.badge} class={look('badge')}><Badge size="sm" tone={optionLock ? 'neutral' : 'accent'}>{badge}</Badge></span>{/if}
							</span>
							{#if option.description}<span id={id.description} class={look('description')}>{option.description}</span>{/if}
						</span>
					{/if}
				</span>
				{#if isSaved || isChanged}
					<span id={id.caption} class={look('caption')}>
						<!-- Body text colour: accent text on the checked option's accent tint is too faint to read. -->
						{#if isChanged}<span class="inline-flex items-center gap-1 text-fg-main"><span aria-hidden="true" class="size-1.5 rounded-full bg-accent-primary"></span>{text.changed}</span>{/if}
						{#if isSaved}<span class="text-fg-light">{text.current}</span>{/if}
					</span>
				{/if}
				{#if optionLock && !notesBelow}{@render lockNote(optionLock, id.lock)}{/if}
			</label>
		{/each}
	</div>

	{#if notesBelow && options.some((o) => o.lock)}
		<span class="flex flex-col gap-1">
			{#each options as option, index (option.value)}
				{#if option.lock}{@render lockNote(option.lock, ids(index).lock, option.label)}{/if}
			{/each}
		</span>
	{/if}

	{#if variant === 'segmented' && showCaptions && saved !== undefined && chosen !== null && chosen !== saved}
		<p class="m-0 flex items-center gap-1.5 text-[11px] leading-4 font-medium text-accent-primary" aria-hidden="true">
			<span class="size-1.5 rounded-full bg-accent-primary"></span>{text.changed}
			<span class="text-fg-light">· {text.current}: {options.find((o) => o.value === saved)?.label ?? saved}</span>
		</p>
	{/if}

	{#if readout}
		<div class="text-xs leading-5 text-fg-light">{@render readout(chosen)}</div>
	{/if}

	{#if groupLock && ownLock}
		<span class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
			{@render lockNote(groupLock, lockId)}
			{#if groupLock.action}
				<Button size="xs" {...actionButtonProps(groupLock.action, undefined, { ready: ready.current })} onclick={groupLock.action.onSelect && !groupLock.action.unavailable ? () => groupLock?.action?.onSelect?.() : undefined}>{groupLock.action.label}</Button>
			{/if}
		</span>
	{/if}

	{#if instant}
		<!-- With nothing to say the line takes no room (its status stays in the page to announce); it shows while saving, once saved and while Undo is offered. -->
		<div class={cn('flex flex-wrap items-center gap-x-2 gap-y-1', status !== 'pending' && status !== 'saved' && !instant.canUndo && 'sr-only')} data-instant-status="">
			<p id={statusId} role="status" class="m-0 inline-flex items-center gap-1.5 text-xs leading-5 text-fg-light [&_svg]:size-3.5">
				{#if status === 'pending'}<Spinner size="xs" decorative />{text.saving}{:else if status === 'saved'}<Check aria-hidden="true" class="text-status-success" />{text.saved}{/if}
			</p>
			{#if instant.canUndo}
				<Button size="xs" variant="ghost" onclick={undo}>{text.undo}</Button>
			{/if}
		</div>
		{#if status === 'error'}
			<p role="alert" class={cn('m-0 text-xs leading-5 font-medium', DANGER_TEXT)}>{instant.error ?? text.failed}</p>
		{/if}
	{/if}

	{#if action && !draft && !(instant && ready.current)}
		<form id={formId} method="post" {action} class="m-0">
			<Button type="submit" size="sm" variant="secondary">{text.apply}</Button>
		</form>
	{/if}
</div>
