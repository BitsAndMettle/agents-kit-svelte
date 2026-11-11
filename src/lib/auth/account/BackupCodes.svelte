<script lang="ts" module>
	/** Every word the backup codes show or announce. */
	export interface BackupCodesLabels {
		title: string;
		description: string;
		/** Spoken after a struck-through code. */
		used: string;
		copy: string;
		copied: string;
		/** Shown (as an alert) when the clipboard is not available. */
		copyFailed: string;
		download: string;
		downloaded: string;
		regenerate: string;
		regenerateTitle: string;
		regenerateDescription: string;
		regenerateAction: string;
		regeneratePending: string;
		cancel: string;
		acknowledge: string;
		continue: string;
	}
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { untrack } from 'svelte';
	import { Copy, Download, RefreshCw } from '@lucide/svelte';
	import { isThenable } from './promise';
	import { cn } from '../../ui/cn';
	import { SURFACE } from '../../ui/styles';
	import { Button } from '../../primitives/actions';
	import { Checkbox } from '../../primitives/form';
	import { AlertDialog } from '../../primitives/overlays';

	export interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children'> {
		/** The recovery codes your server generated, shown as given. */
		codes: string[];
		/** Codes already used: shown struck through, and read as "used". */
		used?: string[];
		/** Name of the downloaded file. Default `backup-codes.txt`. */
		filename?: string;
		/** A first line for the downloaded file, e.g. the app name. */
		heading?: string;
		/** Runs after the codes were copied. Return a promise to show loading on the button. */
		onCopy?: () => unknown;
		/** Runs after the file was saved. Return a promise to show loading on the button. */
		onDownload?: () => unknown;
		/** Shows a "Regenerate" button. Confirming (in an AlertDialog) calls this; return a promise to show loading in the dialog. Your app replaces `codes`. */
		onRegenerate?: () => unknown;
		/** Adds the "I have saved these codes" checkbox and a Continue button that stays disabled until it is checked. */
		requireAcknowledge?: boolean;
		/** Choosing Continue (with `requireAcknowledge`). Return a promise to show loading. */
		onConfirm?: () => unknown;
		/** Heading level of the title. Default 3. */
		headingLevel?: 2 | 3 | 4 | 5 | 6;
		/** Words, merged over the English defaults. */
		labels?: Partial<BackupCodesLabels>;
		/** Classes for the outer box. */
		class?: string;
	}

	let {
		codes,
		used = [],
		filename = 'backup-codes.txt',
		heading,
		onCopy,
		onDownload,
		onRegenerate,
		requireAcknowledge = false,
		onConfirm,
		headingLevel = 3,
		labels,
		class: className = '',
		...rest
	}: Props = $props();

	const text = $derived<BackupCodesLabels>({
		title: 'Backup codes',
		description: 'Each code works once if you lose your other sign-in methods. Keep them somewhere safe.',
		used: 'used',
		copy: 'Copy all',
		copied: 'Copied',
		copyFailed: 'The codes could not be copied. Select them and copy by hand.',
		download: 'Download',
		downloaded: 'Downloaded',
		regenerate: 'Regenerate',
		regenerateTitle: 'Regenerate backup codes?',
		regenerateDescription: 'Your current codes stop working as soon as new ones are made.',
		regenerateAction: 'Regenerate',
		regeneratePending: 'Regenerating…',
		cancel: 'Cancel',
		acknowledge: 'I have saved these codes',
		continue: 'Continue',
		...labels
	});

	const headingId = $props.id();
	let announcement = $state('');
	let failed = $state(false);
	let acknowledged = $state(false);
	let confirming = $state(false);
	let regenerateOpen = $state(false);
	let copying = $state(false);
	let downloading = $state(false);

	// New codes are codes never saved: the acknowledgement and the "Copied" note belong to the old set.
	// Compared by content, so a parent that hands back an equal array does not reset them.
	const signature = $derived(JSON.stringify(codes));
	let seen = untrack(() => signature);
	$effect.pre(() => {
		if (signature === seen) return;
		seen = signature;
		acknowledged = false;
		announcement = '';
		failed = false;
	});

	const usedSet = $derived(new Set(used));

	function joined(): string {
		return codes.join('\n');
	}

	async function copy(): Promise<void> {
		failed = false;
		announcement = '';
		try {
			await navigator.clipboard.writeText(joined());
		} catch {
			failed = true;
			return;
		}
		announcement = text.copied;
		await after(onCopy, (on) => (copying = on));
	}

	/** Runs a callback and shows loading while a promise it returned is pending. A rejection is the app's to report. */
	async function after(callback: (() => unknown) | undefined, loading: (on: boolean) => void): Promise<void> {
		try {
			const result = callback?.();
			if (isThenable(result)) {
				loading(true);
				await result;
			}
		} catch {
			// The app reports its own failure.
		} finally {
			loading(false);
		}
	}

	async function download(): Promise<void> {
		failed = false;
		const body = (heading ? `${heading}\n\n` : '') + `${joined()}\n`;
		const url = URL.createObjectURL(new Blob([body], { type: 'text/plain' }));
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		link.hidden = true;
		document.body.append(link);
		link.click();
		link.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
		announcement = text.downloaded;
		await after(onDownload, (on) => (downloading = on));
	}

	async function proceed(): Promise<void> {
		if (confirming || !acknowledged) return;
		try {
			const result = onConfirm?.();
			if (isThenable(result)) {
				confirming = true;
				await result;
			}
		} finally {
			confirming = false;
		}
	}
