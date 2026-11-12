<script lang="ts" module>
	import type { SettingsIcon } from '../shared';

	/** One row: something that can notify. */
	export interface NotificationEvent {
		id: string;
		label: string;
		description?: string;
		/** Rows with the same group sit under one group heading. */
		group?: string;
	}

	/** One column: a way to be notified. */
	export interface NotificationChannel {
		id: string;
		label: string;
		description?: string;
		icon?: SettingsIcon;
		/** Why the channel cannot be used now. Its cells are disabled and keep their saved state. */
		unavailable?: string;
		/** Browser permission for the channel: `prompt` (the browser asks first) or `denied` (cells disabled). */
		permission?: 'granted' | 'prompt' | 'denied';
	}

	/** A cell that cannot be changed, shown as Always on / Always off with a reason. */
	export interface NotificationLockedCell {
		checked: boolean;
		reason: string;
	}

	/** Every word NotificationMatrix shows or announces. */
	export interface NotificationMatrixLabels {
		/** The table's caption (visually hidden unless `showCaption`). */
		caption: string;
		/** Header of the event column. */
		event: string;
		/** Accessible name of one cell: "Mentions by Email". */
		cell: (event: string, channel: string) => string;
		/** Accessible name of a column toggle. */
		column: (channel: string) => string;
		alwaysOn: string;
		alwaysOff: string;
		unavailable: string;
		/** Note under a channel the browser will ask about first. */
		permissionPrompt: (channel: string) => string;
		/** The button that asks the browser for permission. */
		allow: (channel: string) => string;
		/** Note under a channel the browser blocks. */
		permissionDenied: (channel: string) => string;
		apply: string;
		saving: string;
		saved: string;
		/** A failed instant change, reverted: names the cell. */
		failed: (cell: string) => string;
		undo: string;
	}

	export type NotificationMatrixLayout = 'auto' | 'grid' | 'list';
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Ban, Check, Lock, ShieldAlert } from '@lucide/svelte';
	import { cn } from '../../ui/cn';
	import { isThenable } from '../../core/promise';
	import { Button } from '../../primitives/actions';
	import { Badge, Spinner } from '../../primitives/display';
	import { Checkbox, createFieldState, setFieldContext } from '../../primitives/form';
	import { DANGER_TEXT } from '../../primitives/form/classes';
	import {
		getSettingsDraft,
		getSettingsScope,
		InstantCore,
		LOCK_ICONS,
		lockReasonText,
		pickLock,
		ReadyGate,
		RECIPES,
		type InstantSnapshot,
		type SettingLock,
		type SettingsHandler
	} from '../shared';
	import { isDev } from '../shared/env';
	import { groupMatrixEvents, matrixCellKey, matrixColumnState, parseMatrixCellKey, toggleMatrixColumn } from './matrix';
	import { idPart } from './ids';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'defaultValue'> {
		events: NotificationEvent[];
		channels: NotificationChannel[];
		/** Cells that are on, as `${event}:${channel}`. Bindable; with `onCellCommit` it only ever holds saved cells. Ignored inside a SettingsForm. */
		value?: string[];
		/** The starting cells, and what a form reset restores. Inside a SettingsForm, the saved cells. */
		defaultValue?: string[];
		/** Form name; each cell that is on posts `name=event:channel`. Default `notify`. */
		name?: string;
		/** Cells that cannot change, by key. They post through hidden inputs when on. */
		locked?: Record<string, NotificationLockedCell>;
		/** Every change, before it is saved. */
		onValueChange?: (value: string[]) => void;
		/** Instant mode: each cell commits on its own (saving, saved, Undo, revert on failure). Ignored inside a SettingsForm. */
		onCellCommit?: SettingsHandler<[string, string, boolean]>;
		/** The Allow button of a `prompt` channel: ask the browser, then update `permission`. */
		onRequestPermission?: (channel: string) => unknown;
		/** Adds an all-on / all-off checkbox to each column header (mixed when some are on). Needs JavaScript. */
		columnToggle?: boolean;
		/** `grid` (a table), `list` (one block per event) or `auto` (grid, list in a narrow settings container). Default `auto`. */
		layout?: NotificationMatrixLayout;
		/** Shows the caption above the table instead of only to screen readers. */
		showCaption?: boolean;
		disabled?: boolean;
		/** Locks every cell, with a visible reason. A surrounding section or page lock applies too. */
		lock?: SettingLock;
		/** Instant mode without JavaScript: the cells post here, with an Apply button that hides once the page is ready. */
		action?: string;
		/** Words, merged over the English defaults. */
		labels?: Partial<NotificationMatrixLabels>;
		class?: string;
	}

	let {
		events,
		channels,
		defaultValue,
		value = $bindable(defaultValue ?? []),
		name = 'notify',
		locked = {},
		onValueChange,
		onCellCommit,
		onRequestPermission,
		columnToggle = false,
		layout = 'auto',
		showCaption = false,
		disabled = false,
		lock,
		action,
		labels,
		class: className = '',
		...rest
	}: Props = $props();

	const text = $derived<NotificationMatrixLabels>({
		caption: 'Notification preferences',
		event: 'Event',
		cell: (event, channel) => `${event} by ${channel}`,
		column: (channel) => `All events by ${channel}`,
		alwaysOn: 'Always on',
		alwaysOff: 'Always off',
		unavailable: 'Unavailable',
		permissionPrompt: (channel) => `Your browser asks before it shows ${channel} notifications.`,
		allow: (channel) => `Allow ${channel}`,
		permissionDenied: (channel) => `${channel} notifications are blocked in your browser settings.`,
		apply: 'Apply',
		saving: 'Saving…',
		saved: 'Saved',
		failed: (cell) => `Couldn't save ${cell}. Changed back.`,
		undo: 'Undo',
		...labels
	});

	const uid = $props.id();
	const statusId = `${uid}-status`;
	const lockId = `${uid}-lock`;
	const formId = `${uid}-form`;
	const fieldErrorId = `${uid}-field-error`;
	const scope = getSettingsScope();
	const draft = getSettingsDraft();
	// The scope's readiness (SettingsLayout `ready`) holds back instant cells and column toggles too.
	const ready = new ReadyGate(() => scope?.ready());
	// The cells are their own controls: a surrounding row's Field must not hand them its id or label.
	setFieldContext(createFieldState({ id: `${uid}-cells`, group: () => true }));

	if (draft && untrack(() => onCellCommit) && isDev()) {
		console.warn('NotificationMatrix: onCellCommit is ignored inside a SettingsForm; the form\'s Save commits the cells.');
	}

	/** A server error for the cells, from the surrounding SettingsForm; hidden once a cell is edited. */
	const fieldError = $derived(draft ? draft.fieldError(name) : undefined);
	const groupLock = $derived(pickLock(lock, scope?.lock?.lock));
	const ownLock = $derived(groupLock !== undefined && groupLock === lock);
	const groupReasonId = $derived(groupLock ? (ownLock ? lockId : scope?.lock?.reasonId) : undefined);

	// ---- Instant mode: one InstantCore per cell, created on first change. ----
	const instant = !draft && Boolean(untrack(() => onCellCommit));
	const cores = new Map<string, InstantCore<boolean>>();
	let snapshots = $state<Record<string, InstantSnapshot<boolean>>>({});
	/**
	 * The change Undo reverses: one cell, or every cell one column toggle changed. Each cell keeps its
	 * own undo point in its InstantCore; the group treats the batch as one change, and `focus` is the
	 * control that made it (the cell or the column toggle), where focus returns after Undo.
	 */
	let lastChange = $state<{ keys: string[]; focus: string } | null>(null);
	const valueSet = $derived(new Set(value));

	function coreFor(key: string): InstantCore<boolean> {
		let core = cores.get(key);
		if (core) return core;
		const cell = parseMatrixCellKey(key);
		core = new InstantCore<boolean>({
			initial: valueSet.has(key),
			commit: () => (onCellCommit && cell ? (on: boolean) => onCellCommit(cell.event, cell.channel, on) : undefined),
			onChange: (snapshot) => {
				snapshots[key] = snapshot;
				if (snapshot.status === 'saved' || snapshot.status === 'idle') mirrorCommitted();
			}
		});
		cores.set(key, core);
		return core;
	}

	/** Copies saved cells into the bindable `value`, so the app only ever holds saved state. */
	function mirrorCommitted(): void {
		const next = new Set(untrack(() => value));
		for (const [key, core] of cores) {
			if (core.snapshot.committed) next.add(key);
			else next.delete(key);
		}
		const list = [...next];
		const current = untrack(() => value);
		if (list.length !== current.length || list.some((key) => !current.includes(key))) value = list;
	}

	// A value changed from outside is adopted by every idle cell.
	$effect(() => {
		const set = valueSet;
		untrack(() => {
			for (const [key, core] of cores) core.sync(set.has(key));
		});
	});
	$effect(() => () => {
		for (const core of cores.values()) core.dispose();
	});

	// ---- Staged mode: uncontrolled checkboxes, read back after every edit, reset and save. ----
	const stagedStart = new Set(untrack(() => defaultValue ?? value));
	let root = $state<HTMLDivElement | null>(null);
	let stagedOn = $state<Set<string>>(new Set(untrack(() => defaultValue ?? value)));
	let stagedSaved = $state<Set<string>>(new Set(untrack(() => defaultValue ?? value)));
	function readStaged(): void {
		if (!root) return;
		const boxes = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-cell]'));
		stagedOn = new Set(boxes.filter((b) => b.checked).map((b) => b.value));
		stagedSaved = new Set(boxes.filter((b) => b.defaultChecked).map((b) => b.value));
	}
	$effect(() => {
		if (!draft || !root) return;
		void draft.changes;
		untrack(readStaged);
	});
	$effect(() => {
		if (!draft) return;
		const cellText = new Map<string, string>();
		for (const e of events) for (const c of channels) cellText.set(matrixCellKey(e.id, c.id), text.cell(e.label, c.label));
		const caption = text.caption;
		return draft.register({ name, label: caption, format: (raw) => (Array.isArray(raw) ? raw : raw ? [raw] : []).map((k) => cellText.get(k) ?? k).join(', ') || '—' });
	});

	// ---- What each cell shows. ----
	const waiting = $derived(instant && !action && !ready.current);
	function channelBlocked(channel: NotificationChannel): boolean {
		return Boolean(channel.unavailable) || channel.permission === 'denied';
	}
	function isOn(key: string): boolean {
		const fixed = locked[key];
		if (fixed) return fixed.checked;
		if (draft) return stagedOn.has(key);
		if (instant) return snapshots[key]?.current ?? valueSet.has(key);
		return valueSet.has(key);
	}
	function cellDisabled(key: string, channel: NotificationChannel): boolean {
		return disabled || Boolean(groupLock) || channelBlocked(channel) || Boolean(locked[key]) || waiting;
	}
	/** Keys a column toggle changes: not locked, not blocked. */
	function changeable(channel: NotificationChannel): string[] {
		if (disabled || groupLock || channelBlocked(channel)) return [];
		return events.map((e) => matrixCellKey(e.id, channel.id)).filter((key) => !locked[key]);
	}
	const shownOn = $derived.by(() => {
		const out: string[] = [];
		for (const e of events) for (const c of channels) {
			const key = matrixCellKey(e.id, c.id);
			if (isOn(key)) out.push(key);
		}
		return out;
	});

	function setCell(key: string, on: boolean): void {
		if (draft) {
			const next = new Set(stagedOn);
			if (on) next.add(key);
			else next.delete(key);
			stagedOn = next;
			onValueChange?.([...next]);
			return;
		}
		if (instant) {
			commitCells([key], on, cellId(key));
			return;
		}
		const next = on ? [...value.filter((k) => k !== key), key] : value.filter((k) => k !== key);
		value = next;
		onValueChange?.(next);
	}

	/** Instant mode: commits each cell on its own, as one change for Undo, and reports once. */
	function commitCells(keys: string[], on: boolean, focus: string): void {
		if (keys.length === 0) return;
		lastChange = { keys, focus };
		for (const key of keys) void coreFor(key).set(on);
		// What every cell shows now: saved cells, with each cell changed since then (still pending or not) on top.
		const next = new Set(valueSet);
		for (const [k, core] of cores) {
			if (core.snapshot.current) next.add(k);
			else next.delete(k);
		}
		onValueChange?.([...next]);
	}

	/** Undo hides its own button, so focus goes back to the control that made the change first. */
	function undoLast(): void {
		const change = lastChange;
		if (!change) return;
		document.getElementById(change.focus)?.focus();
		for (const key of change.keys) if (snapshots[key]?.canUndo) void cores.get(key)?.undo();
	}

	function toggleColumn(channel: NotificationChannel, on: boolean, focus: string): void {
		const keys = changeable(channel);
		if (draft && root) {
			// Uncontrolled cells: change them in place and let the form (and the draft) hear it.
			for (const key of keys) {
				const box = root.querySelector<HTMLInputElement>(`input[data-cell][value="${CSS.escape(key)}"]`);
				if (!box || box.checked === on) continue;
				box.checked = on;
				box.dispatchEvent(new Event('input', { bubbles: true }));
				box.dispatchEvent(new Event('change', { bubbles: true }));
			}
			readStaged();
			onValueChange?.([...stagedOn]);
			return;
		}
		if (instant) {
			commitCells(keys.filter((key) => isOn(key) !== on), on, focus);
			return;
		}
		const next = toggleMatrixColumn(value, keys, on);
		value = next;
		onValueChange?.(next);
	}

	let asking = $state<Record<string, boolean>>({});
	async function requestPermission(channel: string): Promise<void> {
		if (!ready.current || asking[channel]) return;
		const result = onRequestPermission?.(channel);
		if (!isThenable(result)) return;
		asking[channel] = true;
		try {
			await result;
		} catch {
			// The app updates `permission`; nothing to show here.
		} finally {
			asking[channel] = false;
		}
	}

	const groups = $derived(groupMatrixEvents(events));
	const lockedKeys = $derived(Object.keys(locked).filter((key) => parseMatrixCellKey(key)));
	const channelNoteId = (index: number) => `${uid}-channel-${index}`;
	const lockedNoteId = (key: string) => `${uid}-locked-${idPart(key)}`;
	const labelOf = (key: string) => {
		const cell = parseMatrixCellKey(key);
		const event = events.find((e) => e.id === cell?.event);
		const channel = channels.find((c) => c.id === cell?.channel);
		return event && channel ? text.cell(event.label, channel.label) : key;
	};
	const lastSnapshots = $derived((lastChange?.keys ?? []).map((key) => snapshots[key]).filter(Boolean));
	/** Saved once the whole change has settled and some of it saved. */
	const lastSaved = $derived(lastSnapshots.some((snapshot) => snapshot.status === 'saved'));
	/** Undo while every cell of the change has settled and one that saved still owns its undo point. */
	const canUndo = $derived(lastSnapshots.every((snapshot) => snapshot.status !== 'pending') && lastSnapshots.some((snapshot) => snapshot.canUndo));
	/** Saving while any cell is in flight, not only the last one touched. */
	const anyPending = $derived(Object.values(snapshots).some((snapshot) => snapshot.status === 'pending'));
	/** Every cell whose change failed and went back, until it is changed again: none fails silently. */
	const failedKeys = $derived(Object.keys(snapshots).filter((key) => snapshots[key].status === 'error'));
	const cellId = (key: string) => `${uid}-cell-${idPart(key)}`;
	const columnId = (index: number) => `${uid}-column-${index}`;
	const errorId = (key: string) => `${uid}-error-${idPart(key)}`;
	/** A channel that is unavailable, or that the browser asks about or blocks, has a note in the list below. */
	const hasChannelNote = (channel: NotificationChannel) => Boolean(channel.unavailable) || channel.permission === 'prompt' || channel.permission === 'denied';
	const channelNotes = $derived(channels.some(hasChannelNote));

	/**
	 * Classes per part. `grid` is a table; `list` stacks one block per event with each cell labelled;
	 * `auto` is the grid that turns into the list below the settings `row` breakpoint.
	 */
	/**
	 * A saving cell's spinner sits just past the cell's content and out of flow (beside the checkbox
	 * in the grid, after the label in the list), inside the cell's own right room, so no cell moves.
	 */
	const SPINNER = 'pointer-events-none absolute top-1/2 left-full ml-1 inline-flex -translate-y-1/2';
	const GRID = {
		table: 'w-full border-collapse text-left',
		thead: '',
		headCell: 'px-2 pt-1 pb-2 text-center align-top text-xs font-medium text-fg-light',
		tbody: '',
		groupRow: '',
		groupCell: 'pt-5 pb-1.5 text-left text-[11px] font-semibold tracking-wide text-fg-light uppercase',
		row: 'border-t border-canvas-border',
		rowHeader: 'py-3 pr-4 text-left align-top font-normal',
		cell: 'px-2 py-3 text-center align-top',
		cellInner: 'relative inline-flex flex-col items-center gap-1',
		cellLabel: 'sr-only',
		spinner: SPINNER
	};
	const LIST = {
		table: 'block w-full text-left',
		thead: 'hidden',
		headCell: '',
		tbody: 'block',
		groupRow: 'block',
		groupCell: 'block pt-4 pb-1 text-left text-[11px] font-semibold tracking-wide text-fg-light uppercase',
		row: 'block border-t border-canvas-border py-3 first:border-t-0 first:pt-0',
		rowHeader: 'block pb-2 text-left font-normal',
		cell: 'inline-block pr-5 pb-1 align-top pointer-coarse:pb-6',
		cellInner: 'relative inline-flex flex-row flex-wrap items-center gap-x-2 gap-y-0.5',
		cellLabel: 'text-[13px] text-fg-main',
		spinner: SPINNER
	};
	const AUTO_NARROW = {
		table: '@max-lg/settings:block',
		thead: '@max-lg/settings:hidden',
		headCell: '',
		tbody: '@max-lg/settings:block',
		groupRow: '@max-lg/settings:block',
		groupCell: '@max-lg/settings:block @max-lg/settings:pt-4 @max-lg/settings:pb-1',
		row: '@max-lg/settings:block @max-lg/settings:py-3',
		rowHeader: '@max-lg/settings:block @max-lg/settings:py-0 @max-lg/settings:pr-0 @max-lg/settings:pb-2',
		cell: '@max-lg/settings:inline-block @max-lg/settings:px-0 @max-lg/settings:py-0 @max-lg/settings:pr-5 @max-lg/settings:pb-1 @max-lg/settings:text-left @max-lg/settings:pointer-coarse:pb-6',
		cellInner: '@max-lg/settings:flex-row @max-lg/settings:flex-wrap @max-lg/settings:gap-x-2 @max-lg/settings:gap-y-0.5',
		cellLabel: '@max-lg/settings:not-sr-only @max-lg/settings:text-[13px] @max-lg/settings:text-fg-main',
		spinner: ''
	};
	/**
	 * Column toggles live in the header. In the list (or the narrow auto) layout the header becomes a
	 * strip of "All events by …" checkboxes above the events, so the toggles stay reachable.
	 */
	const toggles = $derived(columnToggle && ready.current);
	const STRIP = {
		thead: 'block pb-3',
		headRow: 'flex flex-wrap gap-x-5 gap-y-2',
		eventHead: 'hidden',
		headCell: 'block w-auto p-0 text-left',
		headInner: 'flex-row gap-2'
	};
	const STRIP_NARROW: typeof STRIP = {
		thead: '@max-lg/settings:block @max-lg/settings:pb-3',
		headRow: '@max-lg/settings:flex @max-lg/settings:flex-wrap @max-lg/settings:gap-x-5 @max-lg/settings:gap-y-2',
		eventHead: '@max-lg/settings:hidden',
		headCell: '@max-lg/settings:block @max-lg/settings:w-auto @max-lg/settings:p-0 @max-lg/settings:text-left',
		headInner: '@max-lg/settings:flex-row @max-lg/settings:gap-2'
	};
	const narrowStrip = (part: keyof typeof STRIP): string => (layout === 'list' ? STRIP[part] : layout === 'grid' ? '' : STRIP_NARROW[part]);
	type Part = keyof typeof GRID;
	const look = (part: Part): string => (layout === 'list' ? LIST[part] : layout === 'grid' ? GRID[part] : cn(GRID[part], AUTO_NARROW[part]));
	/** Stacked, the header row is hidden: the first event draws no rule of its own under whatever sits above (a section header), unless the toggle strip does. */
	const firstRowRule = $derived(layout === 'auto' && !toggles ? '@max-lg/settings:first:border-t-0 @max-lg/settings:first:pt-0' : '');
