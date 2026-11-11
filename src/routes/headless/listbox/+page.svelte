<!--
	Browser-test fixture for the headless option lists (tests/browser/headless/listbox.spec.ts).
	Not part of the catalogue. `?anchor=native|fallback` forces the positioning strategy.
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import { Combobox, Dialog, Listbox, Select, type ChangeReason } from '$lib/entries/headless';
	import { __setPositionStrategy } from '$lib/headless/runtime/position';
	import { buttonClass, INPUT_CLASS, SURFACE } from '$lib/ui/styles';

	if (browser) {
		const flag = new URLSearchParams(location.search).get('anchor');
		__setPositionStrategy(flag === 'native' || flag === 'fallback' ? flag : 'auto');
	}

	const LIST = 'max-h-(--ak-available-height) overflow-auto rounded-card border border-card-border bg-card-bg p-1 text-fg-main';
	const OPTION =
		'cursor-default rounded-control px-2 py-1.5 text-sm data-highlighted:bg-canvas-secondary data-selected:font-semibold data-disabled:opacity-50';

	const id = $props.id();
	let log = $state<string[]>([]);
	const record = (name: string) => (open: boolean, reason: ChangeReason) => {
		log.push(`${name}:${open ? 'open' : 'closed'}:${reason}`);
	};

	const fruits = [
		{ value: 'apple', label: 'Apple' },
		{ value: 'apricot', label: 'Apricot' },
		{ value: 'banana', label: 'Banana' },
		{ value: 'blueberry', label: 'Blueberry' },
		{ value: 'cherry', label: 'Cherry' },
		{ value: 'durian', label: 'Durian', disabled: true },
		{ value: 'elderberry', label: 'Elderberry' }
	];
	const labelOf = (value: string | null) => fruits.find((f) => f.value === value)?.label ?? '';

	// Select: controlled value, uncontrolled open.
	let fruit = $state<string | null>(null);
	const select = new Select({
		id: `${id}-fruit`,
		value: () => fruit,
		onValueChange: (next) => (fruit = next),
		onOpenChange: record('select')
	});

	// Filtering combobox with an empty state.
	let query = $state('');
	let picked = $state<string | null>(null);
	const combo = new Combobox({
		id: `${id}-combo`,
		value: () => picked,
		onValueChange: (next) => {
			picked = next;
			query = labelOf(next);
		},
		onOpenChange: record('combo')
	});
	const matches = $derived(
		query === labelOf(picked) ? fruits : fruits.filter((f) => f.label.toLowerCase().includes(query.trim().toLowerCase()))
	);

	// CommandPalette: a Dialog around an inline Combobox that runs commands.
	const commands = [
		{ value: 'new-run', label: 'New run' },
		{ value: 'open-settings', label: 'Open settings' },
		{ value: 'toggle-theme', label: 'Toggle theme' },
		{ value: 'sign-out', label: 'Sign out' }
	];
	let paletteOpen = $state(false);
	let paletteQuery = $state('');
	let ran = $state('none');
	const palette = new Dialog({
		id: `${id}-palette`,
		open: () => paletteOpen,
		onOpenChange: (open, reason) => {
			paletteOpen = open;
			if (!open) paletteQuery = '';
			record('palette')(open, reason);
		}
	});
	const cmd = new Combobox({
		id: `${id}-cmd`,
		inline: true,
		onActivate: (value) => {
			ran = value;
			paletteOpen = false;
			paletteQuery = '';
		}
	});
	const hits = $derived(commands.filter((c) => c.label.toLowerCase().includes(paletteQuery.trim().toLowerCase())));

	// Multi-select listbox.
	const tags = ['bug', 'docs', 'feature', 'infra', 'perf', 'security'];
	let picks = $state<string[]>([]);
	const tagList = new Listbox({
		id: `${id}-tags`,
		multiple: true,
		value: () => picks,
		onValueChange: (next) => (picks = next)
	});
</script>

<svelte:head>
	<title>Headless option lists · Agents Kit Svelte</title>
</svelte:head>

<main class="mx-auto max-w-3xl space-y-8 px-4 py-10">
	<h1 class={SURFACE.heading}>Headless option lists</h1>

	<section class="space-y-2">
		<h2 class={SURFACE.title}>Select</h2>
		<span {...select.label} class="block text-xs">Fruit</span>
		<button {...select.trigger} class={buttonClass('secondary', 'md', 'w-56 justify-between')}>
			{fruit ? labelOf(fruit) : 'Choose a fruit'}
		</button>
		<div {...select.list} class="{LIST} w-(--ak-anchor-width)">
			{#each fruits as f (f.value)}
				<div {...select.option({ value: f.value, disabled: f.disabled })} class={OPTION}>{f.label}</div>
			{/each}
		</div>
		<p data-testid="select-value">{fruit ?? 'none'}</p>
	</section>

	<section class="space-y-2">
		<h2 class={SURFACE.title}>Combobox</h2>
		<label {...combo.label} class="block text-xs">Search fruit</label>
		<input {...combo.input} bind:value={query} class={INPUT_CLASS} style="width: 18rem" />
		<div {...combo.list} class="{LIST} w-(--ak-anchor-width)">
			{#each matches as f (f.value)}
				<div {...combo.option({ value: f.value, disabled: f.disabled, textValue: f.label })} class={OPTION}>
					{f.label}
				</div>
			{:else}
				<div role="presentation" class="px-2 py-1.5 text-sm" data-testid="combo-empty">No matches</div>
			{/each}
		</div>
		<p data-testid="combo-value">{picked ?? 'none'}</p>
		<button type="button" class={buttonClass('ghost', 'sm')}>After combobox</button>
	</section>

	<section class="space-y-2">
		<h2 class={SURFACE.title}>Command palette</h2>
		<button {...palette.trigger} class={buttonClass('secondary', 'md')}>Open palette</button>
		<p data-testid="ran">{ran}</p>
		<dialog {...palette.content} class="w-[min(28rem,calc(100vw-2rem))] rounded-card border border-card-border bg-card-bg p-3 text-fg-main">
			<h2 {...palette.title} class="sr-only">Command palette</h2>
			<label {...cmd.label} class="sr-only">Command</label>
			<!-- svelte-ignore a11y_autofocus -->
			<input {...cmd.input} bind:value={paletteQuery} autofocus class={INPUT_CLASS} placeholder="Type a command" />
			<div {...cmd.list} class="mt-2">
				{#each hits as c (c.value)}
					<div {...cmd.option({ value: c.value })} class={OPTION}>{c.label}</div>
				{:else}
					<div role="presentation" class="px-2 py-1.5 text-sm" data-testid="cmd-empty">No commands</div>
				{/each}
			</div>
		</dialog>
	</section>

	<section class="space-y-2">
		<h2 class={SURFACE.title}>Multi-select listbox</h2>
		<span {...tagList.label} class="block text-xs">Labels</span>
		<div {...tagList.list} class="w-56 rounded-card border border-card-border p-1">
			{#each tags as tag (tag)}
				<div {...tagList.option({ value: tag, disabled: tag === 'infra' })} class={OPTION}>{tag}</div>
			{/each}
		</div>
		<p data-testid="tags-value">{picks.join(',') || 'none'}</p>
	</section>

	<ol data-testid="log" class="text-xs text-fg-light">
		{#each log as entry, i (i)}
			<li>{entry}</li>
		{/each}
	</ol>

	<div class="h-[60vh]" aria-hidden="true"></div>
</main>