</script>

<section {...rest} aria-labelledby={headingId} class={cn(SURFACE.card, className)}>
	<div class="border-b border-canvas-border px-4 py-3">
		<svelte:element this={`h${headingLevel}`} id={headingId} class="m-0 text-sm font-semibold text-fg-main">{text.title}</svelte:element>
		<p class="m-0 mt-0.5 text-xs leading-5 text-fg-light">{text.description}</p>
	</div>
	<div class="flex flex-col gap-4 px-4 py-4">
		<ol class="m-0 grid list-none grid-cols-1 gap-x-6 gap-y-2 rounded-control bg-canvas-secondary p-3 sm:grid-cols-2">
			{#each codes as code, index (index)}
				<li class="min-w-0 font-mono text-[13px] tracking-wide text-fg-main {usedSet.has(code) ? 'line-through opacity-70' : ''}">
					{code}{#if usedSet.has(code)}<span class="sr-only"> ({text.used})</span>{/if}
				</li>
			{/each}
		</ol>
		<div class="flex flex-wrap items-center gap-2">
			<Button size="sm" variant="secondary" loading={copying} onclick={copy}>
				{#snippet leading()}<Copy aria-hidden="true" />{/snippet}
				{text.copy}
			</Button>
			<Button size="sm" variant="secondary" loading={downloading} onclick={download}>
				{#snippet leading()}<Download aria-hidden="true" />{/snippet}
				{text.download}
			</Button>
			{#if onRegenerate}
				<Button size="sm" variant="ghost" onclick={() => (regenerateOpen = true)}>
					{#snippet leading()}<RefreshCw aria-hidden="true" />{/snippet}
					{text.regenerate}
				</Button>
			{/if}
		</div>
		<p role="status" class="m-0 min-h-4 text-xs font-medium text-fg-main">{announcement}</p>
		{#if failed}<p role="alert" class="m-0 rounded-control border border-status-danger/40 bg-status-danger-subtle px-3 py-2 text-[13px] leading-5 text-fg-main">{text.copyFailed}</p>{/if}
		{#if requireAcknowledge}
			<div class="flex flex-wrap items-center justify-between gap-3 border-t border-canvas-border pt-4">
				<Checkbox bind:checked={acknowledged} label={text.acknowledge} />
				<Button size="md" variant="primary" disabled={!acknowledged} loading={confirming} onclick={proceed}>{text.continue}</Button>
			</div>
		{/if}
	</div>
</section>

{#if onRegenerate}
	<AlertDialog
		bind:open={regenerateOpen}
		title={text.regenerateTitle}
		description={text.regenerateDescription}
		confirmLabel={text.regenerateAction}
		pendingLabel={text.regeneratePending}
		cancelLabel={text.cancel}
		tone="danger"
		onConfirm={() => onRegenerate()}
	/>
{/if}
