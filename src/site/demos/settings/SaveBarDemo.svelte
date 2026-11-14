<script lang="ts">
	import { SaveBar, SettingsForm, type SaveBarLayout } from '$lib/settings/save';
	import { RECIPES, SETTINGS_CONTAINER, type SettingsResult } from '$lib/settings/shared';
	import { NativeSelect, Switch } from '$lib/primitives/form';
	import { cn } from '$lib/ui/cn';
	import { SEGMENT_GROUP_CLASS, segmentClass } from '$lib/ui/styles';

	const EVENTS = [
		{ name: 'mentions', label: 'Mentions', description: 'Someone mentions you or replies to you.', on: true },
		{ name: 'assigned', label: 'Assigned to you', description: 'A task or review is given to you.', on: true },
		{ name: 'comments', label: 'Comments on your work', description: 'New comments on documents you own.', on: false },
		{ name: 'invites', label: 'Invites accepted', description: 'Someone you invited joins the team.', on: false },
		{ name: 'digest', label: 'Weekly digest', description: 'A summary every Monday morning.', on: true },
		{ name: 'billing', label: 'Billing receipts', description: 'A copy of each invoice.', on: false }
	];
	const LAYOUTS: { value: SaveBarLayout; label: string }[] = [
		{ value: 'sticky', label: 'Sticky' },
		{ value: 'floating', label: 'Floating' },
		{ value: 'footer', label: 'Footer' }
	];
	const OUTCOMES = [
		{ value: 'ok', label: 'Saves' },
		{ value: 'error', label: 'Fails' },
		{ value: 'conflict', label: 'Conflicts' }
	];
	const fields = EVENTS.map((e) => ({ name: e.name, label: e.label }));
	/** A second section that saves on its own, in the same scrolling frame. */
	const PUSH = [
		{ name: 'pushDirect', label: 'Direct messages', description: 'A push notification for each new message to you.', on: true },
		{ name: 'pushQuiet', label: 'Quiet hours', description: 'No pushes between 22:00 and 07:00.', on: false }
	];
	const pushFields = PUSH.map((e) => ({ name: e.name, label: e.label }));

	let layout = $state<SaveBarLayout>('sticky');
	let outcome = $state('ok');
	let reviewed = $state(false);

	const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	/** Answers after 600 ms with whatever "Next save" says. */
	async function save(): Promise<SettingsResult | void> {
		await wait(600);
		if (outcome === 'error') return { error: 'The notification service did not answer. Nothing was saved.' };
		if (outcome === 'conflict') return { conflict: { message: 'Chloé Martin changed these notifications while you were editing. Your changes are kept.' } };
	}
</script>

<div class={cn(SETTINGS_CONTAINER, 'mx-auto grid w-full max-w-2xl gap-3')}>
	<div class="flex flex-wrap items-center justify-between gap-3 text-xs text-fg-light">
		<div role="group" aria-label="Bar layout" class={SEGMENT_GROUP_CLASS}>
			{#each LAYOUTS as option (option.value)}
				<button type="button" aria-pressed={layout === option.value} class={segmentClass(layout === option.value)} onclick={() => (layout = option.value)}>{option.label}</button>
			{/each}
		</div>
		<label class="inline-flex items-center gap-2">
			Next save
			<NativeSelect options={OUTCOMES} bind:value={outcome} size="sm" class="w-28" />
		</label>
	</div>

	<!-- The transform makes this frame the floating bar's containing block, so it floats over the frame, not the page. -->
	<div class="relative h-[23rem] overflow-hidden rounded-window border border-card-border bg-canvas-primary [transform:translateZ(0)]">
		<div class="h-full overflow-y-auto p-3 [--ak-settings-bar-offset:0.75rem]">
			<SettingsForm {fields} onSubmit={save} aria-label="Notification settings">
				<section aria-labelledby="sbd-heading" class={RECIPES.section}>
					<header class={RECIPES.sectionHeader}>
						<div class="min-w-0 flex-1">
							<h3 id="sbd-heading" class="m-0 text-sm font-semibold text-fg-main">Email me when</h3>
							<p class="m-0 text-xs leading-5 text-fg-light">Applies to every team you belong to.</p>
						</div>
					</header>
					<ul role="list" class={RECIPES.list}>
						{#each EVENTS as event (event.name)}
							<li class={RECIPES.row}>
								<Switch name={event.name} label={event.label} description={event.description} defaultChecked={event.on} labelFirst class="w-full" />
							</li>
						{/each}
					</ul>
					{#if layout === 'footer'}
						<SaveBar layout="footer" impact="You can change these again at any time." reviewHref="#conflict-resolver" onReviewConflict={() => (reviewed = true)} />
					{/if}
				</section>
				{#if layout !== 'footer'}
					<SaveBar {layout} impact="You can change these again at any time." reviewHref="#conflict-resolver" onReviewConflict={() => (reviewed = true)} />
				{/if}
				{#if layout === 'floating'}<div aria-hidden="true" class="h-24"></div>{/if}
			</SettingsForm>
			<!-- Its own form and bar: a sticky bar beside the sticky one above, else a footer (a floating bar has the frame's bottom). -->
			<SettingsForm fields={pushFields} onSubmit={save} aria-label="Push settings" class="mt-3">
				<section aria-labelledby="sbd-push-heading" class={RECIPES.section}>
					<header class={RECIPES.sectionHeader}>
						<div class="min-w-0 flex-1">
							<h3 id="sbd-push-heading" class="m-0 text-sm font-semibold text-fg-main">Push me when</h3>
							<p class="m-0 text-xs leading-5 text-fg-light">Only on this device. Saved on its own.</p>
						</div>
					</header>
					<ul role="list" class={RECIPES.list}>
						{#each PUSH as event (event.name)}
							<li class={RECIPES.row}>
								<Switch name={event.name} label={event.label} description={event.description} defaultChecked={event.on} labelFirst class="w-full" />
							</li>
						{/each}
					</ul>
					{#if layout !== 'sticky'}
						<SaveBar layout="footer" />
					{/if}
				</section>
				{#if layout === 'sticky'}
					<SaveBar layout="sticky" data-testid="sbd-push-bar" />
				{/if}
			</SettingsForm>
		</div>
	</div>
	<p class="m-0 min-h-5 text-xs text-fg-light" aria-live="polite">{reviewed ? 'Review opened: the ConflictResolver demo shows the next step.' : ''}</p>
</div>
