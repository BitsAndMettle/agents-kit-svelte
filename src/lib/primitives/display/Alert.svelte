<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { CircleCheck, Info, OctagonAlert, TriangleAlert, X } from '@lucide/svelte';
	import { cn } from '../../ui/cn';
	import type { UiTone } from '../../ui/styles';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'title' | 'role'> {
		tone?: UiTone;
		title?: string;
		description?: string;
		/** Alert body, shown after the description. */
		children?: Snippet;
		/** Replaces the tone's icon. */
		icon?: Snippet;
		/** Hides the icon. */
		hideIcon?: boolean;
		/** Buttons or links under the text. */
		actions?: Snippet;
		/**
		 * Shows a dismiss button that calls this. The alert does not remove itself: stop rendering it.
		 * Return a promise and the alert waits for it, marked busy, and ignores a second press. If it
		 * rejects, the alert stays; the rejection is yours to handle.
		 */
		onDismiss?: () => unknown;
		dismissLabel?: string;
		/**
		 * Announces the alert when it appears. `true` and `'assertive'` use `role="alert"`, `'polite'` uses `role="status"`.
		 * Without it the alert is a plain block, so a page full of notices stays quiet.
		 */
		live?: boolean | 'polite' | 'assertive';
		class?: string;
	}

	let {
		tone = 'neutral',
		title = '',
		description = '',
		children,
		icon,
		hideIcon = false,
		actions,
		onDismiss,
		dismissLabel = 'Dismiss',
		live = false,
		class: className = '',
		...rest
	}: Props = $props();

	const TONES: Record<UiTone, string> = {
		neutral: 'border-card-border bg-canvas-secondary',
		accent: 'border-accent-primary/30 bg-accent-subtle',
		success: 'border-status-success/30 bg-status-success-subtle',
		warning: 'border-status-warning/30 bg-status-warning-subtle',
		danger: 'border-status-danger/30 bg-status-danger-subtle'
	};
	const ICON_TONES: Record<UiTone, string> = {
		neutral: 'text-fg-light',
		accent: 'text-accent-primary',
		success: 'text-status-success',
		warning: 'text-status-warning',
		danger: 'text-status-danger'
	};
	const ICONS: Record<UiTone, Component> = {
		neutral: Info,
		accent: Info,
		success: CircleCheck,
		warning: TriangleAlert,
		danger: OctagonAlert
	};

	let role = $derived(live === false ? undefined : live === 'polite' ? 'status' : 'alert');
	let Glyph = $derived(ICONS[tone]);

	let pending = $state(false);

	async function dismiss(): Promise<void> {
		if (pending) return;
		pending = true;
		try {
			await onDismiss?.();
		} finally {
			pending = false;
		}
	}
</script>

<div {...rest} {role}
	aria-busy={onDismiss ? pending : rest['aria-busy']}
	class={cn('flex w-full items-start gap-3 rounded-card border px-4 py-3 text-[13px] leading-5 text-fg-main transition-opacity', TONES[tone], pending && 'opacity-60', className)}
>
	{#if !hideIcon}
		<span aria-hidden="true" class={cn('mt-0.5 inline-flex shrink-0 [&_svg]:size-4', ICON_TONES[tone])}>
			{#if icon}{@render icon()}{:else}<Glyph />{/if}
		</span>
	{/if}
	<div class="min-w-0 flex-1">
		{#if title}<p class="m-0 font-semibold">{title}</p>{/if}
		{#if description}<p class={cn('m-0 text-fg-main/80', title && 'mt-0.5')}>{description}</p>{/if}
		{#if children}<div class={cn(title || description ? 'mt-1.5' : '')}>{@render children()}</div>{/if}
		{#if actions}<div class="mt-2.5 flex flex-wrap items-center gap-2">{@render actions()}</div>{/if}
	</div>
	{#if onDismiss}
		<button
			type="button"
			aria-label={dismissLabel}
			onclick={dismiss}
			class="-mt-1 -mr-1.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-fg-light transition-colors hover:bg-fg-main/10 hover:text-fg-main"
		>
			<X aria-hidden="true" class="size-4" />
		</button>
	{/if}
</div>
