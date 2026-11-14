<!--
	@component
	The end of a stale save: for each setting someone else changed, it shows your value against the
	latest one and asks which to keep (Yours, Latest, or Both where a merge makes sense; when Both
	is not offered, it says why). Native radios named `keep.<field>`, so it posts without
	JavaScript; place it inside a SettingsForm or your own dialog form. Its radios are never a
	SettingsForm change (their saved state follows the choice), so they add no unsaved change and
	no development warning. A table in a wide container, one stacked group per setting in a
	narrow one. Your app merges.
-->
<script lang="ts" module>
	import type { ConflictKeep } from './helpers';

	/** Every word ConflictResolver shows. */
	export interface ConflictResolverLabels {
		legend: string;
		/** Help under the legend. */
		description: string;
		/** "Ben Ortiz saved changes 5 min ago." */
		changedBy: (name: string, when: string) => string;
		setting: string;
		mine: string;
		theirs: string;
		both: string;
		keep: string;
		/** Why Both is not offered, when the field gives no reason of its own. */
		bothUnavailable: string;
		/** Names the preview of the merged result. */
		preview: string;
	}

	export type { ConflictKeep };
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import type { HTMLFieldsetAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { formatElapsed, type TimeInput } from '../../core/time';
	import type { ConflictField } from '../shared/types';
	import { conflictChoices } from './helpers';

	export interface Props extends Omit<HTMLFieldsetAttributes, 'class' | 'children'> {
		/** The settings in conflict (a `SettingsConflict.fields`). */
		fields: ConflictField[];
		/** The choice per field name. Bindable. */
		value?: Record<string, ConflictKeep>;
		/** Starting choices; any field left out starts on `theirs` (the latest saved value). */
		defaultValue?: Record<string, ConflictKeep>;
		/** Prefix of the posted names: each field posts `<name>.<field>`. Default `keep`. */
		name?: string;
		/** Who saved the latest version, and when. */
		changedBy?: { name: string; at: TimeInput };
		/** The time `changedBy.at` is measured against. Default: now. */
		now?: TimeInput;
		/** Turns `changedBy.at` into words. Default: "12 min ago". */
		formatTime?: (at: TimeInput, now: number) => string;
		/** Called with every choice after one changes. */
		onValueChange?: (value: Record<string, ConflictKeep>) => void;
		/** Shows the merged result for the current choices. */
		preview?: Snippet<[Record<string, ConflictKeep>]>;
		labels?: Partial<ConflictResolverLabels>;
		class?: string;
	}

	let {
		fields,
		defaultValue,
		value = $bindable(conflictChoices(fields, undefined, defaultValue)),
		name = 'keep',
		changedBy,
		now,
		formatTime,
		onValueChange,
		preview,
		labels,
		class: className = '',
		...rest
	}: Props = $props();

	const text = $derived<ConflictResolverLabels>({
		legend: 'Choose what to keep',
		description: 'These settings were changed by someone else while you were editing. For each one, keep your version or the latest one.',
		changedBy: (who, when) => `${who} saved changes ${when}.`,
		setting: 'Setting',
		mine: 'Yours',
		theirs: 'Latest',
		both: 'Both',
		keep: 'Keep',
		bothUnavailable: 'Only one of them can apply.',
		preview: 'Result',
		...labels
	});

	const id = $props.id();
	const choices = $derived(conflictChoices(fields, value, defaultValue));
	const when = $derived.by(() => {
		if (!changedBy) return '';
		const reference = now === undefined ? Date.now() : new Date(now).getTime();
		return formatTime ? formatTime(changedBy.at, reference) : `${formatElapsed(changedBy.at, reference)} ago`;
	});

	function choose(field: string, keep: ConflictKeep): void {
		value = { ...choices, [field]: keep };
		onValueChange?.(value);
	}

	/**
	 * A choice's saved state follows it at once: captured before a surrounding SettingsForm sees
	 * the edit, so a choice is never an unsaved change (nor a development warning), and a form
	 * reset leaves the choices as they are.
	 */
	const followChoice: Attachment<HTMLFieldSetElement> = (node) => {
		const sync = (event: Event) => {
			const input = event.target;
			if (!(input instanceof HTMLInputElement) || input.type !== 'radio' || !input.checked) return;
			input
				.closest('[role="radiogroup"]')
				?.querySelectorAll<HTMLInputElement>('input[type="radio"]')
				.forEach((radio) => (radio.defaultChecked = radio === input));
		};
		node.addEventListener('input', sync, true);
		node.addEventListener('change', sync, true);
		return () => {
			node.removeEventListener('input', sync, true);
			node.removeEventListener('change', sync, true);
		};
	};

	const fieldId = (index: number, part: string) => `${id}-${index}-${part}`;

	const SIDE_CELL =
		'min-w-0 px-3 py-2.5 align-top break-words transition-colors @max-lg/settings:flex @max-lg/settings:gap-2 @max-lg/settings:px-0 @max-lg/settings:py-0.5';
	const MINI_LABEL = 'w-14 shrink-0 text-xs font-medium text-fg-light @lg/settings:hidden';
	const SEGMENT =
		'relative inline-flex h-7 cursor-pointer items-center rounded-full px-3 text-xs font-medium text-fg-light transition-colors hover:text-fg-main has-[:checked]:bg-card-bg has-[:checked]:text-fg-main has-[:checked]:shadow-btn has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-accent-primary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:disabled]:hover:text-fg-light';
</script>

<fieldset {...rest} {@attach followChoice} aria-describedby={[`${id}-description`, rest['aria-describedby']].filter(Boolean).join(' ')} class={cn('m-0 min-w-0 border-0 p-0', className)}>
	<legend class="m-0 p-0 text-sm font-semibold text-fg-main">{text.legend}</legend>
	<p id={`${id}-description`} class="m-0 mt-1 text-xs leading-5 text-fg-light">
		{text.description}
		{#if changedBy}{' '}{text.changedBy(changedBy.name, when)}{/if}
	</p>

	<div class="mt-3 overflow-hidden rounded-card border border-card-border">
		<table class="w-full border-collapse text-left text-[13px] leading-5 @max-lg/settings:block">
			<thead class="bg-canvas-secondary text-xs text-fg-light @max-lg/settings:sr-only">
				<tr>
					<th scope="col" class="px-3 py-2 font-medium">{text.setting}</th>
					<th scope="col" class="px-3 py-2 font-medium">{text.mine}</th>
					<th scope="col" class="px-3 py-2 font-medium">{text.theirs}</th>
					<th scope="col" class="px-3 py-2 font-medium">{text.keep}</th>
				</tr>
			</thead>
			<tbody class="@max-lg/settings:block">
				{#each fields as field, index (field.name)}
					{@const choice = choices[field.name]}
					{@const noBoth = !field.allowBoth}
					<tr data-keep={choice} class="group/row border-t border-canvas-border first:border-t-0 @max-lg/settings:grid @max-lg/settings:gap-1.5 @max-lg/settings:px-3 @max-lg/settings:py-3">
						<th scope="row" id={fieldId(index, 'label')} class="px-3 py-2.5 align-top font-medium text-fg-main @max-lg/settings:p-0">{field.label}</th>
						<td id={fieldId(index, 'mine')} class={cn(SIDE_CELL, 'group-has-[input[value=mine]:checked]/row:bg-accent-subtle/70 group-has-[input[value=both]:checked]/row:bg-accent-subtle/70')}>
							<span aria-hidden="true" class={MINI_LABEL}>{text.mine}</span>
							<span class="min-w-0 text-fg-main">{field.mine}</span>
						</td>
						<td id={fieldId(index, 'theirs')} class={cn(SIDE_CELL, 'group-has-[input[value=theirs]:checked]/row:bg-accent-subtle/70 group-has-[input[value=both]:checked]/row:bg-accent-subtle/70')}>
							<span aria-hidden="true" class={MINI_LABEL}>{text.theirs}</span>
							<span class="min-w-0 text-fg-main">{field.theirs}</span>
						</td>
						<td class="w-px px-3 py-2 align-top @max-lg/settings:w-auto @max-lg/settings:p-0 @max-lg/settings:pt-1">
							<div role="radiogroup" aria-labelledby={fieldId(index, 'label')} aria-describedby={noBoth ? fieldId(index, 'reason') : undefined} class="inline-flex items-center gap-0.5 whitespace-nowrap rounded-full bg-canvas-secondary p-0.5">
								{#each ['mine', 'theirs', 'both'] as const as side (side)}
									<label class={SEGMENT}>
										<input
											type="radio"
											name={`${name}.${field.name}`}
											value={side}
											checked={choice === side}
											defaultChecked={choice === side}
											disabled={side === 'both' && noBoth}
											aria-describedby={side === 'both' ? (noBoth ? fieldId(index, 'reason') : undefined) : fieldId(index, side)}
											onchange={() => choose(field.name, side)}
											class="absolute inset-0 m-0 cursor-[inherit] appearance-none rounded-full opacity-0"
										/>
										{side === 'mine' ? text.mine : side === 'theirs' ? text.theirs : text.both}
									</label>
								{/each}
							</div>
							{#if noBoth}
								<p id={fieldId(index, 'reason')} class="m-0 mt-1 max-w-56 text-xs leading-4 text-fg-light">{field.bothReason ?? text.bothUnavailable}</p>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if preview}
		<div class="mt-3 rounded-card border border-dashed border-card-border bg-canvas-secondary/50 px-3 py-2.5">
			<p class="m-0 mb-1 text-xs font-semibold text-fg-light">{text.preview}</p>
			{@render preview(choices)}
		</div>
	{/if}
</fieldset>
