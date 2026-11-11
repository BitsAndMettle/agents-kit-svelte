<!--
	Browser-test fixture for the headless Tooltip and group patterns (tests/browser/headless).
	Not part of the catalogue. `?anchor=native|fallback` forces the positioning strategy.
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import { Accordion, Popover, RadioGroup, Tabs, ToggleGroup, Tooltip, type ChangeReason } from '$lib/entries/headless';
	import { __setPositionStrategy } from '$lib/headless/runtime/position';
	import { buttonClass, SURFACE } from '$lib/ui/styles';

	if (browser) {
		const flag = new URLSearchParams(location.search).get('anchor');
		__setPositionStrategy(flag === 'native' || flag === 'fallback' ? flag : 'auto');
	}

	const id = $props.id();
	let log = $state<string[]>([]);

	// Three adjacent tooltip triggers: the delay group's warm-up and skip-delay.
	const tools = [
		{ name: 'bold', label: 'Bold', tip: 'Make text bold' },
		{ name: 'italic', label: 'Italic', tip: 'Make text italic' },
		{ name: 'underline', label: 'Underline', tip: 'Underline text' }
	];
	const toolTips = {
		bold: new Tooltip({ id: `${id}-tip-bold` }),
		italic: new Tooltip({ id: `${id}-tip-italic` }),
		underline: new Tooltip({ id: `${id}-tip-underline` })
	};

	// One button, two parts: it opens a popover and has a tooltip.
	const share = new Popover({
		id: `${id}-share`,
		onOpenChange: (open: boolean, reason: ChangeReason) => log.push(`share:${open ? 'open' : 'closed'}:${reason}`)
	});
	const shareTip = new Tooltip({ id: `${id}-tip-share` });

	// Touch opt-in, and a tooltip near the top edge that must flip below.
	const holdTip = new Tooltip({ id: `${id}-tip-hold`, longPress: 300 });
	const edgeTip = new Tooltip({ id: `${id}-tip-edge`, delay: 0 });

	// Tabs: automatic (horizontal, one disabled), manual (vertical), automatic in RTL.
	const tabItems = [
		{ value: 'runs', label: 'Runs' },
		{ value: 'logs', label: 'Logs' },
		{ value: 'secrets', label: 'Secrets', disabled: true },
		{ value: 'settings', label: 'Settings' }
	];
	let autoValue = $state('runs');
	const autoTabs = new Tabs({ id: `${id}-auto`, value: () => autoValue, onValueChange: (v) => (autoValue = v) });
	let showLogs = $state(true);
	const autoItems = $derived(showLogs ? tabItems : tabItems.filter((tab) => tab.value !== 'logs'));
	const manualTabs = new Tabs({ id: `${id}-manual`, activation: 'manual', orientation: 'vertical' });
	const rtlTabs = new Tabs({ id: `${id}-rtl`, defaultValue: 'runs' });

	// Accordions: single and not collapsible (find-in-page content in the last panel), multiple.
	const faqItems = [
		{ value: 'what', title: 'What is a run?', body: 'A run is one agent session on a card.' },
		{ value: 'where', title: 'Where do logs go?', body: 'Logs stay on the device that ran the agent.' },
		{ value: 'secret', title: 'Can I hide a run?', body: 'Archived runs mention the word quetzalcoatl only here.' }
	];
	let faqValue = $state<string | null>('what');
	const faq = new Accordion({
		id: `${id}-faq`,
		collapsible: false,
		value: () => faqValue,
		onValueChange: (v) => (faqValue = v)
	});
	const multi = new Accordion({ id: `${id}-multi`, multiple: true, defaultValue: [] });

	// A controlled accordion whose owner refuses one item, and a disabled item.
	const guardedItems = [
		{ value: 'open', title: 'Open item', body: 'Anyone may open this.' },
		{ value: 'vault', title: 'Vault', body: 'The owner refuses: zebrafish.' },
		{ value: 'off', title: 'Disabled item', body: 'Disabled: kingfisher.', disabled: true }
	];
	let guardedValue = $state<string | null>(null);
	const guarded = new Accordion({
		id: `${id}-guarded`,
		value: () => guardedValue,
		onValueChange: (v) => {
			if (v !== 'vault') guardedValue = v;
		}
	});

	// Radio group (one disabled option) with a form input.
	let size = $state<string | null>(null);
	const sizes = new RadioGroup({
		id: `${id}-size`,
		name: 'size',
		required: true,
		value: () => size,
		onValueChange: (v) => (size = v)
	});
	const plan = new RadioGroup({ id: `${id}-plan`, name: 'plan', defaultValue: 'free' });
	let posted = $state('nothing');
	const sizeItems = [
		{ value: 'small', label: 'Small' },
		{ value: 'medium', label: 'Medium' },
		{ value: 'huge', label: 'Huge', disabled: true },
		{ value: 'large', label: 'Large' }
	];

	// Toggle groups: multiple (formatting) and single (alignment).
	let marks = $state<string[]>([]);
	const formatting = new ToggleGroup({ id: `${id}-marks`, multiple: true, value: () => marks, onValueChange: (v) => (marks = v) });
	const align = new ToggleGroup({ id: `${id}-align`, role: 'toolbar', defaultValue: 'left' });
