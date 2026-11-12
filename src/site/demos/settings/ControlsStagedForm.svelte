<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Button } from '$lib/primitives/actions';
	import { DANGER_TEXT } from '$lib/primitives/form/classes';
	import { RECIPES, SettingsDraft, setSettingsDraft, type SettingsResult, type SettingsValues } from '$lib/settings/shared';

	/**
	 * Demo-only stand-in for SettingsForm and SaveBar (another group builds those): a real
	 * `<form method="post">` with a SettingsDraft in context, so the controls inside run staged.
	 */
	interface Props {
		title: string;
		description?: string;
		/** Where the form posts without JavaScript. */
		action: string;
		/** The fake server: resolves after a moment. */
		save: (values: SettingsValues) => Promise<void | SettingsResult>;
		testid?: string;
		children: Snippet;
	}

	let { title, description, action, save, testid, children }: Props = $props();

	const uid = $props.id();
	let saves = $state(0);
	const draft = new SettingsDraft({
		fields: () => undefined,
		changes: () => undefined,
		revision: () => saves,
		submit: () => async (values) => {
			const result = await save(values);
			if (!result) saves++;
			return result;
		},
		result: () => undefined,
		pending: () => undefined,
		onDirtyChange: () => undefined,
		genericError: () => "Couldn't save. Your changes are still here."
	});
	setSettingsDraft(draft);
</script>

<form method="post" {action} class={RECIPES.section} aria-labelledby="{uid}-title" data-testid={testid} {@attach draft.attach} onsubmit={draft.onsubmit}>
	<div class={RECIPES.sectionHeader}>
		<div class="min-w-0 flex-1">
			<h3 id="{uid}-title" class="m-0 text-sm font-semibold text-fg-main">{title}</h3>
			{#if description}<p class="m-0 mt-0.5 text-xs leading-5 text-fg-light">{description}</p>{/if}
		</div>
	</div>
	{#if draft.error}<p role="alert" data-form-error tabindex="-1" class="m-0 border-b border-canvas-border px-4 py-2 text-xs font-medium {DANGER_TEXT}">{draft.error}</p>{/if}
	<div class="flex flex-col gap-5 px-4 py-4">{@render children()}</div>
	<div class={RECIPES.sectionFooter}>
		<p role="status" class="m-0 min-w-0 flex-1" data-testid={testid ? `${testid}-status` : undefined}>
			{#if draft.status === 'pending'}Saving…{:else if draft.dirtyCount > 0}{draft.changes.map((c) => `${c.label}: ${c.from || '—'} → ${c.to || '—'}`).join('; ')}{:else if draft.status === 'saved'}Saved{:else}No unsaved changes{/if}
		</p>
		<Button type="reset" size="sm" variant="ghost" softDisabled={draft.dirtyCount === 0}>Discard</Button>
		<Button type="submit" size="sm" variant="accent" loading={draft.pending}>Save</Button>
	</div>
</form>
