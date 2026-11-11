<!--
	Browser-test fixture for the headless Menu (tests/browser/headless/menu.spec.ts). Not
	part of the catalogue. `?anchor=native|fallback` forces the positioning strategy.
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import { Dialog, Menu, type ChangeReason } from '$lib/entries/headless';
	import { __setPositionStrategy } from '$lib/headless/runtime/position';
	import { buttonClass, SURFACE } from '$lib/ui/styles';

	if (browser) {
		const flag = new URLSearchParams(location.search).get('anchor');
		__setPositionStrategy(flag === 'native' || flag === 'fallback' ? flag : 'auto');
	}

	const id = $props.id();
	let log = $state<string[]>([]);
	let selected = $state<string[]>([]);
	const record = (name: string) => (open: boolean, reason: ChangeReason) => {
		log.push(`${name}:${open ? 'open' : 'closed'}:${reason}`);
	};
	const choose = (value: string) => () => selected.push(value);

	// A menu button with a submenu, checkbox and radio items, and a disabled item.
	const actions = new Menu({ id: `${id}-actions`, onOpenChange: record('actions') });
	const share = actions.submenu('share', { onOpenChange: record('share') });
	let hidden = $state(false);
	let wrap = $state(false);
	let sort = $state<string | null>('name');
	const sortGroup = actions.radioGroup({
		name: 'sort',
		label: 'Sort by',
		value: () => sort,
		onValueChange: (value) => (sort = value)
	});
	const viewGroup = actions.group('view');

	// A menu inside a dialog, with a submenu of its own.
	const dialog = new Dialog({ id: `${id}-dialog`, onOpenChange: record('dialog') });
	const dmenu = new Menu({ id: `${id}-dmenu`, onOpenChange: record('dmenu') });
	const more = dmenu.submenu('more', { onOpenChange: record('more') });

	// A context menu on a region.
	const ctx = new Menu({ id: `${id}-ctx`, trigger: 'contextmenu', label: 'Region actions', onOpenChange: record('ctx') });

	const SURFACE_CLASS = 'fade min-w-48 rounded-card border border-card-border bg-card-bg p-1 text-sm text-fg-main';
	const ITEM = 'flex cursor-default items-center gap-2 rounded-control px-2 py-1.5 outline-none data-highlighted:bg-canvas-secondary data-disabled:opacity-50';
</script>

<svelte:head>
	<title>Headless menu fixture · Agents Kit Svelte</title>
</svelte:head>

