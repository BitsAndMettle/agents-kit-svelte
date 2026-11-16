<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { pillClass } from '../ui/styles';
	import { MessageCircleQuestion, Check } from '@lucide/svelte';
	import type { ApprovalCardAnswers, ApprovalQuestion } from '../types';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'title' | 'description' | 'questions' | 'submitLabel' | 'onSubmit' | 'onCancel'> {
		title: string;
		description?: string;
		questions: ApprovalQuestion[];
		submitLabel?: string;
		/** The answer is on its way: the options and the button wait. */
		pending?: boolean;
		/** The decision as you recorded it, shown in place of the questions. The card never marks itself decided. */
		decided?: ApprovalCardAnswers;
		onSubmit?: (answers: ApprovalCardAnswers) => void;
		onCancel?: () => void;
		class?: string;
	}

	let {
		title,
		description,
		questions,
		submitLabel = 'Submit decision',
		pending = false,
		decided,
		onSubmit,
		onCancel,
		class: className = '',
		...rest
	}: Props = $props();

	let currentStep = $state(0);
	let answers = $state<ApprovalCardAnswers>({});
	let customText = $state<Record<string, string>>({});
	let ready = $state(false);

	$effect(() => {
		ready = true;
	});

	let activeQuestion = $derived(questions[currentStep]);
	let currentSelected = $derived(
		activeQuestion ? (answers[activeQuestion.id] ?? []) : []
	);
	let currentCustom = $derived(
		activeQuestion ? (customText[activeQuestion.id] ?? '').trim() : ''
	);
	let canAdvance = $derived(
		!activeQuestion ||
			activeQuestion.required === false ||
			currentSelected.length > 0 ||
			currentCustom.length > 0
	);

	/**
	 * Toggles an option for the active question (radio single-select or checkbox multi-select).
	 *
	 * @param optionLabel - Option label to toggle.
	 */
	function selectOption(optionLabel: string): void {
		if (!activeQuestion || pending) return;
		const qId = activeQuestion.id;
		if (activeQuestion.multiple) {
			const existing = answers[qId] ?? [];
			const next = existing.includes(optionLabel)
				? existing.filter((item) => item !== optionLabel)
				: [...existing, optionLabel];
			answers = { ...answers, [qId]: next };
		} else {
			answers = { ...answers, [qId]: [optionLabel] };
		}
	}

	/**
	 * Advances to the next question or finalizes the multi-step approval decision.
	 */
	function handleNextOrSubmit(): void {
		if (!activeQuestion || !canAdvance || pending) return;
		const qId = activeQuestion.id;
		const merged = [...(answers[qId] ?? [])];
		if (currentCustom && !merged.includes(currentCustom)) {
			merged.push(currentCustom);
		}
		const updatedAnswers = { ...answers, [qId]: merged };
		answers = updatedAnswers;

		if (currentStep < questions.length - 1) {
			currentStep += 1;
		} else {
			onSubmit?.(updatedAnswers);
		}
	}
</script>

<div {...rest}
	role="region"
	aria-label={title}
	class={cn('w-full overflow-hidden rounded-[20px] border border-chat-border bg-card-bg ak-shadow-soft p-5 text-sm', className)}
