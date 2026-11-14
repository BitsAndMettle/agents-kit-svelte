<script lang="ts" module>
	/** Every word CopyValue shows or announces. */
	export interface CopyValueLabels {
		/** Text of the copy button. */
		copy: string;
		/** Shown on the button and announced after a copy. */
		copied: string;
		/** Shown and announced when the clipboard refused; the text is selected instead. */
		copyFailed: string;
		/** Shown and announced when the clipboard refused a hidden value: nothing is selected, since the page does not hold it. */
		copyFailedHidden: string;
		/** Accessible name of the copy button: "Copy API token". */
		copyFor: (label: string) => string;
		reveal: string;
		hide: string;
		/** Read with a masked value while it is hidden. */
		hidden: string;
		download: string;
		/** The show-once warning. */
		warning: string;
		/** The line under the warning. */
		warningDescription: string;
		/** The acknowledgement checkbox. */
		acknowledge: string;
		/** Why Done is unavailable until the acknowledgement is checked. */
		acknowledgeFirst: string;
		done: string;
		/** Shown in place of a value that has expired. */
		expired: string;
	}
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { Check, Copy, Download, Eye, EyeOff, TimerOff } from '@lucide/svelte';
	import { cn } from '../../ui/cn';
	import { toMillis, type TimeInput } from '../../core/time';
	import { isThenable } from '../../core/promise';
	import { useClock } from '../../state/clock.svelte';
	import { Button } from '../../primitives/actions';
	import { Alert } from '../../primitives/display';
	import { Checkbox } from '../../primitives/form';
	import { CopyState, getSettingsScope, ReadyGate } from '../shared';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		/** The value to show and copy: an ID, a URL, a command, a token. Never written to `data-*`, the URL, the console or storage. */
		value: string;
		/** Names the value ("Team ID", "Install command"). Visible unless `hideLabel`. */
		label: string;
		/** Hides the label visually; it still names the field and the copy button. */
		hideLabel?: boolean;
		/** Monospace text. Default true. */
		mono?: boolean;
		/** A prompt drawn before the value (`$`). Decorative: it is not copied. */
		prompt?: string;
		/** Hides the value behind dots until Reveal. Copy still copies it. The value is not in the page while hidden. */
		masked?: boolean;
		/** A secret shown once: a warning, Download, an optional acknowledgement and Done. */
		showOnce?: boolean;
		/** Name of the downloaded file. Default: the label, as a `.txt` file name. */
		filename?: string;
		/** With `showOnce`: Done waits for "I've saved it somewhere safe". */
		requireAcknowledge?: boolean;
		/** When the value stops working. Once passed, the value is removed and `labels.expired` shows. */
		expiresAt?: TimeInput;
		/** The current time, for `expiresAt`. Default: the clock, checked every 30 seconds once mounted. */
		now?: TimeInput;
		size?: 'sm' | 'md';
		/** After a copy: whether it worked. A notification only; the copy happened locally. */
		onCopy?: (ok: boolean) => void;
		/** After Reveal or Hide: whether the value is shown. */
		onReveal?: (shown: boolean) => void;
		/** After the file was saved locally. */
		onDownload?: () => void;
		/** Done (with `showOnce`). Return a promise to show loading. */
		onDone?: () => unknown;
		/** Words, merged over the English defaults. */
		labels?: Partial<CopyValueLabels>;
		class?: string;
	}

	let {
		value,
		label,
		hideLabel = false,
		mono = true,
		prompt,
		masked = false,
		showOnce = false,
		filename,
		requireAcknowledge = false,
		expiresAt,
		now,
		size = 'md',
		onCopy,
		onReveal,
		onDownload,
		onDone,
		labels,
		class: className = '',
		...rest
	}: Props = $props();

	const text = $derived<CopyValueLabels>({
		copy: 'Copy',
		copied: 'Copied',
		copyFailed: "Couldn't copy. The text is selected: press Ctrl+C or ⌘C.",
		copyFailedHidden: "Couldn't copy. Choose Reveal, then select the text and copy it yourself.",
		copyFor: (l) => `Copy ${l}`,
		reveal: 'Reveal',
		hide: 'Hide',
		hidden: 'Hidden. Choose Reveal to show it.',
		download: 'Download',
		warning: "You won't see this again",
		warningDescription: 'Copy it or download it now and keep it somewhere safe. Once you leave, it cannot be shown again.',
		acknowledge: "I've saved it somewhere safe",
		acknowledgeFirst: 'Check the box above first.',
		done: 'Done',
		expired: 'This value has expired.',
		...labels
	});

	const uid = $props.id();
	const inputId = `${uid}-value`;
	const statusId = `${uid}-status`;
	const hiddenId = `${uid}-hidden`;
	const ackReasonId = `${uid}-ack`;

	// The scope's readiness (SettingsLayout `ready`) holds back Copy, Reveal and Download too.
	const scope = getSettingsScope();
	const ready = new ReadyGate(() => scope?.ready());
	const copier = new CopyState();
	const clock = useClock(() => now);

	// Local only: a remount starts masked again.
	let revealed = $state(false);
	let acknowledged = $state(false);
	let finishing = $state(false);
	let input = $state<HTMLInputElement | null>(null);

	const expired = $derived(expiresAt !== undefined && clock.value !== undefined && toMillis(clock.value) >= toMillis(expiresAt));
	const concealed = $derived(masked && !revealed);
	// While hidden, the page holds dots, not the value.
	const shown = $derived(concealed ? '•'.repeat(Math.max(8, Math.min(value.length, 24))) : value);
	const doneBlocked = $derived(requireAcknowledge && !acknowledged);
	const fileName = $derived(filename ?? `${label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'value'}.txt`);

	/** Whether the failed copy was of a hidden value (no text to select), so the right words show. */
	let failedHidden = $state(false);

	async function copy(): Promise<void> {
		if (!ready.current || expired) return;
		const wasConcealed = concealed;
		const ok = await copier.copy(value);
		failedHidden = !ok && wasConcealed;
		if (!ok && !wasConcealed && input) {
			// The fallback: select the text so a keyboard copy works.
			input.focus();
			input.select();
		}
		onCopy?.(ok);
	}

	function toggleReveal(): void {
		if (!ready.current) return;
		revealed = !revealed;
		onReveal?.(revealed);
	}

	function download(): void {
		if (!ready.current || expired) return;
		const url = URL.createObjectURL(new Blob([`${value}\n`], { type: 'text/plain' }));
		const link = document.createElement('a');
		link.href = url;
		link.download = fileName;
		link.click();
		// Some browsers read the file after the click returns: give the download time before letting go.
		setTimeout(() => URL.revokeObjectURL(url), 30_000);
		onDownload?.();
	}

	async function done(): Promise<void> {
		if (!ready.current || doneBlocked || finishing) return;
		const result = onDone?.();
		if (!isThenable(result)) return;
		finishing = true;
		try {
			await result;
		} catch {
			// The app reports its own failure; Done only stops loading.
		} finally {
			finishing = false;
		}
	}

	const announcement = $derived(copier.status === 'copied' ? text.copied : copier.status === 'failed' ? (failedHidden ? text.copyFailedHidden : text.copyFailed) : '');
