<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Check, FileText } from '@lucide/svelte';
	import { buttonClass } from '../ui/styles';
	import GitHubIssueCard from '../github/GitHubIssueCard.svelte';
	import GitHubPullRequestCard from '../github/GitHubPullRequestCard.svelte';
	import ResultActions from './ResultActions.svelte';
	import type { GeneratedSurfaceContent, ResultActionState } from '../types';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'content' | 'showResultActions' | 'onAction'> {
		content: GeneratedSurfaceContent;
		showResultActions?: boolean;
		onAction?: (action: string, id?: string) => void;
		class?: string;
	}

	let {
		content,
		showResultActions = true,
		onAction,
		class: className = '',
		...rest
	}: Props = $props();

	// Follows the content prop; local edits override it until the prop changes.
	let currentContent = $derived<GeneratedSurfaceContent>(content);
	let mode = $state<ResultActionState>('view');
	let saved = $state(false);
	let editPrimary = $state('');
	let editSecondary = $state('');
	let statusNotice = $state('');

	/**
	 * Extracts primary and secondary editable text fields from a generated surface item.
	 *
	 * @param item - Generated surface content object.
	 * @returns Primary and secondary text strings.
	 */
	function extractEditableFields(item: GeneratedSurfaceContent): {
		primary: string;
		secondary: string;
	} {
		switch (item.type) {
			case 'comparison':
				return { primary: item.title, secondary: item.description ?? '' };
			case 'recommendation':
				return { primary: item.title, secondary: item.summary };
			case 'document':
				return { primary: item.title, secondary: item.excerpt };
			case 'checklist':
				return { primary: item.title, secondary: item.description ?? '' };
			case 'source-brief':
				return { primary: item.title, secondary: item.summary };
			case 'audio':
				return { primary: item.title, secondary: item.creator };
			case 'focus':
				return { primary: item.title, secondary: `${Math.round(item.remaining / 60)} min remaining` };
			case 'flight':
				return { primary: `${item.origin} → ${item.destination}`, secondary: item.status };
			case 'weather':
				return { primary: item.location, secondary: `${item.temperature}°${item.unit} · ${item.condition}` };
			case 'inbox':
				return { primary: item.title, secondary: item.items[0]?.text ?? '' };
			case 'event':
				return { primary: item.title, secondary: `${item.date} ${item.time} · ${item.location}` };
			case 'activity':
				return { primary: item.title, secondary: item.description };
			case 'github-issue':
				return { primary: item.issue.title, secondary: item.issue.summary ?? '' };
			case 'github-pr':
				return { primary: item.pr.title ?? `PR #${item.pr.number}`, secondary: item.pr.refereeSummary ?? '' };
		}
	}

	/**
	 * Serializes a generated content item into readable plain text for clipboard/comparison.
	 *
	 * @param item - Generated surface content object.
	 * @returns Human-readable summary string.
	 */
	function serializeHumanText(item: GeneratedSurfaceContent): string {
		const f = extractEditableFields(item);
		return `${f.primary}\n${f.secondary}`;
	}

	/**
	 * Applies edited primary and secondary fields to the active generated content item.
	 */
	function applyEdit(): void {
		switch (currentContent.type) {
			case 'comparison':
				currentContent = { ...currentContent, title: editPrimary, description: editSecondary };
				break;
			case 'recommendation':
				currentContent = { ...currentContent, title: editPrimary, summary: editSecondary };
				break;
			case 'document':
				currentContent = { ...currentContent, title: editPrimary, excerpt: editSecondary };
				break;
			case 'checklist':
				currentContent = { ...currentContent, title: editPrimary, description: editSecondary };
				break;
			case 'source-brief':
				currentContent = { ...currentContent, title: editPrimary, summary: editSecondary };
				break;
			case 'activity':
				currentContent = { ...currentContent, title: editPrimary, description: editSecondary };
				break;
			default:
				break;
		}
		mode = 'expanded';
		statusNotice = 'Changes applied to Intelligent UI surface.';
	}

	/**
	 * Toggles a checklist item inside a `checklist` surface.
	 *
	 * @param itemId - Identifier of the checklist item.
	 */
	function toggleChecklistItem(itemId: string): void {
		if (currentContent.type !== 'checklist') return;
		currentContent = {
			...currentContent,
			items: currentContent.items.map((entry) =>
				entry.id === itemId ? { ...entry, completed: !entry.completed } : entry
			)
		};
		onAction?.('toggle', itemId);
	}