>
	<div class="flex items-start justify-between gap-2">
		<div>
			<div class="flex items-center gap-2">
				<span
					class="inline-flex items-center gap-1.5 rounded-full bg-chat-accent-subtle px-2.5 py-0.5 text-[11px] font-medium text-chat-accent"
				>
					<MessageCircleQuestion aria-hidden="true" class="size-3" />
					Decision needed
				</span>
				{#if questions.length > 1 && !decided}
					<span class="text-xs tabular-nums text-fg-light">
						Step {currentStep + 1} of {questions.length}
					</span>
				{/if}
			</div>
			<h4 class="mt-2.5 text-base font-semibold tracking-[-0.01em] text-fg-main">{title}</h4>
			{#if description}
				<p class="mt-1 text-[13px] leading-5 text-fg-light">{description}</p>
			{/if}
		</div>
	</div>

	{#if decided}
		<div
			role="status"
			aria-live="polite"
			class="mt-3 flex items-center gap-2 rounded-2xl bg-status-success-subtle px-3.5 py-2.5 text-[13px] text-status-success"
		>
			<Check aria-hidden="true" class="size-4 shrink-0" />
			<p class="font-medium">
				Decision recorded: {Object.values(decided)
					.flat()
					.join(' · ')}
			</p>
		</div>
	{:else if activeQuestion}
		<div class="mt-4 space-y-3">
			<p class="text-[13px] text-fg-light">{activeQuestion.question}</p>

			<div
				role={activeQuestion.multiple ? 'group' : 'radiogroup'}
				aria-label={activeQuestion.question}
				class="grid gap-2"
			>
				{#each activeQuestion.options as option, idx (option.id)}
					{@const isSelected = currentSelected.includes(option.label)}
					<button
						type="button"
						role={activeQuestion.multiple ? 'checkbox' : 'radio'}
						aria-checked={isSelected}
						disabled={!ready || pending}
						onclick={() => selectOption(option.label)}
						class="flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left text-[13px] transition-[background-color,border-color,box-shadow] duration-200 {isSelected
							? 'border-chat-accent/50 bg-chat-accent-subtle/50 text-fg-main ak-shadow-soft-sm'
							: 'border-chat-border bg-card-bg text-fg-main hover:border-fg-light/30 hover:bg-chat-surface'}"
					>
						<span
							aria-hidden="true"
							class="mt-px inline-flex size-[18px] shrink-0 items-center justify-center border text-[10px] tabular-nums transition-colors duration-200 {activeQuestion.multiple
								? 'rounded-[6px]'
								: 'rounded-full'} {isSelected
								? 'border-chat-accent bg-chat-accent text-white'
								: 'border-chat-border bg-card-bg text-fg-light'}"
						>
							{#if isSelected}
								<Check class="size-3" strokeWidth={3} />
							{:else}
								{idx + 1}
							{/if}
						</span>
						<span class="min-w-0 flex-1">
							<span class="block font-medium text-fg-main">{option.label}</span>
							{#if option.description}
								<span class="mt-0.5 block leading-relaxed text-fg-light">{option.description}</span>
							{/if}
						</span>
					</button>
				{/each}
			</div>

			{#if activeQuestion.allowCustom}
				<div class="pt-0.5">
					<label class="block text-xs text-fg-light">
						<span class="sr-only">Custom response</span>
						<input
							type="text"
							placeholder={activeQuestion.customPlaceholder ?? 'Or type custom guidance…'}
							value={customText[activeQuestion.id] ?? ''}
							oninput={(e) => {
								const target = e.currentTarget as HTMLInputElement;
								customText = { ...customText, [activeQuestion.id]: target.value };
							}}
							class="h-10 w-full rounded-2xl border border-chat-border bg-card-bg px-3.5 text-[13px] text-fg-main placeholder:text-fg-light transition-colors focus:border-fg-light/50 focus:outline-none"
						/>
					</label>
				</div>
			{/if}

			<div class="flex items-center justify-between gap-2 pt-2">
				<div class="flex items-center gap-1.5">
					{#if currentStep > 0}
						<button
							type="button"
							onclick={() => (currentStep -= 1)}
							class={pillClass('secondary', 'md')}
						>
							Back
						</button>
					{/if}
					{#if onCancel}
						<button
							type="button"
							onclick={onCancel}
							class={pillClass('ghost', 'md')}
						>
							Skip
						</button>
					{/if}
				</div>

				<button
					type="button"
					disabled={!canAdvance || pending}
					aria-busy={pending}
					onclick={handleNextOrSubmit}
					class={pillClass('primary', 'md')}
				>
					{currentStep < questions.length - 1 ? 'Next question' : submitLabel}
				</button>
			</div>
		</div>
	{/if}
</div>