</script>

<div {...rest} data-masked={masked ? (concealed ? 'hidden' : 'shown') : undefined} data-expired={expired ? '' : undefined} class={cn('flex min-w-0 flex-col gap-2 text-fg-main', className)}>
	{#if showOnce && !expired}
		<Alert tone="warning" title={text.warning} description={text.warningDescription} />
	{/if}
	<div class="flex min-w-0 flex-col gap-1.5">
		{#if expired}
			<p class={cn('m-0 text-[13px] font-medium text-fg-main', hideLabel && 'sr-only')}>{label}</p>
			<p class="m-0 flex items-center gap-2 rounded-control border border-dashed border-card-border px-3 py-2 text-[13px] text-fg-light [&_svg]:size-3.5 [&_svg]:shrink-0">
				<TimerOff aria-hidden="true" />
				<span>{text.expired}</span>
			</p>
		{:else}
			<label for={inputId} class={cn('text-[13px] font-medium text-fg-main', hideLabel && 'sr-only')}>{label}</label>
			<div
				class={cn(
					'flex min-w-0 items-center gap-1 rounded-control border border-card-border bg-canvas-secondary/50 pr-1 transition-[border-color,box-shadow] has-[input:focus-visible]:border-accent-primary/50 has-[input:focus-visible]:shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-accent-primary)_14%,transparent)]',
					size === 'sm' ? 'h-8' : 'h-9'
				)}
			>
				{#if prompt}
					<span aria-hidden="true" class={cn('shrink-0 pl-3 text-fg-light select-none', mono && 'font-mono', size === 'sm' ? 'text-xs' : 'text-[13px]')}>{prompt}</span>
				{/if}
				<input
					bind:this={input}
					id={inputId}
					type="text"
					readonly
					value={shown}
					autocomplete="off"
					spellcheck="false"
					aria-describedby={[concealed ? hiddenId : '', copier.status === 'failed' ? statusId : ''].filter(Boolean).join(' ') || undefined}
					onfocus={(event) => !concealed && event.currentTarget.select()}
					onkeydown={(event) => {
						// Read-only: inside a form, Enter here must not submit it (a SettingsForm would save).
						if (event.key === 'Enter') event.preventDefault();
					}}
					class={cn(
						'h-full min-w-0 flex-1 truncate border-0 bg-transparent text-fg-main focus:outline-none',
						prompt ? 'pl-2' : 'pl-3',
						mono && 'font-mono',
						concealed && 'tracking-[0.2em] text-fg-light',
						size === 'sm' ? 'text-xs' : 'text-[13px]'
					)}
				/>
				{#if concealed}<span id={hiddenId} class="sr-only">{text.hidden}</span>{/if}
				{#if masked}
					<Button variant="ghost" size="xs" softDisabled={!ready.current} onclick={toggleReveal} aria-controls={inputId}>
						{#snippet leading()}{#if concealed}<Eye aria-hidden="true" />{:else}<EyeOff aria-hidden="true" />{/if}{/snippet}
						{concealed ? text.reveal : text.hide}
					</Button>
				{/if}
				<Button variant="secondary" size="xs" softDisabled={!ready.current} aria-label={text.copyFor(label)} data-copy-state={copier.status} onclick={copy}>
					{#snippet leading()}{#if copier.status === 'copied'}<Check aria-hidden="true" />{:else}<Copy aria-hidden="true" />{/if}{/snippet}
					{text.copy}
				</Button>
			</div>
		{/if}
		<p id={statusId} role="status" class={cn('m-0 text-xs leading-5', copier.status === 'failed' ? 'font-medium text-fg-main' : 'text-fg-light', copier.status === 'idle' && 'sr-only')}>{announcement}</p>
	</div>
	{#if showOnce}
		<div class="flex flex-col gap-3 border-t border-canvas-border pt-3">
			{#if requireAcknowledge && !expired}
				<Checkbox label={text.acknowledge} bind:checked={acknowledged} />
			{/if}
			<div class="flex flex-wrap items-center gap-2">
				{#if !expired}
					<Button variant="secondary" size="sm" softDisabled={!ready.current} onclick={download}>
						{#snippet leading()}<Download aria-hidden="true" />{/snippet}
						{text.download}
					</Button>
				{/if}
				<Button variant="primary" size="sm" class="ml-auto" softDisabled={!ready.current || (doneBlocked && !expired)} loading={finishing} aria-describedby={doneBlocked && !expired ? ackReasonId : undefined} onclick={done}>{text.done}</Button>
			</div>
			{#if doneBlocked && !expired}<p id={ackReasonId} class="m-0 -mt-1 text-right text-xs leading-5 text-fg-light">{text.acknowledgeFirst}</p>{/if}
		</div>
	{/if}
</div>