<main class="mx-auto max-w-3xl space-y-8 px-4 py-10">
	<h1 class={SURFACE.heading} data-testid="page-heading">Headless menu fixture</h1>

	<section class="space-y-2">
		<h2 class={SURFACE.title}>Menu button</h2>
		<button {...actions.trigger} class={buttonClass('secondary', 'md')}>Actions</button>
		<div {...actions.content} class={SURFACE_CLASS}>
			<div {...actions.item({ value: 'new', onSelect: choose('new') })} class={ITEM}>New file</div>
			<div {...actions.item({ value: 'copy', onSelect: choose('copy') })} class={ITEM}>Copy</div>
			<div {...share.trigger} class={ITEM}>
				<span class="flex-1">Share</span><span aria-hidden="true">›</span>
			</div>
			<div {...share.content} class={SURFACE_CLASS}>
				<div {...share.item({ value: 'email', onSelect: choose('email') })} class={ITEM}>Email link</div>
				<div {...share.item({ value: 'link', onSelect: choose('link') })} class={ITEM}>Copy link</div>
				<div {...share.item({ value: 'messages', onSelect: choose('messages') })} class={ITEM}>Messages</div>
				<div {...share.item({ value: 'nearby', onSelect: choose('nearby') })} class={ITEM}>Nearby share</div>
				<div {...share.item({ value: 'print', onSelect: choose('print') })} class={ITEM}>Print</div>
			</div>
			<div {...actions.item({ value: 'rename', onSelect: choose('rename') })} class={ITEM}>Rename</div>
			<div {...actions.item({ value: 'archive', disabled: true, onSelect: choose('archive') })} class={ITEM}>Archive</div>
			<div {...actions.separator} class="my-1 h-px bg-card-border"></div>
			<div {...viewGroup.root}>
				<div {...viewGroup.label} class="px-2 py-1 text-xs text-fg-light">View</div>
				<div {...actions.checkbox({ value: 'hidden', checked: () => hidden, onCheckedChange: (v) => (hidden = v) })} class={ITEM}>
					Show hidden files
				</div>
				<div
					{...actions.checkbox({ value: 'wrap', checked: () => wrap, onCheckedChange: (v) => (wrap = v), closeOnSelect: true })}
					class={ITEM}
				>
					Word wrap
				</div>
			</div>
			<div {...actions.separator} class="my-1 h-px bg-card-border"></div>
			<div {...sortGroup.root}>
				<div {...sortGroup.item({ value: 'name' })} class={ITEM}>Name</div>
				<div {...sortGroup.item({ value: 'date' })} class={ITEM}>Date</div>
				<div {...sortGroup.item({ value: 'size' })} class={ITEM}>Size</div>
			</div>
			<div {...actions.separator} class="my-1 h-px bg-card-border"></div>
			<div
				{...actions.item({
					value: 'pin',
					onSelect: (event) => {
						event.preventDefault();
						selected.push('pin');
					}
				})}
				class={ITEM}
			>
				Pin (stays open)
			</div>
			<div {...actions.item({ value: 'delete', onSelect: choose('delete') })} class={ITEM}>Delete</div>
		</div>
		<p data-testid="state">hidden={hidden} wrap={wrap} sort={sort}</p>
		<p data-testid="selected">{selected.join(',') || 'none'}</p>
		<button type="button" class={buttonClass('ghost', 'sm')}>After actions</button>
	</section>

	<section class="space-y-2">
		<h2 class={SURFACE.title}>Menu inside a dialog</h2>
		<button {...dialog.trigger} class={buttonClass('secondary', 'md')}>Open dialog</button>
		<dialog {...dialog.content} class="fade w-[min(28rem,calc(100vw-2rem))] rounded-card border border-card-border bg-card-bg p-5 text-fg-main">
			<h2 {...dialog.title} class={SURFACE.heading}>Dialog with a menu</h2>
			<div class="mt-3 flex gap-2">
				<button {...dmenu.trigger} class={buttonClass('secondary', 'sm')}>Dialog menu</button>
				<button {...dialog.close} class={buttonClass('ghost', 'sm')}>Close dialog</button>
			</div>
			<div {...dmenu.content} class={SURFACE_CLASS}>
				<div {...dmenu.item({ value: 'edit', onSelect: choose('edit') })} class={ITEM}>Edit</div>
				<div {...more.trigger} class={ITEM}><span class="flex-1">More</span><span aria-hidden="true">›</span></div>
				<div {...more.content} class={SURFACE_CLASS}>
					<div {...more.item({ value: 'duplicate', onSelect: choose('duplicate') })} class={ITEM}>Duplicate</div>
					<div {...more.item({ value: 'move', onSelect: choose('move') })} class={ITEM}>Move</div>
				</div>
			</div>
		</dialog>
	</section>

	<section class="space-y-2">
		<h2 class={SURFACE.title}>Context menu</h2>
		<div
			{...ctx.trigger}
			data-testid="region"
			class="flex h-40 items-center justify-center rounded-card border border-dashed border-card-border text-sm text-fg-light"
		>
			<button type="button" class={buttonClass('ghost', 'sm')}>Region button</button>
			<div {...ctx.content} class={SURFACE_CLASS}>
				<div {...ctx.item({ value: 'cut', onSelect: choose('cut') })} class={ITEM}>Cut</div>
				<div {...ctx.item({ value: 'paste', onSelect: choose('paste') })} class={ITEM}>Paste</div>
			</div>
		</div>
	</section>

	<ol data-testid="log" class="text-xs text-fg-light">
		{#each log as entry, i (i)}
			<li>{entry}</li>
		{/each}
	</ol>

	<div class="h-[60vh]" aria-hidden="true"></div>
</main>

<style>
	@media (prefers-reduced-motion: no-preference) {
		:global(.fade) {
			transition:
				opacity 120ms ease,
				translate 120ms ease;
		}
		:global(.fade[data-state='closed']) {
			opacity: 0;
			translate: 0 4px;
		}
		@starting-style {
			:global(.fade[data-state='open']) {
				opacity: 0;
			}
		}
	}
</style>
