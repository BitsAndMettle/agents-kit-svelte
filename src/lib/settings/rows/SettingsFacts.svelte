<script lang="ts" module>
	/** Words of SettingsFacts. */
	export interface SettingsFactsLabels {
		/** Generic copy button name (used when `copyFor` is not set). */
		copy: string;
		/** Announced after a copy. */
		copied: string;
		/** Shown when the clipboard refused; the text to copy is then shown under it, selected, for copying by hand. */
		copyFailed: string;
		/** Shown when a fact's action rejects or throws (a returned `{error}` shows its own text). */
		actionFailed: string;
		/** The copy button's name for one fact ("Copy Team ID"). */
		copyFor: (label: string) => string;
		/** The "managed elsewhere" caption for a fact's `source`. */
		managedIn: (source: string) => string;
	}
</script>

<script lang="ts">
	import { Building2, Check, Copy } from '@lucide/svelte';
	import { tick } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Button, IconButton } from '../../primitives/actions';
	import { DANGER_TEXT } from '../../primitives/form/classes';
	import { cn } from '../../ui/cn';
	import { STATUS_TEXT_CLASS, TONE_FILL_CLASS } from '../../ui/styles';
	import { getSettingsScope } from '../shared/context';
	import { CopyState } from '../shared/copy.svelte';
	import { ReadyGate } from '../shared/ready.svelte';
	import { actionButtonProps } from '../shared/recipes';
	import type { SettingsAction, SettingsFact } from '../shared/types';
	import { factCopyText } from './helpers';
	import { SettingsHandlerRun } from '../shared/run.svelte';

	/**
	 * The facts carry no inset of their own, like every block in a `list={false}` SettingsSection:
	 * put them in the same padded box (`px-4`) as the meter or note beside them, so labels line up.
	 */
	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		/** The facts, in order. */
		items: SettingsFact[];
		/** `auto` puts label and value side by side from 32rem and stacks below; `inline` and `stacked` fix it; `grid` draws 2–3 tiles per line. */
		layout?: 'auto' | 'inline' | 'stacked' | 'grid';
		/** Called after a local copy with whether the clipboard took it. Nothing is sent anywhere. */
		onCopy?: (id: string, ok: boolean) => void;
		labels?: Partial<SettingsFactsLabels>;
		class?: string;
	}

	let { items, layout = 'auto', onCopy, labels = {}, class: className = '', ...rest }: Props = $props();

	const uid = $props.id();
	const scope = getSettingsScope();
	const ready = new ReadyGate(() => (scope ? scope.ready() : undefined));
	const copier = new CopyState();
	let copiedId = $state<string | undefined>(undefined);
	/** The fact whose copy was refused: its text stays shown and selected until the next copy. */
	let refusedId = $state<string | undefined>(undefined);
	let fallback = $state<HTMLElement | null>(null);
	/** Facts' actions: one runs at a time; its failure shows under that fact. */
	const actionRun = new SettingsHandlerRun();
	let runningId = $state<string | undefined>(undefined);

	const words = $derived<SettingsFactsLabels>({
		copy: 'Copy',
		copied: 'Copied',
		copyFailed: "Couldn't copy. The value is selected: copy it by hand.",
		actionFailed: "Couldn't do that. Try again.",
		copyFor: (label) => `Copy ${label}`,
		managedIn: (source) => source,
		...labels
	});

	const grid = $derived(layout === 'grid');
	const live = $derived(copier.status === 'copied' && copiedId ? `${words.copied}: ${items.find((f) => f.id === copiedId)?.label ?? ''}` : '');

	async function copy(fact: SettingsFact): Promise<void> {
		const text = factCopyText(fact);
		if (text === undefined) return;
		copiedId = fact.id;
		refusedId = undefined;
		const ok = await copier.copy(text);
		if (!ok) {
			// The shown value can be shortened (compactValue, a narrow container) or differ from
			// `copy`: show the exact text to copy and select that.
			refusedId = fact.id;
			await tick();
			select(fallback);
		}
		onCopy?.(fact.id, ok);
	}

	function select(el: HTMLElement | null): void {
		const selection = el ? window.getSelection() : null;
		if (!el || !selection) return;
		const range = document.createRange();
		range.selectNodeContents(el);
		selection.removeAllRanges();
		selection.addRange(range);
	}

	function runAction(fact: SettingsFact, action: SettingsAction, event: MouseEvent): void {
		if (!action.onSelect || actionRun.pending) return;
		runningId = fact.id;
		void actionRun.run(action.onSelect);
		// A promise means the callback handles it: a link with one does not also navigate.
		if (actionRun.pending) event.preventDefault();
	}

	const ROW = {
		auto: 'flex flex-col gap-1 @lg/settings:flex-row @lg/settings:items-baseline @lg/settings:gap-6',
		inline: 'flex flex-row items-baseline gap-6',
		stacked: 'flex flex-col gap-1',
		grid: 'flex flex-col gap-1.5 rounded-control border border-canvas-border bg-canvas-primary/40 p-3'
	} as const;
	const LABEL = {
		auto: '@lg/settings:w-40 @lg/settings:shrink-0',
		inline: 'w-40 shrink-0',
		stacked: '',
		grid: ''
	} as const;
