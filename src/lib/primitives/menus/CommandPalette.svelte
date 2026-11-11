<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLDialogAttributes } from 'svelte/elements';
	import { Search } from '@lucide/svelte';
	import { Combobox } from '../../headless/patterns/listbox.svelte';
	import { Dialog } from '../../headless/patterns/dialog.svelte';
	import type { ChangeReason, Part } from '../../headless/runtime/parts';
	import { cn } from '../../ui/cn';
	import { pillClass } from '../../ui/styles';
	import { GROUP_LABEL, KBD, PICKER_OPTION, POPUP_MOTION } from './classes';
	import { formatShortcut, groupBy, isApplePlatform, isTextEntry, matchesQuery, matchesShortcut } from './helpers';
	import type { PaletteCommand } from './types';

	interface Props extends Omit<HTMLDialogAttributes, 'class' | 'children' | 'open' | 'title'> {
		commands: PaletteCommand[];
		/** Bindable. */
		open?: boolean;
		onOpenChange?: (open: boolean, reason: ChangeReason) => void;
		/**
		 * Global shortcut that toggles the palette while it is mounted, e.g. `mod+k` (⌘K on
		 * Apple platforms, Ctrl+K elsewhere) or `ctrl+shift+p`. Ignored while typing in other
		 * fields. `false` registers none.
		 */
		shortcut?: string | false;
		/** Ids of recently run commands, newest first, listed first while the search is empty. */
		recent?: string[];
		recentLabel?: string;
		/** Accessible name of the palette. */
		label?: string;
		placeholder?: string;
		emptyText?: string;
		/** Which commands the search matches. Default: every word appears in the title, subtitle, group or keywords. */
		filter?: (command: PaletteCommand, query: string) => boolean;
		/** Called with each command run, after its own `onRun`. */
		onRun?: (command: PaletteCommand) => void;
		/** Your own opener: spread the part on a `<button>`; `hint` is the shortcut as text. */
		trigger?: Snippet<[part: Part<HTMLButtonElement>, hint: string]>;
		/** Text of a default opener button. Without it and without `trigger`, none is rendered. */
		triggerLabel?: string;
		class?: string;
	}

	let {
		commands,
		open = $bindable(false),
		onOpenChange,
		shortcut = 'mod+k',
		recent = [],
		recentLabel = 'Recent',
		label = 'Command palette',
		placeholder = 'Type a command or search…',
		emptyText = 'No commands found',
		filter,
		onRun,
		trigger,
		triggerLabel,
		class: className = '',
		...rest
	}: Props = $props();

	let query = $state('');
	let input = $state<HTMLInputElement>();
	// ⌘ or Ctrl is known only in the browser; the server renders Ctrl.
	let apple = $state(false);
	$effect(() => {
		apple = isApplePlatform(navigator.userAgent);
	});
	const hint = $derived(shortcut ? formatShortcut(shortcut, apple) : '');

	function setOpen(next: boolean, reason: ChangeReason): void {
		if (next === open) return;
		open = next;
		if (!next) query = '';
		onOpenChange?.(next, reason);
	}

	const DIALOG =
		'mx-auto mt-[12vh] mb-auto max-h-[min(32rem,80vh)] w-[min(36rem,calc(100vw-2rem))] max-w-none flex-col overflow-hidden rounded-window border border-card-border bg-card-bg p-0 text-fg-main ak-shadow-soft backdrop:bg-black/40 open:flex';

	const id = $props.id();
	const dialog = new Dialog({ id, open: () => open, onOpenChange: setOpen });
	const box = new Combobox({
		id: `${id}-search`,
		inline: true,
		onActivate: (value) => {
			const command = commands.find((c) => c.id === value);
			if (!command || command.disabled) return;
			setOpen(false, 'select');
			command.onRun?.();
			onRun?.(command);
		}
	});

	function matches(command: PaletteCommand): boolean {
		if (filter) return filter(command, query);
		return matchesQuery([command.title, command.subtitle, command.group, ...(command.keywords ?? [])], query);
	}

	interface Shown {
		key: string;
		name: string | null;
		items: PaletteCommand[];
	}

	const sections = $derived.by((): Shown[] => {
		const searching = query.trim() !== '';
		const recentCommands = searching
			? []
			: recent.map((rid) => commands.find((c) => c.id === rid)).filter((c): c is PaletteCommand => c !== undefined);
		const rest = commands.filter((c) => !recentCommands.includes(c) && matches(c));
		const out: Shown[] = [];
		if (recentCommands.length > 0) out.push({ key: 'recent', name: recentLabel, items: recentCommands });
		for (const section of groupBy(rest)) {
			out.push({ key: section.name === null ? 'commands' : `group:${section.name}`, name: section.name, items: section.items });
		}
		return out;
	});
	const empty = $derived(sections.length === 0);

	function onWindowKeydown(event: KeyboardEvent): void {
		if (!shortcut || event.defaultPrevented || event.repeat) return;
		if (!matchesShortcut(event, shortcut, apple)) return;
		const target = event.target instanceof HTMLElement ? event.target : null;
		if (target !== input && isTextEntry(target)) return;
		event.preventDefault();
		setOpen(!open, 'trigger');
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

{#if trigger}
	{@render trigger(dialog.trigger, hint)}
{:else if triggerLabel}
	<button {...dialog.trigger} class={pillClass('secondary', 'md', 'justify-between gap-3')}>
		<Search aria-hidden="true" class="text-fg-light" />
		<span>{triggerLabel}</span>
		{#if hint}<kbd class={KBD}>{hint}</kbd>{/if}
	</button>
{/if}

<dialog {...rest} {...dialog.content} class={cn(DIALOG, POPUP_MOTION, className)}>
	<h2 {...dialog.title} class="sr-only">{label}</h2>
	<div class="flex items-center gap-2 border-b border-canvas-border px-4">
		<Search aria-hidden="true" class="size-4 shrink-0 text-fg-light" />
		<label {...box.label} class="sr-only">Search commands</label>
		<!-- svelte-ignore a11y_autofocus -->
		<input
			{...box.input}
			bind:this={input}
			bind:value={query}
			autofocus
			{placeholder}
			class="h-12 min-w-0 flex-1 bg-transparent text-sm text-fg-main outline-none placeholder:text-fg-light"
		/>
		<kbd class={KBD}>Esc</kbd>
	</div>
	<div {...box.list} class={cn('min-h-0 flex-1 overflow-y-auto p-1.5', empty && 'hidden')}>
		{#each sections as section (section.key)}
			{#if section.name === null}
				{#each section.items as command (command.id)}{@render row(command)}{/each}
			{:else}
				{@const group = box.group(section.key)}
				<div {...group.root}>
					<div {...group.label} class={GROUP_LABEL}>{section.name}</div>
					{#each section.items as command (command.id)}{@render row(command)}{/each}
				</div>
			{/if}
		{/each}
	</div>
	<p role="status" class={empty ? 'px-4 py-8 text-center text-[13px] text-fg-light' : 'sr-only'}>
		{empty ? emptyText : ''}
	</p>
</dialog>

{#snippet row(command: PaletteCommand)}
	<div
		{...box.option({ value: command.id, disabled: command.disabled, textValue: command.title })}
		class={cn(PICKER_OPTION, 'min-h-10 px-2.5')}
	>
		{#if command.icon}<command.icon class="size-4 text-fg-light" />{/if}
		<span class="min-w-0 flex-1">
			<span class="block truncate">{command.title}</span>
			{#if command.subtitle}<span class="block truncate text-xs text-fg-light">{command.subtitle}</span>{/if}
		</span>
		{#if command.shortcut}<kbd class={KBD}>{command.shortcut}</kbd>{/if}
	</div>
{/snippet}