</script>

<div {...rest} class={cn('w-full space-y-2.5', className)}>
	<div
		class="overflow-hidden rounded-window border border-card-border bg-card-bg p-4 text-sm shadow-xs transition-all {mode !==
		'view'
			? 'ring-1 ring-accent-primary'
			: ''}"
	>
		{#if currentContent.type === 'comparison'}
			<div class="space-y-3">
				<div>
					<span class="text-[11px] font-medium capitalize text-accent-primary">
						Intelligent UI · Architecture Comparison
					</span>
					<h3 class="mt-1 font-semibold text-fg-main">{currentContent.title}</h3>
					{#if currentContent.description}
						<p class="mt-0.5 text-xs text-fg-light">{currentContent.description}</p>
					{/if}
				</div>

				<div class="grid gap-3 sm:grid-cols-2">
					{#each currentContent.options as option (option.id)}
						{@const isSelected = currentContent.selectedId === option.id}
						<button
							type="button"
							aria-pressed={isSelected}
							onclick={() => {
								if (currentContent.type === 'comparison') {
									currentContent = { ...currentContent, selectedId: option.id };
									onAction?.('select', option.id);
								}
							}}
							class="flex flex-col justify-between rounded-xl border p-3 text-left transition-colors {isSelected
								? 'border-accent-primary bg-accent-subtle'
								: 'border-card-border bg-canvas-primary hover:bg-canvas-secondary'}"
						>
							<div>
								<div class="flex items-center justify-between gap-2">
									<span class="font-semibold text-fg-main">{option.title}</span>
									{#if option.recommended}
										<span
											class="rounded-full bg-status-success-subtle px-2 py-0.5 font-mono text-[10px] font-semibold text-status-success"
										>
											Recommended
										</span>
									{/if}
								</div>
								<p class="mt-1 text-xs text-fg-light">{option.description}</p>
							</div>

							<dl class="mt-3 space-y-1 border-t border-canvas-border pt-2 text-xs">
								{#each option.attributes as attr (attr.label)}
									<div class="flex justify-between gap-2">
										<dt class="text-fg-light">{attr.label}</dt>
										<dd class="font-mono font-medium text-fg-main">{attr.value}</dd>
									</div>
								{/each}
							</dl>
						</button>
					{/each}
				</div>
			</div>
		{:else if currentContent.type === 'recommendation'}
			<div class="space-y-3">
				<div class="flex items-center justify-between gap-2">
					<span class="text-[11px] font-medium capitalize text-accent-primary">
						Agent Recommendation
					</span>
					<span class="rounded-full bg-status-success-subtle px-2 py-0.5 font-mono text-xs font-semibold text-status-success">
						{currentContent.confidence}% confidence
					</span>
				</div>
				<h3 class="font-semibold text-fg-main">{currentContent.title}</h3>
				<p class="text-xs leading-relaxed text-fg-light">{currentContent.summary}</p>
				{#if currentContent.reasoning && currentContent.reasoning.length > 0}
					<ul class="space-y-1.5 rounded-control bg-canvas-secondary/70 p-3 text-xs text-fg-main">
						{#each currentContent.reasoning as reason (reason)}
							<li class="flex items-start gap-2">
								<span aria-hidden="true" class="mt-1.5 size-1 shrink-0 rounded-full bg-fg-light"></span>
								<span>{reason}</span>
							</li>
						{/each}
					</ul>
				{/if}
				<div class="flex flex-wrap items-center gap-2 pt-1">
					<button
						type="button"
						onclick={() => {
							statusNotice = `Accepted: ${currentContent.type === 'recommendation' ? currentContent.title : ''}`;
							onAction?.('accept');
						}}
						class="rounded-lg bg-fg-main px-3 py-1.5 text-xs font-semibold text-fg-inverse hover:opacity-90"
					>
						{currentContent.acceptLabel}
					</button>
					{#each currentContent.alternatives ?? [] as alt (alt.id)}
						<button
							type="button"
							onclick={() => {
								statusNotice = `Selected alternative: ${alt.label}`;
								onAction?.('alternative', alt.id);
							}}
							class="rounded-lg border border-card-border bg-canvas-secondary px-2.5 py-1.5 text-xs font-medium text-fg-main hover:bg-canvas-primary"
						>
							{alt.label}
						</button>
					{/each}
				</div>
			</div>
		{:else if currentContent.type === 'document'}
			<div class="space-y-2.5">
				<div class="flex items-center justify-between text-xs text-fg-light">
					<span class="inline-flex items-center gap-1.5 font-medium text-fg-main"><FileText aria-hidden="true" class="size-3.5 text-fg-light" />{currentContent.format}</span>
					<span>{currentContent.size} · {currentContent.updated}</span>
				</div>
				<h3 class="font-semibold text-fg-main">{currentContent.title}</h3>
				<p class="rounded-control border border-card-border p-3 text-sm leading-6 text-fg-main">
					{currentContent.excerpt}
				</p>
			</div>
		{:else if currentContent.type === 'checklist'}
			<div class="space-y-2.5">
				<h3 class="font-semibold text-fg-main">{currentContent.title}</h3>
				{#if currentContent.description}
					<p class="text-xs text-fg-light">{currentContent.description}</p>
				{/if}
				<ul class="space-y-1.5">
					{#each currentContent.items as item (item.id)}
						<li>
							<button
								type="button"
								onclick={() => toggleChecklistItem(item.id)}
								class="flex w-full items-start gap-2.5 rounded-control px-2.5 py-2 text-left text-xs transition-colors hover:bg-canvas-secondary"
							>
								<span
									class="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] {item.completed
										? 'bg-fg-main text-fg-inverse'
										: 'border border-card-border bg-card-bg text-fg-light'}"
								>
									{#if item.completed}<Check class="size-3" strokeWidth={3} />{/if}
								</span>
								<span>
									<span class="block font-medium text-fg-main {item.completed ? 'line-through text-fg-light' : ''}">
										{item.label}
									</span>
									{#if item.detail}
										<span class="block text-fg-light">{item.detail}</span>
									{/if}
								</span>
							</button>
						</li>
					{/each}
				</ul>
			</div>
		{:else if currentContent.type === 'source-brief'}
			<div class="space-y-2.5">
				<span class="text-[11px] font-medium capitalize text-accent-primary">
					Grounded Source Brief
				</span>
				<h3 class="font-semibold text-fg-main">{currentContent.title}</h3>
				<p class="text-xs text-fg-light">{currentContent.summary}</p>
				<ol class="space-y-1.5 pt-1 text-xs">
					{#each currentContent.sources as src, idx (src.id)}
						<li class="flex items-center justify-between rounded-lg bg-canvas-secondary px-3 py-1.5">
							<span class="font-medium text-fg-main">{idx + 1}. {src.title}</span>
							{#if src.origin}
								<span class="font-mono text-[11px] text-fg-light">{src.origin}</span>
							{/if}
						</li>
					{/each}
				</ol>
			</div>
		{:else if currentContent.type === 'activity'}
			<div class="space-y-3">
				<div class="flex items-baseline justify-between">
					<div>
						<h3 class="font-semibold text-fg-main">{currentContent.title}</h3>
						<p class="text-xs text-fg-light">{currentContent.description}</p>
					</div>
					<div class="text-right font-mono">
						<span class="text-lg font-bold text-fg-main">{currentContent.value}</span>
						<span class="ml-1 text-xs text-fg-light">{currentContent.unit}</span>
					</div>
				</div>
				<div class="grid grid-cols-7 items-end gap-2 pt-2" style="height: 84px;">
					{#each currentContent.points as pt (pt.label)}
						{@const maxVal = Math.max(...currentContent.points.map((p) => p.value), 1)}
						{@const heightPct = Math.max(15, Math.round((pt.value / maxVal) * 100))}
						<div class="flex h-full flex-col items-center justify-end gap-1">
							<div
								class="w-full rounded-t bg-accent-primary transition-all"
								style="height: {heightPct}%;"
							></div>
							<span class="font-mono text-[10px] text-fg-light">{pt.label}</span>
						</div>
					{/each}
				</div>
			</div>
		{:else if currentContent.type === 'github-issue'}
			<GitHubIssueCard issue={currentContent.issue} />
		{:else if currentContent.type === 'github-pr'}
			<GitHubPullRequestCard pr={currentContent.pr} />
		{:else}
			{@const summary = extractEditableFields(currentContent)}
			<div class="space-y-1.5">
				<span class="text-[11px] font-medium capitalize text-accent-primary">
					{currentContent.type}
				</span>
				<h3 class="font-semibold text-fg-main">{summary.primary}</h3>
				<p class="text-xs text-fg-light">{summary.secondary}</p>
			</div>
		{/if}
	</div>

	{#if showResultActions}
		<div class="flex flex-wrap items-center justify-between gap-2">
			<ResultActions
				state={mode}
				{saved}
				onExpand={() => (mode = mode === 'expanded' ? 'view' : 'expanded')}
				onEdit={() => {
					const fields = extractEditableFields(currentContent);
					editPrimary = fields.primary;
					editSecondary = fields.secondary;
					mode = mode === 'editing' ? 'view' : 'editing';
				}}
				onCompare={() => (mode = mode === 'comparing' ? 'view' : 'comparing')}
				onSave={() => {
					saved = !saved;
					statusNotice = saved ? 'Surface saved to workspace.' : 'Removed from saved surfaces.';
				}}
				onCopy={() => {
					navigator.clipboard?.writeText(serializeHumanText(currentContent));
					statusNotice = 'Copied surface as readable text.';
				}}
			/>

			{#if statusNotice}
				<span role="status" class="font-mono text-xs text-fg-light">{statusNotice}</span>
			{/if}
		</div>
	{/if}

	{#if mode === 'editing'}
		<form
			onsubmit={(e) => {
				e.preventDefault();
				applyEdit();
			}}
			class="space-y-3 rounded-card border border-card-border bg-card-bg p-3.5 text-xs"
		>
			<label class="block text-fg-light">
				<span class="font-medium text-fg-main">Primary Title</span>
				<input
					type="text"
					bind:value={editPrimary}
					class="mt-1 w-full rounded-lg border border-card-border bg-canvas-primary px-3 py-1.5 text-fg-main"
				/>
			</label>
			<label class="block text-fg-light">
				<span class="font-medium text-fg-main">Summary / Description</span>
				<textarea
					rows={2}
					bind:value={editSecondary}
					class="mt-1 w-full rounded-lg border border-card-border bg-canvas-primary px-3 py-1.5 text-fg-main"
				></textarea>
			</label>
			<div class="flex justify-end gap-2">
				<button
					type="button"
					onclick={() => (mode = 'view')}
					class={buttonClass('secondary', 'sm')}
				>
					Cancel
				</button>
				<button
					type="submit"
					class={buttonClass('primary', 'sm')}
				>
					Apply changes
				</button>
			</div>
		</form>
	{/if}

	{#if mode === 'comparing'}
		<div class="grid gap-3 rounded-card border border-card-border bg-card-bg p-3.5 text-xs sm:grid-cols-2">
			<div>
				<span class="text-[11px] font-medium capitalize text-fg-light">Original</span>
				<pre class="mt-1.5 whitespace-pre-wrap font-sans text-fg-main">{serializeHumanText(content)}</pre>
			</div>
			<div class="border-t border-canvas-border pt-2 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
				<span class="text-[11px] font-medium capitalize text-accent-primary">Current</span>
				<pre class="mt-1.5 whitespace-pre-wrap font-sans text-fg-main">{serializeHumanText(currentContent)}</pre>
			</div>
		</div>
	{/if}
</div>
