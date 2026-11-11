<script lang="ts" module>
	import { untrack } from 'svelte';
	import { Check, ChevronRight, Circle } from '@lucide/svelte';
	import type { Menu as MenuPattern } from '../../headless/patterns/menu.svelte';
	import { cn } from '../../ui/cn';
	import { GROUP_LABEL, MENU_ITEM, MENU_ITEM_TONES, MENU_SHORTCUT, MENU_SURFACE, SEPARATOR } from './classes';
	import type { MenuEntry } from './types';

	/** Keys an entry within its level: values, radio names and group names are unique per level. */
	function entryKey(entry: MenuEntry, index: number): string {
		switch (entry.kind) {
			case 'separator':
				return `separator:${index}`;
			case 'radio':
				return `radio:${entry.name}`;
			case 'group':
				return `group:${entry.name ?? entry.label}`;
			default:
				return `item:${entry.value}`;
		}
	}

	export { menuEntries };
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { createAttachmentKey, type Attachment } from 'svelte/attachments';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { ChevronDown } from '@lucide/svelte';
	import { Menu } from '../../headless/patterns/menu.svelte';
	import type { ChangeReason, Part } from '../../headless/runtime/parts';
	import { pillClass } from '../../ui/styles';
	import { toPlacement, type OverlayPlacement } from '../placement';

	export interface Props extends Omit<HTMLButtonAttributes, 'class' | 'children'> {
		/** The rows, as data. Submenus and groups nest. */
		items: MenuEntry[];
		/** Text of the default trigger button. Ignored when `trigger` is given. */
		triggerLabel?: string;
		/**
		 * Renders your own opener: spread the part on a `<button>`. The part already carries
		 * your extra attributes and `ref`.
		 */
		trigger?: Snippet<[Part]>;
		/**
		 * Non-interactive content at the top of the menu, above the rows (for example who is
		 * signed in). It is not a menu item: keyboard navigation skips it. Its text is the
		 * menu's accessible description, so a screen reader announces it on opening.
		 */
		header?: Snippet;
		/** Bindable. */
		open?: boolean;
		defaultOpen?: boolean;
		onOpenChange?: (open: boolean, reason: ChangeReason) => void;
		/** `'bottom-start'` (default), `'bottom-end'`, … or a full placement. */
		placement?: OverlayPlacement;
		/** Arrow keys wrap at the ends. Default true. */
		loop?: boolean;
		/** The trigger element. Bindable. */
		ref?: HTMLElement | null;
		/** Classes for the menu surface. */
		menuClass?: string;
		/** Classes for the default trigger button. */
		class?: string;
	}

	let {
		items,
		triggerLabel = 'Options',
		trigger,
		header,
		open = $bindable(),
		defaultOpen = false,
		onOpenChange,
		placement,
		loop = true,
		ref = $bindable(null),
		menuClass = '',
		class: className = '',
		...rest
	}: Props = $props();

	if (untrack(() => open) === undefined) open = untrack(() => defaultOpen);

	const id = $props.id();
	const menu = new Menu({
		id,
		open: () => open ?? false,
		onOpenChange: (next, reason) => {
			open = next;
			onOpenChange?.(next, reason);
		},
		placement: () => toPlacement(placement, { side: 'bottom', align: 'start', offset: 4 }),
		loop: () => loop
	});

	const captureRef: Attachment<HTMLElement> = (el) => {
		ref = el;
		return () => {
			if (ref === el) ref = null;
		};
	};
	const refKey = createAttachmentKey();
	/** Your attributes, then the menu's, then the ref: what a custom trigger spreads. */
	const triggerPart = $derived({ ...rest, ...menu.trigger, [refKey]: captureRef } as Part);
</script>

{#snippet menuEntries(m: MenuPattern, entries: MenuEntry[])}
	{#each entries as entry, index (entryKey(entry, index))}
		{#if entry.kind === 'separator'}
			<div {...m.separator} class={SEPARATOR}></div>
		{:else if entry.kind === 'group'}
			{@const group = m.group(entry.name ?? entry.label)}
			<div {...group.root}>
				<div {...group.label} class={GROUP_LABEL}>{entry.label}</div>
				{@render menuEntries(m, entry.items)}
			</div>
		{:else if entry.kind === 'checkbox'}
			<div
				{...m.checkbox({
					value: entry.value,
					disabled: entry.disabled,
					closeOnSelect: entry.closeOnSelect,
					checked: () => entry.checked,
					onCheckedChange: entry.onCheckedChange
				})}
				class={MENU_ITEM}
			>
				<Check aria-hidden="true" class="invisible group-aria-checked:visible" />
				<span class="min-w-0 flex-1 truncate">{entry.label}</span>
				{#if entry.shortcut}<kbd class={MENU_SHORTCUT}>{entry.shortcut}</kbd>{/if}
			</div>
		{:else if entry.kind === 'radio'}
			{@const radios = m.radioGroup({
				name: entry.name,
				label: entry.label,
				closeOnSelect: entry.closeOnSelect,
				value: () => entry.value,
				onValueChange: entry.onValueChange
			})}
			<div {...radios.root}>
				{#if entry.label}<div aria-hidden="true" class={GROUP_LABEL}>{entry.label}</div>{/if}
				{#each entry.options as option (option.value)}
					<div {...radios.item({ value: option.value, disabled: option.disabled })} class={MENU_ITEM}>
						<Circle aria-hidden="true" class="invisible mx-1 size-2! fill-current group-aria-checked:visible" />
						<span class="min-w-0 flex-1 truncate">{option.label}</span>
					</div>
				{/each}
			</div>
		{:else if entry.kind === 'submenu'}
			{@const sub = m.submenu(entry.value, { disabled: entry.disabled, textValue: entry.label })}
			<div {...sub.trigger} class={cn(MENU_ITEM, 'data-[state=open]:bg-chat-user')}>
				{#if entry.icon}<entry.icon class="text-fg-light" />{/if}
				<span class="min-w-0 flex-1 truncate">{entry.label}</span>
				<ChevronRight aria-hidden="true" class="ml-auto text-fg-light rtl:rotate-180" />
			</div>
			<div {...sub.content} class={MENU_SURFACE}>
				{@render menuEntries(sub, entry.items)}
			</div>
		{:else}
			<div
				{...m.item({
					value: entry.value,
					disabled: entry.disabled,
					textValue: entry.label,
					closeOnSelect: entry.closeOnSelect,
					onSelect: entry.onSelect
				})}
				class={cn(MENU_ITEM, MENU_ITEM_TONES[entry.tone ?? 'neutral'])}
			>
				{#if entry.icon}<entry.icon class={(entry.tone ?? 'neutral') === 'neutral' ? 'text-fg-light' : ''} />{/if}
				<span class="min-w-0 flex-1 truncate">{entry.label}</span>
				{#if entry.shortcut}<kbd class={MENU_SHORTCUT}>{entry.shortcut}</kbd>{/if}
			</div>
		{/if}
	{/each}
{/snippet}

{#if trigger}
	{@render trigger(triggerPart)}
{:else}
	<button {...rest} {...menu.trigger} {@attach captureRef} class={cn(pillClass('secondary', 'md'), className)}>
		{triggerLabel}
		<ChevronDown aria-hidden="true" class="text-fg-light" />
	</button>
{/if}

<div {...menu.content} aria-describedby={header ? `${id}-header` : undefined} class={cn(MENU_SURFACE, menuClass)}>
	{#if header}<div id="{id}-header" role="presentation">{@render header()}</div>{/if}
	{@render menuEntries(menu, items)}
</div>