</script>

<div {...rest}
	bind:this={root}
	data-layout={layout}
	data-locked={groupLock?.kind}
	aria-describedby={groupReasonId}
	class={cn('flex min-w-0 flex-col gap-3 text-[13px] text-fg-main', className)}
>
	<table class={look('table')} aria-describedby={[groupReasonId, channelNotes ? `${uid}-notes` : ''].filter(Boolean).join(' ') || undefined}>
		<caption class={cn(showCaption ? 'pb-2 text-left text-sm font-semibold text-fg-main' : 'sr-only')}>{text.caption}</caption>
		<thead class={toggles ? narrowStrip('thead') : look('thead')}>
			<tr class={toggles ? narrowStrip('headRow') : undefined}>
				<th scope="col" class={cn('pt-1 pb-2 text-left align-top text-xs font-medium text-fg-light', toggles && narrowStrip('eventHead'))}>{text.event}</th>
				{#each channels as channel, ci (channel.id)}
					{@const Icon = channel.icon}
					{@const keys = changeable(channel)}
					{@const state = matrixColumnState(keys, shownOn)}
					<th scope="col" class={cn(look('headCell'), 'w-24', toggles && narrowStrip('headCell'))} data-channel={channel.id}>
						<span class={cn('inline-flex flex-col items-center gap-1.5', toggles && narrowStrip('headInner'))}>
							<span class="inline-flex items-center gap-1 text-fg-main [&_svg]:size-3.5 [&_svg]:text-fg-light">
								{#if Icon}<span aria-hidden="true" class="contents"><Icon /></span>{/if}{channel.label}
							</span>
							{#if channel.unavailable}
								<Badge size="sm" tone="neutral" aria-describedby={channelNoteId(ci)}>{text.unavailable}</Badge>
							{:else if channel.permission === 'denied'}
								<Badge size="sm" tone="danger">{text.unavailable}</Badge>
							{:else if columnToggle && ready.current && keys.length > 0}
								<Checkbox
									id={columnId(ci)}
									aria-label={text.column(channel.label)}
									checked={state === 'all'}
									indeterminate={state === 'some'}
									onCheckedChange={(on) => toggleColumn(channel, on, columnId(ci))}
									data-column={channel.id}
								/>
							{/if}
						</span>
					</th>
				{/each}
			</tr>
		</thead>
		{#each groups as group, gi (group.group ?? `__${gi}`)}
			<tbody class={look('tbody')}>
				{#if group.group}
					<tr class={look('groupRow')}>
						<th scope="rowgroup" colspan={channels.length + 1} class={look('groupCell')}>{group.group}</th>
					</tr>
				{/if}
				{#each group.events as event (event.id)}
					<tr class={cn(look('row'), firstRowRule)} data-event={event.id}>
						<th scope="row" class={look('rowHeader')}>
							<span class="block font-medium text-fg-main">{event.label}</span>
							{#if event.description}<span class="mt-0.5 block text-xs leading-5 text-fg-light">{event.description}</span>{/if}
						</th>
						{#each channels as channel, ci (channel.id)}
							{@const key = matrixCellKey(event.id, channel.id)}
							{@const fixed = locked[key]}
							{@const on = isOn(key)}
							{@const off = cellDisabled(key, channel)}
							{@const snap = instant ? snapshots[key] : undefined}
							{@const dirty = draft ? stagedOn.has(key) !== stagedSaved.has(key) : false}
							{@const id = cellId(key)}
							{@const describedBy = [fixed ? lockedNoteId(key) : '', hasChannelNote(channel) ? channelNoteId(ci) : '', groupReasonId ?? '', snap?.status === 'error' ? errorId(key) : '', instant ? statusId : '', fieldError ? fieldErrorId : ''].filter(Boolean).join(' ') || undefined}
							<td class={cn(look('cell'), dirty && 'bg-accent-subtle/60', snap?.status === 'error' && 'bg-status-danger-subtle/60')} data-cell-key={key} data-dirty={dirty ? '' : undefined} data-failed={snap?.status === 'error' ? '' : undefined}>
								<span class={look('cellInner')}>
									<span class="relative inline-flex">
										{#if draft && !fixed}
											<Checkbox {id} {name} value={key} defaultChecked={stagedStart.has(key)} disabled={off} invalid={Boolean(fieldError)} aria-label={text.cell(event.label, channel.label)} aria-describedby={describedBy} data-cell="" onCheckedChange={(checked) => setCell(key, checked)} />
										{:else}
											<Checkbox
												{id}
												name={off ? undefined : name}
												value={key}
												checked={on}
												disabled={off}
												form={action && !draft ? formId : undefined}
												aria-label={text.cell(event.label, channel.label)}
												aria-describedby={describedBy}
												aria-busy={snap?.status === 'pending' ? 'true' : undefined}
												aria-invalid={snap?.status === 'error' ? 'true' : undefined}
												data-cell=""
												onCheckedChange={(checked) => setCell(key, checked)}
											/>
										{/if}
									</span>
									<label for={id} class={look('cellLabel')}>{channel.label}</label>
									{#if snap?.status === 'pending'}<span class={look('spinner')} data-cell-spinner=""><Spinner size="xs" decorative /></span>{/if}
									{#if fixed}
										<span class="inline-flex items-center gap-0.5 text-[11px] leading-4 text-fg-light [&_svg]:size-3"><Lock aria-hidden="true" />{fixed.checked ? text.alwaysOn : text.alwaysOff}</span>
									{/if}
									<!-- Disabled cells do not post: keep the ones that are on. -->
									{#if off && on}<input type="hidden" {name} value={key} form={action && !draft ? formId : undefined} />{/if}
								</span>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		{/each}
	</table>

	{#if channelNotes || lockedKeys.length > 0}
		<ul id="{uid}-notes" class="m-0 flex list-none flex-col gap-1.5 p-0">
			{#each channels as channel, ci (channel.id)}
				{#if channel.unavailable}
					<li id={channelNoteId(ci)} class={RECIPES.note}><Ban aria-hidden="true" /><span><span class="font-medium text-fg-main">{channel.label}:</span> {channel.unavailable}</span></li>
				{:else if channel.permission === 'denied'}
					<li id={channelNoteId(ci)} class={RECIPES.note}><ShieldAlert aria-hidden="true" /><span>{text.permissionDenied(channel.label)}</span></li>
				{:else if channel.permission === 'prompt'}
					<li id={channelNoteId(ci)} class={RECIPES.note}>
						<ShieldAlert aria-hidden="true" />
						<span class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
							<span>{text.permissionPrompt(channel.label)}</span>
							{#if onRequestPermission}
								<Button size="xs" variant="secondary" softDisabled={!ready.current} loading={asking[channel.id] === true} onclick={() => requestPermission(channel.id)}>{text.allow(channel.label)}</Button>
							{/if}
						</span>
					</li>
				{/if}
			{/each}
			{#each lockedKeys as key (key)}
				<li id={lockedNoteId(key)} class={RECIPES.note}><Lock aria-hidden="true" /><span><span class="font-medium text-fg-main">{labelOf(key)}:</span> {locked[key].checked ? text.alwaysOn : text.alwaysOff}. {locked[key].reason}</span></li>
			{/each}
		</ul>
	{/if}

	{#if groupLock && ownLock}
		{@const LockIcon = LOCK_ICONS[groupLock.kind]}
		<p id={lockId} class={cn(RECIPES.note, 'm-0')} data-lock={groupLock.kind}><span aria-hidden="true" class="contents"><LockIcon /></span><span>{lockReasonText(groupLock)}</span></p>
	{/if}

	{#if draft}
		<p id={fieldErrorId} role="alert" data-field-error="" class={cn('m-0 text-xs leading-5 font-medium', DANGER_TEXT, !fieldError && 'sr-only')}>{fieldError ?? ''}</p>
	{/if}

	{#if instant}
		<!-- With nothing to say the line takes no room (its status stays in the page to announce). -->
		<div class={cn('flex flex-wrap items-center gap-x-2 gap-y-1', !anyPending && !lastSaved && !canUndo && 'sr-only')} data-instant-status="">
			<p id={statusId} role="status" class="m-0 inline-flex items-center gap-1.5 text-xs leading-5 text-fg-light [&_svg]:size-3.5">
				{#if anyPending}<Spinner size="xs" decorative />{text.saving}{:else if lastSaved}<Check aria-hidden="true" class="text-status-success" />{text.saved}{/if}
			</p>
			{#if canUndo}
				<Button size="xs" variant="ghost" onclick={undoLast}>{text.undo}</Button>
			{/if}
		</div>
		{#each failedKeys as key (key)}
			<p id={errorId(key)} role="alert" class={cn('m-0 text-xs leading-5 font-medium', DANGER_TEXT)} data-failed-cell={key}>{snapshots[key].error ?? text.failed(labelOf(key))}</p>
		{/each}
	{/if}

	{#if action && !draft && !(instant && ready.current)}
		<form id={formId} method="post" {action} class="m-0">
			<Button type="submit" size="sm" variant="secondary">{text.apply}</Button>
		</form>
	{/if}
</div>
