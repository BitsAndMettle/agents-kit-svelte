<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { badgeClass, pillClass, type UiTone } from '../ui/styles';
	import { CircleAlert, CircleCheck, CircleHelp, ExternalLink, Quote, Send, ShieldAlert } from '@lucide/svelte';
	import type { CitedAnswerStatus, CitedSource, CitedSourceCheck } from '../types';
	import { summarizeSources } from './cited-answer';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children' | 'onSend' | 'onEdit'> {
		/** The question that was asked. */
		question: string;
		/** Who asked it, for example "Builder on card 3412". */
		askedBy?: string;
		/** The answer the agent gives. */
		answer: string;
		/** What the answer is based on, each with its check state. */
		sources: CitedSource[];
		/** Only a `draft` shows Send and Edit. */
		status?: CitedAnswerStatus;
		onOpenSource?: (source: CitedSource) => void;
		onSend?: () => void;
		onEdit?: () => void;
		class?: string;
	}

	let {
		question,
		askedBy,
		answer,
		sources,
		status,
		onOpenSource,
		onSend,
		onEdit,
		class: className = '',
		...rest
	}: Props = $props();

	const CHECK: Record<CitedSourceCheck, { tone: UiTone; label: string; hint: string }> = {
		verified: { tone: 'success', label: 'Verified', hint: 'Quote found in the source' },
		unverified: { tone: 'warning', label: 'Not checked', hint: 'Quote not checked against the source' },
		mismatch: { tone: 'danger', label: 'Mismatch', hint: 'Quote not found in the source' }
	};
	const BORDER: Record<CitedSourceCheck, string> = {
		verified: 'border-status-success',
		unverified: 'border-status-warning',
		mismatch: 'border-status-danger'
	};
	const STATUS_LABEL: Record<CitedAnswerStatus, string> = {
		draft: 'Draft',
		sent: 'Sent',
		withheld: 'Withheld'
	};

	let summary = $derived(summarizeSources(sources));
	let blocked = $derived(summary.state === 'mismatch');
	const uid = $props.id();
	let isDraft = $derived(status === 'draft');
	let canSend = $derived(isDraft && summary.sendable && !!onSend);
	let headingId = $derived(`cited-answer-${uid}`);
</script>

<section {...rest}
	aria-labelledby={headingId}
	class={cn('w-full overflow-hidden rounded-[20px] border border-chat-border bg-card-bg p-4 text-sm ak-shadow-soft sm:p-5', className)}
>
	{#if blocked}
		<div role="alert" class="mb-3 flex items-start gap-2.5 rounded-2xl bg-status-danger-subtle px-3.5 py-2.5 text-[13px] leading-5 text-status-danger">
			<ShieldAlert aria-hidden="true" class="mt-0.5 size-4 shrink-0" />
			<p>
				<span class="font-medium">Do not rely on this answer yet.</span>
				{summary.label}, so it is not safe to send.
			</p>
		</div>
	{/if}

	<div class="flex items-start justify-between gap-2">
		<div class="min-w-0">
			<p id={headingId} class="flex items-start gap-1.5 text-[13px] italic leading-5 text-fg-light">
				<Quote aria-hidden="true" class="mt-0.5 size-3.5 shrink-0" />
				<span class="min-w-0 break-words"><span class="sr-only">Question: </span>{question}</span>
			</p>
			{#if askedBy}
				<p class="mt-0.5 pl-5 text-xs text-fg-light">Asked by {askedBy}</p>
			{/if}
		</div>
		{#if status}
			<span class={badgeClass(status === 'sent' ? 'success' : status === 'withheld' ? 'neutral' : 'accent')}>
				<span class="sr-only">Status: </span>{STATUS_LABEL[status]}
			</span>
		{/if}
	</div>

	<p class="mt-3 whitespace-pre-line break-words text-[15px] leading-6 text-fg-main">{answer}</p>

	{#if sources.length > 0}
		<div class="mt-4">
			<div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
				<h4 class="text-xs font-medium text-fg-light">Based on</h4>
				<p
					class="text-xs {summary.state === 'all-verified'
						? 'text-status-success'
						: summary.state === 'mismatch'
							? 'font-medium text-status-danger'
							: 'text-status-warning'}"
				>
					{summary.label}
				</p>
			</div>
			<ul class="mt-2 grid gap-2">
				{#each sources as source (source.id)}
					{@const c = CHECK[source.check]}
					<li class="rounded-2xl bg-chat-surface p-3">
						<div class="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
							<div class="min-w-0 flex-1 text-[13px] leading-5">
								{#if source.href}
									<a
										href={source.href}
										target="_blank"
										rel="noreferrer noopener"
										onclick={() => onOpenSource?.(source)}
										class="inline-flex max-w-full items-center gap-1 rounded font-medium text-fg-main underline-offset-2 hover:underline"
									>
										<span class="break-words">{source.title}</span>
										<ExternalLink aria-hidden="true" class="size-3 shrink-0 text-fg-light" />
										<span class="sr-only">(opens in a new tab)</span>
									</a>
								{:else if onOpenSource}
									<button
										type="button"
										onclick={() => onOpenSource(source)}
										class="max-w-full rounded text-left font-medium text-fg-main underline-offset-2 hover:underline"
									>
										<span class="break-words">{source.title}</span>
									</button>
								{:else}
									<span class="break-words font-medium text-fg-main">{source.title}</span>
								{/if}
								{#if source.location}
									<span class="block font-mono text-[11px] text-fg-light">{source.location}</span>
								{/if}
							</div>
							<span class={badgeClass(c.tone)}>
								{#if source.check === 'verified'}
									<CircleCheck aria-hidden="true" />
								{:else if source.check === 'mismatch'}
									<CircleAlert aria-hidden="true" />
								{:else}
									<CircleHelp aria-hidden="true" />
								{/if}
								{c.label}
								<span class="sr-only">: {c.hint}</span>
							</span>
						</div>
						<blockquote class="mt-2 border-l-2 pl-3 text-[13px] leading-5 text-fg-main {BORDER[source.check]}">
							<p class="whitespace-pre-line break-words">{source.quote}</p>
						</blockquote>
						{#if source.check === 'mismatch'}
							<p class="mt-1.5 text-xs font-medium text-status-danger">Quote not found in the source.</p>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	{:else}
		<p role="alert" class="mt-4 rounded-2xl bg-status-warning-subtle px-3 py-2 text-xs font-medium text-status-warning">
			No sources. This answer cannot be sent from here until it cites at least one.
		</p>
	{/if}

	{#if isDraft && (onSend || onEdit)}
		<div class="mt-4 flex flex-wrap items-center justify-end gap-2">
			{#if onEdit}
				<button type="button" onclick={() => onEdit()} class={pillClass('secondary', 'md')}>Edit</button>
			{/if}
			{#if onSend && summary.sendable}
				<button type="button" disabled={!canSend} onclick={() => onSend()} class={pillClass('primary', 'md')}>
					<Send aria-hidden="true" />
					Send answer
				</button>
			{/if}
		</div>
	{/if}
</section>
