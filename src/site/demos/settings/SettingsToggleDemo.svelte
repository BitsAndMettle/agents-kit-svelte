<!--
	SettingsToggle in its three change models. With `staged`, this demo renders only the staged form:
	a SettingsDraft context covers a whole component, so the staged part is this same file, nested.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { Moon, Sparkles } from '@lucide/svelte';
	import { Button } from '$lib/primitives/actions';
	import { SettingsSection, SettingsToggle } from '$lib/settings/rows';
	import { SettingsDraft, setSettingsDraft, type SettingsResult } from '$lib/settings/shared';
	import Self from './SettingsToggleDemo.svelte';

	interface Props {
		/** Render only the staged form (this demo nests itself for it). */
		staged?: boolean;
	}

	let { staged = false }: Props = $props();

	/** A fake server: answers after 600 ms. */
	const wait = () => new Promise((resolve) => setTimeout(resolve, 600));

	let compact = $state(false);
	let motion = $state(true);
	let failingCalls = $state(0);

	async function saveCompact(): Promise<void | SettingsResult> {
		await wait();
	}

	/** Every other call fails, so both outcomes are easy to see (the first one fails). */
	async function saveFlaky(next: boolean): Promise<void | SettingsResult> {
		await wait();
		failingCalls += 1;
		if (failingCalls % 2 === 1) return { error: `Couldn't turn ${next ? 'on' : 'off'} sounds. Changed back.` };
	}

	async function rejectAlways(): Promise<void> {
		await wait();
		throw new Error('network down');
	}

	let stagedSaves = $state(0);
	const draft = untrack(() => staged)
		? new SettingsDraft({
				fields: () => undefined,
				changes: () => undefined,
				revision: () => 3,
				submit: () => async () => {
					await wait();
					stagedSaves += 1;
				},
				result: () => undefined,
				pending: () => undefined,
				onDirtyChange: () => undefined,
				genericError: () => "Couldn't save."
			})
		: undefined;
	if (draft) setSettingsDraft(draft);
</script>

{#if draft}
	<form method="post" action="/settings-demo/sharing" data-testid="toggle-staged-form" {@attach draft.attach} onsubmit={draft.onsubmit}>
		<SettingsSection title="Sharing policy" description="Staged: these apply to everyone, so they wait for Save.">
			<SettingsToggle name="externalInvites" label="Invite people outside the team" description="Members can invite guests by email." defaultChecked={false} />
			<SettingsToggle name="publicLinks" label="Public links" description="Anyone with a link can view." defaultChecked stateText />
			<SettingsToggle name="downloads" label="Allow downloads" lock={{ kind: 'managed', source: 'Set by Northwind IT', badge: 'Always on' }} defaultChecked />
			{#snippet footer()}
				<span class="mr-auto" data-testid="toggle-staged-status">{draft.dirtyCount ? `${draft.dirtyCount} unsaved` : draft.status === 'saved' ? 'Saved' : 'No changes'}</span>
				<Button type="reset" size="sm" variant="ghost">Discard</Button>
				<Button type="submit" size="sm" variant="primary" loading={draft.status === 'pending'}>Save</Button>
			{/snippet}
		</SettingsSection>
		<p class="mt-2 text-xs text-fg-light">Saved <span data-testid="toggle-staged-saves">{stagedSaves}</span> times.</p>
	</form>
{:else}
	<div class="flex max-w-3xl flex-col gap-6">
		<SettingsSection data-testid="toggle-instant" title="Appearance" description="Instant: each switch applies at once, with Undo.">
			<SettingsToggle label="Compact lists" description="Tighter rows, more on screen." bind:checked={compact} onCommit={saveCompact} stateText>
				{#snippet leading()}<span class="inline-flex size-8 items-center justify-center rounded-control bg-canvas-secondary text-fg-main"><Sparkles class="size-4" aria-hidden="true" /></span>{/snippet}
			</SettingsToggle>
			<SettingsToggle label="Play sounds" description="A short chime when something finishes." defaultChecked={false} onCommit={saveFlaky} />
			<SettingsToggle label="Sync across devices" description="Keep these choices on every device you use." checked={true} onCommit={rejectAlways} undoable={false} />
			<SettingsToggle
				label="Dark sidebar"
				description="Applies on the next page load."
				checked={false}
				onCommit={saveCompact}
				lock={{ kind: 'plan', reason: 'Custom sidebars are on the Business plan.', action: { label: 'Compare plans', href: '?page=plans' } }}
			>
				{#snippet leading()}<span class="inline-flex size-8 items-center justify-center rounded-control bg-canvas-secondary text-fg-main"><Moon class="size-4" aria-hidden="true" /></span>{/snippet}
			</SettingsToggle>
		</SettingsSection>
		<p class="-mt-4 text-xs text-fg-light">Saved value of “Compact lists”: <span data-testid="toggle-compact-bound">{compact ? 'on' : 'off'}</span>.</p>

		<SettingsSection data-testid="toggle-nojs" title="Accessibility" description="Works without JavaScript: Apply posts the form.">
			<SettingsToggle
				name="reduceMotion"
				label="Reduce motion"
				description="Fewer animations and no parallax."
				action="/settings-demo/motion"
				hidden={{ scope: 'personal' }}
				bind:checked={motion}
				onCommit={saveCompact}
			/>
			<SettingsToggle name="captions" label="Always show captions" action="/settings-demo/captions" defaultChecked={false} />
		</SettingsSection>

		<Self staged />
	</div>
{/if}
