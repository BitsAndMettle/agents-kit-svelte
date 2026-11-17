<script lang="ts">
	import { cn } from '../ui/cn';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { ChevronDown } from '@lucide/svelte';
	import { PROGRESS_TRACK_CLASS, pillClass, progressFillClass } from '../ui/styles';
	import UsageRows from './UsageRows.svelte';
	import { rise } from '../state/motion.svelte';
	import { usageFree } from '../state/usage';
	import type { AccountUsage } from '../types';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		/** One agent's accounts. The pill names the first one's agent. */
		accounts: AccountUsage[];
		/** Whether the per-account breakdown shows. Bindable. */
		open?: boolean;
		/** Time zone for reset times. Defaults to UTC so server and browser agree. */
		timeZone?: string;
		/** Drawn under the rows, e.g. a link to the subscription settings. */
		children?: Snippet;
		class?: string;
	}

	let { accounts, open = $bindable(false), timeZone = 'UTC', children, class: className = '', ...rest }: Props = $props();

	const panelId = $props.id();
	let free = $derived(accounts.filter(usageFree).length);
</script>

<div {...rest} class={cn('inline-flex flex-col items-start gap-2 text-xs', className)}>
	<button type="button" aria-expanded={open} aria-controls={panelId} onclick={() => (open = !open)} class={pillClass('secondary', 'sm')}>
		<span aria-hidden="true" class={cn(PROGRESS_TRACK_CLASS, 'w-10')}>
			<span class={progressFillClass(free ? 'success' : 'neutral')} style:width="{accounts.length ? (free / accounts.length) * 100 : 0}%"></span>
		</span>
		<span class="font-medium">{accounts[0]?.agent ?? 'Usage'} · {free} of {accounts.length} free</span>
		<ChevronDown aria-hidden="true" class="size-3.5 text-fg-light transition-transform duration-150 {open ? 'rotate-180' : ''}" />
	</button>

	{#if open}
		<div id={panelId} transition:rise={{ y: -4 }} class="w-80 max-w-full rounded-soft border border-chat-border bg-card-bg px-3.5 py-1.5 ak-shadow-soft">
			<UsageRows {accounts} {timeZone} />
			{#if children}<div class="border-t border-canvas-border py-2">{@render children()}</div>{/if}
		</div>
	{/if}
</div>