</script>

<div {...rest} class={cn('min-w-0', className)}>
	<dl class={cn('m-0 min-w-0', grid ? 'grid grid-cols-1 gap-3 @lg/settings:grid-cols-2 @3xl/settings:grid-cols-3' : 'flex flex-col')}>
		{#each items as fact (fact.id)}
			{@const copyText = factCopyText(fact)}
			{@const refused = refusedId === fact.id}
			{@const actionFailed = actionRun.status === 'failed' && runningId === fact.id}
			{@const done = copier.status === 'copied' && copiedId === fact.id}
			<div data-fact={fact.id} class={cn(ROW[layout], !grid && 'border-t border-canvas-border py-3 first:border-t-0')}>
				<dt class={cn('m-0 text-xs leading-5 text-fg-light', !grid && '@lg/settings:text-[13px]', LABEL[layout])}>{fact.label}</dt>
				<dd class="m-0 flex min-w-0 flex-1 flex-col gap-0.5">
					<div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
						{#if fact.tone}<span aria-hidden="true" class={cn('size-2 shrink-0 rounded-full', TONE_FILL_CLASS[fact.tone])}></span>{/if}
						<span
							class={cn('min-w-0 break-words text-fg-main', grid ? 'text-sm font-medium' : 'text-[13px]', fact.mono && 'font-mono text-xs', fact.tone && fact.tone !== 'neutral' && 'font-medium')}
						>
							{#if fact.compactValue}
								<span class="@max-lg/settings:hidden">{fact.value}</span><span class="@lg/settings:hidden">{fact.compactValue}</span>
							{:else}{fact.value}{/if}
						</span>
						{#if copyText !== undefined && ready.current}
							<IconButton size="icon-xs" aria-label={words.copyFor(fact.label)} onclick={() => copy(fact)}>
								{#if done}<Check class={STATUS_TEXT_CLASS.success} aria-hidden="true" />{:else}<Copy aria-hidden="true" />{/if}
							</IconButton>
						{/if}
						{#if fact.action}
							<Button
								{...actionButtonProps(fact.action, fact.action.unavailable ? `${uid}-${fact.id}-unavailable` : undefined, { ready: ready.current })}
								size="xs"
								class="@lg/settings:ml-auto"
								loading={actionRun.pending && runningId === fact.id}
								onclick={(event: MouseEvent) => runAction(fact, fact.action!, event)}
							>
								{fact.action.label}
							</Button>
						{/if}
					</div>
					{#if fact.detail}<span class="text-xs leading-5 text-fg-light">{fact.detail}</span>{/if}
					{#if fact.source}
						<span class="inline-flex items-center gap-1 text-xs leading-5 text-fg-light"><Building2 class="size-3 shrink-0" aria-hidden="true" />{words.managedIn(fact.source)}</span>
					{/if}
					{#if fact.action?.unavailable}<span id="{uid}-{fact.id}-unavailable" class="text-xs leading-5 text-fg-light">{fact.action.unavailable}</span>{/if}
					{#if refused && copyText !== undefined}
						<span role="alert" class={cn('text-xs leading-5 font-medium', DANGER_TEXT)}>{words.copyFailed}</span>
						<span bind:this={fallback} class="min-w-0 font-mono text-xs break-all text-fg-main select-all">{copyText}</span>
					{/if}
					{#if actionFailed}<span role="alert" class={cn('text-xs leading-5 font-medium', DANGER_TEXT)}>{actionRun.error ?? words.actionFailed}</span>{/if}
				</dd>
			</div>
		{/each}
	</dl>
	<span role="status" class="sr-only">{live}</span>
</div>
