<!--
	Browser-test fixture for agents-kit-svelte/headless (tests/browser/headless). Not part
	of the catalogue. `?anchor=native|fallback` forces the positioning strategy.
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import { Dialog, ListNav, Popover, type ChangeReason } from '$lib/entries/headless';
	import { isRestoringFocus } from '$lib/headless/runtime/layers.svelte';
	import { __setPositionStrategy } from '$lib/headless/runtime/position';
	import { buttonClass, INPUT_CLASS, SURFACE } from '$lib/ui/styles';

	if (browser) {
		const flag = new URLSearchParams(location.search).get('anchor');
		__setPositionStrategy(flag === 'native' || flag === 'fallback' ? flag : 'auto');
	}

	const id = $props.id();
	let log = $state<string[]>([]);
	const record = (name: string) => (open: boolean, reason: ChangeReason) => {
		log.push(`${name}:${open ? 'open' : 'closed'}:${reason}`);
	};

	// Controlled dialog, with a popover inside it.
	let settingsOpen = $state(false);
	const settings = new Dialog({
		id: `${id}-settings`,
		open: () => settingsOpen,
		onOpenChange: (open, reason) => {
			settingsOpen = open;
			record('settings')(open, reason);
		}
	});
	const inner = new Popover({ id: `${id}-inner`, onOpenChange: record('inner') });

	// Uncontrolled popover outside any dialog, and one near the bottom edge.
	const pagePopover = new Popover({ id: `${id}-page`, onOpenChange: record('page') });
	/** Who focused the page trigger last: the person, or the stack returning focus. */
	let pageTriggerFocus = $state('none');
	const bottomPopover = new Popover({ id: `${id}-bottom`, onOpenChange: record('bottom') });

	const alert = new Dialog({ id: `${id}-alert`, role: 'alertdialog', onOpenChange: record('alert') });

	// A dialog whose trigger is re-keyed (a new element) while it is open.
	let triggerVersion = $state(0);
	const rekeyed = new Dialog({ id: `${id}-rekeyed`, onOpenChange: record('rekeyed') });

	// A controlled consumer that refuses Escape by not writing it back.
	let stickyOpen = $state(false);
	const sticky = new Dialog({
		id: `${id}-sticky`,
		open: () => stickyOpen,
		onOpenChange: (open, reason) => {
			record('sticky')(open, reason);
			if (reason !== 'escape') stickyOpen = open;
		}
	});

	// A veto, with an input inside that stops Escape from propagating.
	const guarded = new Dialog({
		id: `${id}-guarded`,
		dismiss: { escape: () => false },
		onOpenChange: record('guarded')
	});

	// A popover whose trigger is re-keyed or removed while it is open.
	let reanchorVersion = $state(0);
	let reanchorPresent = $state(true);
	const reanchor = new Popover({ id: `${id}-reanchor`, onOpenChange: record('reanchor') });

	// An anchor-only popover (no trigger), opened from code, like a combobox list.
	const anchored = new Popover({
		id: `${id}-anchored`,
		initialFocus: 'none',
		placement: { side: 'bottom', align: 'start' },
		onOpenChange: record('anchored')
	});

	// A popover inside CSS zoom.
	const zoomed = new Popover({ id: `${id}-zoomed`, onOpenChange: record('zoomed') });

	// ListNav: a roving toolbar (with a text input, a removable item and an item that is
	// also a popover trigger) and an active-descendant filtered list.
	let tools = $state([
		{ id: 'bold', label: 'Bold', disabled: false },
		{ id: 'italic', label: 'Italic', disabled: true },
		{ id: 'underline', label: 'Underline', disabled: false },
		{ id: 'strike', label: 'Strike', disabled: false },
		{ id: 'dismiss', label: 'Dismiss', disabled: false }
	]);
	let lastTool = $state('none');
	const toolbar = new ListNav({ id: `${id}-toolbar`, focus: 'roving', orientation: 'horizontal' });
	const more = new Popover({ id: `${id}-more`, onOpenChange: record('more') });

	const fruits = ['Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry', 'Damson', 'Elderberry'];
	let query = $state('');
	let picked = $state('none');
	const fruitNav = new ListNav({
		id: `${id}-fruits`,
		focus: 'active-descendant',
		autoHighlight: true,
		onActivate: (value) => (picked = value)
	});
	const shown = $derived(fruits.filter((f) => f.toLowerCase().includes(query.trim().toLowerCase())));
</script>

<svelte:head>
	<title>Headless fixture · Agents Kit Svelte</title>
</svelte:head>