</script>

<svelte:head>
	<title>Headless groups fixture · Agents Kit Svelte</title>
</svelte:head>

{#snippet tipContent(tip: Tooltip, text: string)}
	<div {...tip.content} class="tip rounded-control bg-fg-main px-2 py-1 text-xs text-canvas">{text}</div>
{/snippet}

<main class="mx-auto max-w-3xl space-y-8 px-4 py-10">
	<div class="fixed left-4 top-1 z-50">
		<button type="button" {...edgeTip.trigger} class={buttonClass('ghost', 'sm')} data-testid="edge">Edge</button>
		{@render tipContent(edgeTip, 'Flipped below')}
	</div>

	<h1 class={SURFACE.heading}>Headless groups fixture</h1>

	<section class="space-y-2">
		<h2 class={SURFACE.title}>Tooltips</h2>
		<div class="flex gap-1">
			{#each tools as tool (tool.name)}
				<button type="button" {...toolTips[tool.name as keyof typeof toolTips].trigger} class={buttonClass('secondary', 'sm')}>
					{tool.label}
				</button>
				{@render tipContent(toolTips[tool.name as keyof typeof toolTips], tool.tip)}
			{/each}
			<button {...share.trigger} {...shareTip.trigger} class={buttonClass('secondary', 'sm')}>Share</button>
			{@render tipContent(shareTip, 'Share this run')}
			<button type="button" {...holdTip.trigger} class={buttonClass('secondary', 'sm')}>Hold</button>
			{@render tipContent(holdTip, 'Held long enough')}
		</div>
		<div {...share.content} class="tip w-56 rounded-card border border-card-border bg-card-bg p-3 text-sm text-fg-main">
			<p {...share.title}>Share popover</p>
			<button type="button" class={buttonClass('secondary', 'xs')}>Copy link</button>
		</div>
	</section>

	<section class="space-y-2">
		<h2 class={SURFACE.title}>Tabs (automatic)</h2>
		<div {...autoTabs.list} aria-label="Automatic tabs" class="flex gap-1">
			{#each autoItems as tab (tab.value)}
				<button {...autoTabs.tab(tab)} class={buttonClass('ghost', 'sm', 'data-[state=active]:bg-canvas-secondary')}>{tab.label}</button>
			{/each}
		</div>
		{#each autoItems as tab (tab.value)}
			<div {...autoTabs.panel(tab.value)} class="p-2 text-sm">{tab.label} panel (automatic)</div>
		{/each}
		<p data-testid="auto-value">{autoValue}</p>
		<button type="button" class={buttonClass('ghost', 'xs')} onclick={() => (showLogs = !showLogs)}>
			{showLogs ? 'Remove' : 'Restore'} the Logs tab
		</button>
	</section>

	<section class="space-y-2">
		<h2 class={SURFACE.title}>Tabs (manual, vertical)</h2>
		<div class="flex gap-3">
			<div {...manualTabs.list} aria-label="Manual tabs" class="flex flex-col gap-1">
				{#each tabItems as tab (tab.value)}
					<button {...manualTabs.tab(tab)} class={buttonClass('ghost', 'sm', 'data-[state=active]:bg-canvas-secondary')}>{tab.label}</button>
				{/each}
			</div>
			{#each tabItems as tab (tab.value)}
				<div {...manualTabs.panel(tab.value)} class="p-2 text-sm">{tab.label} panel (manual)</div>
			{/each}
		</div>
		<p data-testid="manual-value">{manualTabs.value}</p>
	</section>

	<section class="space-y-2" dir="rtl">
		<h2 class={SURFACE.title}>Tabs (RTL)</h2>
		<div {...rtlTabs.list} aria-label="RTL tabs" class="flex gap-1">
			{#each tabItems as tab (tab.value)}
				<button {...rtlTabs.tab(tab)} class={buttonClass('ghost', 'sm', 'data-[state=active]:bg-canvas-secondary')}>{tab.label}</button>
			{/each}
		</div>
		{#each tabItems as tab (tab.value)}
			<div {...rtlTabs.panel(tab.value)} class="p-2 text-sm">{tab.label} panel (rtl)</div>
		{/each}
	</section>

	<section class="space-y-2">
		<h2 class={SURFACE.title}>Accordion (single, not collapsible)</h2>
		<div {...faq.root} class="divide-y divide-card-border rounded-card border border-card-border">
			{#each faqItems as item (item.value)}
				<h3>
					<button {...faq.trigger({ value: item.value })} class="w-full px-3 py-2 text-left text-sm font-medium">{item.title}</button>
				</h3>
				<div {...faq.panel(item.value)}><p class="px-3 pb-3 text-sm">{item.body}</p></div>
			{/each}
		</div>
		<p data-testid="faq-value">{faqValue ?? 'none'}</p>
	</section>

	<section class="space-y-2">
		<h2 class={SURFACE.title}>Accordion (multiple)</h2>
		<div {...multi.root} class="divide-y divide-card-border rounded-card border border-card-border">
			{#each ['alpha', 'beta'] as value (value)}
				<h3>
					<button {...multi.trigger({ value })} class="w-full px-3 py-2 text-left text-sm font-medium">Section {value}</button>
				</h3>
				<div {...multi.panel(value)}><p class="px-3 pb-3 text-sm">Body of {value}</p></div>
			{/each}
		</div>
		<p data-testid="multi-value">{multi.value.join(',') || 'none'}</p>
	</section>

	<section class="space-y-2">
		<h2 class={SURFACE.title}>Accordion (controlled, refuses one)</h2>
		<div {...guarded.root} class="divide-y divide-card-border rounded-card border border-card-border">
			{#each guardedItems as item (item.value)}
				<h3>
					<button {...guarded.trigger(item)} class="w-full px-3 py-2 text-left text-sm font-medium">{item.title}</button>
				</h3>
				<div {...guarded.panel(item.value)}><p class="px-3 pb-3 text-sm">{item.body}</p></div>
			{/each}
		</div>
		<p data-testid="guarded-value">{guardedValue ?? 'none'}</p>
	</section>

	<section class="space-y-2">
		<h2 class={SURFACE.title}>Radio group</h2>
		<form
			data-testid="size-form"
			class="relative space-y-2"
			onsubmit={(event) => {
				event.preventDefault();
				posted = [...new FormData(event.currentTarget)].map(([k, v]) => `${k}=${v}`).join('&') || 'empty';
			}}
		>
			<div {...sizes.root} aria-label="Size" class="flex gap-2">
				{#each sizeItems as item (item.value)}
					<div {...sizes.item(item)} class="rounded-control border border-card-border px-2 py-1 text-sm data-[state=checked]:bg-canvas-secondary">
						{item.label}
					</div>
				{/each}
			</div>
			{#if sizes.formInput}<input {...sizes.formInput} class="sr-only" />{/if}
			<div {...plan.root} aria-label="Plan" class="flex gap-2">
				{#each ['free', 'pro'] as value (value)}
					<div {...plan.item({ value })} class="rounded-control border border-card-border px-2 py-1 text-sm data-[state=checked]:bg-canvas-secondary">
						{value}
					</div>
				{/each}
			</div>
			{#if plan.formInput}<input {...plan.formInput} class="sr-only" />{/if}
			<div class="flex gap-2">
				<button type="submit" class={buttonClass('secondary', 'xs')}>Submit sizes</button>
				<button type="reset" class={buttonClass('ghost', 'xs')}>Reset sizes</button>
			</div>
		</form>
		<p data-testid="size-value">{size ?? 'none'}</p>
		<p data-testid="plan-value">{plan.value ?? 'none'}</p>
		<p data-testid="posted">{posted}</p>
	</section>

	<section class="space-y-2">
		<h2 class={SURFACE.title}>Toggle groups</h2>
		<div {...formatting.root} aria-label="Marks" class="flex gap-1">
			{#each ['bold', 'italic', 'code'] as value (value)}
				<button {...formatting.item({ value, disabled: value === 'italic' })} class={buttonClass('secondary', 'sm', 'aria-pressed:bg-canvas-secondary')}>{value}</button>
			{/each}
		</div>
		<p data-testid="marks-value">{marks.join(',') || 'none'}</p>
		<div {...align.root} aria-label="Alignment" class="flex gap-1">
			{#each ['left', 'center', 'right'] as value (value)}
				<button {...align.item({ value })} class={buttonClass('secondary', 'sm', 'aria-pressed:bg-canvas-secondary')}>{value}</button>
			{/each}
		</div>
		<p data-testid="align-value">{align.value ?? 'none'}</p>
	</section>

	<ol data-testid="log" class="text-xs text-fg-light">
		{#each log as entry, i (i)}
			<li>{entry}</li>
		{/each}
	</ol>
</main>

<style>
	@media (prefers-reduced-motion: no-preference) {
		.tip {
			transition: opacity 150ms ease;
		}
		.tip[data-state='closed'] {
			opacity: 0;
		}
		.tip[data-instant] {
			transition: none;
		}
		@starting-style {
			.tip[data-state='open']:not([data-instant]) {
				opacity: 0;
			}
		}
	}
</style>