<main class="mx-auto max-w-3xl space-y-8 px-4 py-10">
	<h1 class={SURFACE.heading}>Headless fixture</h1>

	<section class="space-y-2">
		<h2 class={SURFACE.title}>Dialog with a popover inside</h2>
		<button {...settings.trigger} data-testid="settings-trigger" class={buttonClass('secondary', 'md')}>Open settings</button>
		<p data-testid="settings-open">{settingsOpen ? 'open' : 'closed'}</p>

		<dialog {...settings.content} class="fade w-[min(28rem,calc(100vw-2rem))] rounded-card border border-card-border bg-card-bg p-5 text-fg-main">
			<h2 {...settings.title} class={SURFACE.heading}>Settings</h2>
			<p {...settings.description} class={SURFACE.description} data-testid="settings-description">
				Change how runs are shown.
			</p>
			<label class="mt-3 block text-xs">
				Name
				<input class={INPUT_CLASS} value="Agent" />
			</label>
			<div class="mt-3 flex gap-2">
				<button {...inner.trigger} data-testid="inner-trigger" class={buttonClass('secondary', 'sm')}>Open inner popover</button>
				<button {...settings.close} class={buttonClass('ghost', 'sm')}>Close settings</button>
			</div>
			<div {...inner.content} class="fade rounded-card border border-card-border bg-card-bg p-3 text-sm text-fg-main">
				<p {...inner.title}>Inner popover</p>
				<button type="button" class={buttonClass('secondary', 'xs')}>Inner action</button>
			</div>
		</dialog>
	</section>

	<section class="space-y-2">
		<h2 class={SURFACE.title} data-testid="page-heading">Popover outside any dialog</h2>
		<div class="flex flex-wrap gap-2">
			<button
				{...pagePopover.trigger}
				data-testid="page-trigger"
				class={buttonClass('secondary', 'md')}
				onfocus={(e) => (pageTriggerFocus = isRestoringFocus(e.currentTarget) ? 'restored' : 'person')}
			>
				Open page popover
			</button>
			<button
				type="button"
				class={buttonClass('ghost', 'md')}
				onclick={() => {
					pagePopover.open = true;
					pagePopover.open = true;
				}}
			>
				Open page popover twice
			</button>
		</div>
		<p data-testid="page-trigger-focus">{pageTriggerFocus}</p>
		<div {...pagePopover.content} class="fade w-56 rounded-card border border-card-border bg-card-bg p-3 text-sm text-fg-main">
			<p {...pagePopover.title}>Page popover</p>
			<button type="button" class={buttonClass('secondary', 'xs')}>Page action</button>
		</div>
	</section>

	<section class="space-y-2">
		<h2 class={SURFACE.title}>Alert dialog</h2>
		<button {...alert.trigger} data-testid="alert-trigger" class={buttonClass('danger', 'md')}>Delete run</button>
		<dialog {...alert.content} class="fade w-[min(24rem,calc(100vw-2rem))] rounded-card border border-card-border bg-card-bg p-5 text-fg-main">
			<h2 {...alert.title} class={SURFACE.heading}>Delete this run?</h2>
			<p {...alert.description} class={SURFACE.description}>This removes the run and its logs.</p>
			<div class="mt-4 flex justify-end gap-2">
				<!-- svelte-ignore a11y_autofocus -->
				<button {...alert.close} autofocus class={buttonClass('secondary', 'sm')}>Cancel</button>
				<button {...alert.close} class={buttonClass('danger', 'sm')}>Delete</button>
			</div>
		</dialog>
	</section>

	<section class="space-y-2">
		<h2 class={SURFACE.title}>Re-keyed trigger</h2>
		{#key triggerVersion}
			<button {...rekeyed.trigger} data-testid="rekeyed-trigger" class={buttonClass('secondary', 'md')} data-version={triggerVersion}>
				Open re-keyed dialog
			</button>
		{/key}
		<dialog {...rekeyed.content} class="fade rounded-card border border-card-border bg-card-bg p-5 text-fg-main">
			<h2 {...rekeyed.title} class={SURFACE.heading}>Re-keyed</h2>
			<div class="mt-3 flex gap-2">
				<button type="button" class={buttonClass('secondary', 'sm')} onclick={() => triggerVersion++}>
					Re-key trigger
				</button>
				<button {...rekeyed.close} class={buttonClass('ghost', 'sm')}>Close re-keyed</button>
			</div>
		</dialog>
	</section>

	<section class="space-y-2">
		<h2 class={SURFACE.title}>Refusing consumers</h2>
		<div class="flex flex-wrap gap-2">
			<button {...sticky.trigger} data-testid="sticky-trigger" class={buttonClass('secondary', 'md')}>Open sticky</button>
			<button {...guarded.trigger} data-testid="guarded-trigger" class={buttonClass('secondary', 'md')}>Open guarded</button>
		</div>
		<p data-testid="sticky-open">{stickyOpen ? 'open' : 'closed'}</p>
		<dialog {...sticky.content} class="rounded-card border border-card-border bg-card-bg p-5 text-fg-main">
			<h2 {...sticky.title} class={SURFACE.heading}>Sticky</h2>
			<button {...sticky.close} class={buttonClass('ghost', 'sm')}>Close sticky</button>
		</dialog>
		<dialog {...guarded.content} class="rounded-card border border-card-border bg-card-bg p-5 text-fg-main">
			<h2 {...guarded.title} class={SURFACE.heading}>Guarded</h2>
			<input aria-label="Stops Escape" class={INPUT_CLASS} onkeydown={(e) => e.stopPropagation()} />
			<button {...guarded.close} class={buttonClass('ghost', 'sm')}>Close guarded</button>
		</dialog>
	</section>

	<section class="space-y-2">
		<h2 class={SURFACE.title}>Anchors that move or vanish</h2>
		<div class="flex min-h-9 flex-wrap items-center gap-2">
			{#key reanchorVersion}
				{#if reanchorPresent}
					<button
						{...reanchor.trigger}
						data-testid="reanchor-trigger"
						class={buttonClass('secondary', 'md', reanchorVersion % 2 ? 'ml-24' : '')}
					>
						Open re-anchored popover
					</button>
				{/if}
			{/key}
		</div>
		<div {...reanchor.content} class="fade w-56 rounded-card border border-card-border bg-card-bg p-3 text-sm text-fg-main">
			<p {...reanchor.title}>Re-anchored</p>
			<button type="button" class={buttonClass('secondary', 'xs')} onclick={() => reanchorVersion++}>Re-key its trigger</button>
			<button type="button" class={buttonClass('secondary', 'xs')} onclick={() => (reanchorPresent = false)}>Remove its trigger</button>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<input {...anchored.anchor} aria-label="Anchor input" data-testid="anchored-anchor" class={INPUT_CLASS + ' max-w-48'} />
			<button type="button" class={buttonClass('ghost', 'md')} onclick={() => (anchored.open = true)}>Open anchored</button>
		</div>
		<div {...anchored.content} class="w-48 rounded-card border border-card-border bg-card-bg p-3 text-sm text-fg-main">
			<p {...anchored.title}>Anchored list</p>
		</div>

		<div style="zoom: 1.25">
			<button {...zoomed.trigger} data-testid="zoomed-trigger" class={buttonClass('secondary', 'sm')}>Open zoomed popover</button>
			<div {...zoomed.content} class="w-40 rounded-card border border-card-border bg-card-bg p-2 text-xs text-fg-main">
				<p {...zoomed.title}>Zoomed</p>
			</div>
		</div>
	</section>

	<section class="space-y-2">
		<h2 class={SURFACE.title}>Toolbar (ListNav, roving)</h2>
		<div role="toolbar" aria-label="Formatting" {...toolbar.root} class="flex flex-wrap gap-1">
			{#each tools as tool (tool.id)}
				<button
					type="button"
					{...toolbar.item({ value: tool.id, disabled: tool.disabled })}
					class={buttonClass('secondary', 'sm')}
					onclick={() => {
						lastTool = tool.id;
						if (tool.id === 'dismiss') tools = tools.filter((t) => t.id !== 'dismiss');
					}}
				>
					{tool.label}
				</button>
			{/each}
			<button {...toolbar.item({ value: 'more' })} {...more.trigger} data-testid="more-trigger" class={buttonClass('secondary', 'sm')}>
				More
			</button>
			<input aria-label="Font size" class={INPUT_CLASS + ' w-20'} />
		</div>
		<div {...more.content} class="w-40 rounded-card border border-card-border bg-card-bg p-2 text-xs text-fg-main">
			<p {...more.title}>More tools</p>
		</div>
		<p data-testid="last-tool">{lastTool}</p>
	</section>

	<section class="space-y-2">
		<h2 class={SURFACE.title}>Filtered list (ListNav, active descendant)</h2>
		<input
			{...fruitNav.owner}
			bind:value={query}
			aria-label="Fruit"
			aria-controls="{id}-fruit-list"
			role="combobox"
			aria-expanded="true"
			class={INPUT_CLASS}
		/>
		<div
			id="{id}-fruit-list"
			role="listbox"
			aria-label="Fruits"
			{...fruitNav.root}
			data-testid="fruit-list"
			class="max-h-20 overflow-auto rounded-card border border-card-border p-1"
		>
			{#each shown as fruit (fruit)}
				<div
					role="option"
					aria-selected={picked === fruit}
					{...fruitNav.item({ value: fruit })}
					class="rounded-control px-2 py-1 text-sm data-highlighted:bg-canvas-secondary"
				>
					{fruit}
				</div>
			{/each}
		</div>
		<p data-testid="picked">{picked}</p>
	</section>

	<ol data-testid="log" class="text-xs text-fg-light">
		{#each log as entry, i (i)}
			<li>{entry}</li>
		{/each}
	</ol>

	<div class="h-[60vh]" aria-hidden="true"></div>
</main>

<div class="fixed bottom-3 left-1/2 -translate-x-1/2">
	<button {...bottomPopover.trigger} data-testid="bottom-trigger" class={buttonClass('secondary', 'md')}>Open bottom popover</button>
	<div {...bottomPopover.content} class="fade w-48 rounded-card border border-card-border bg-card-bg p-3 text-sm text-fg-main">
		<p>Bottom popover</p>
		<p>With a few lines</p>
		<p>so it cannot fit below</p>
	</div>
</div>

<style>
	@media (prefers-reduced-motion: no-preference) {
		.fade {
			transition:
				opacity 200ms ease,
				translate 200ms ease;
		}
		.fade[data-state='closed'] {
			opacity: 0;
			translate: 0 4px;
		}
		@starting-style {
			.fade[data-state='open'] {
				opacity: 0;
			}
		}
	}
</style>
