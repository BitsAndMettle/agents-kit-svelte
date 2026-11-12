<script lang="ts">
	import { ConsequenceList } from '$lib/settings/save';
	import { RECIPES, SETTINGS_CONTAINER, type ConsequenceGroup, type ConsequenceItem } from '$lib/settings/shared';
	import { Badge } from '$lib/primitives/display';
	import { cn } from '$lib/ui/cn';

	const viewer: ConsequenceGroup[] = [
		{
			label: 'Viewers can',
			items: [
				{ tone: 'ok', label: 'Open documents shared with the team' },
				{ tone: 'ok', label: 'Leave comments and reactions' },
				{ tone: 'info', label: 'Download files', description: 'Only when the owner allows downloads.' }
			]
		},
		{
			label: 'Viewers can’t',
			items: [
				{ tone: 'no', label: 'Edit, move or delete documents' },
				{ tone: 'no', label: 'Invite people or change roles' },
				{ tone: 'no', label: 'See billing or usage' }
			]
		}
	];

	const sharing: ConsequenceGroup[] = [
		{
			label: 'Shared',
			items: [
				{ tone: 'ok', label: 'Which features you use, counted per day' },
				{ tone: 'ok', label: 'Crash reports, with file names removed' }
			]
		},
		{
			label: 'Never shared',
			items: [
				{ tone: 'no', label: 'Document contents and comments' },
				{ tone: 'no', label: 'Names, emails and other personal details' }
			]
		}
	];

	const archive: ConsequenceItem[] = [
		{ tone: 'warn', label: 'The project becomes read-only for everyone', description: 'Members keep access; nobody can edit until it is restored.' },
		{ tone: 'no', label: 'Scheduled reports stop', aside: '4 reports' },
		{ tone: 'ok', label: 'Files, history and comments are kept', aside: '1.2 GB' },
		{ tone: 'info', label: 'You can restore it from Archived projects at any time' }
	];
</script>

<div class={cn(SETTINGS_CONTAINER, 'mx-auto grid w-full max-w-3xl gap-4')}>
	<section aria-labelledby="cld-roles" class={RECIPES.section}>
		<header class={RECIPES.sectionHeader}>
			<div class="min-w-0 flex-1">
				<h3 id="cld-roles" class="m-0 text-sm font-semibold text-fg-main">Viewer role</h3>
				<p class="m-0 text-xs leading-5 text-fg-light">For guests and people who only need to read.</p>
			</div>
			<Badge tone="neutral">3 people</Badge>
		</header>
		<div class="px-4 py-3">
			<ConsequenceList groups={viewer} headingLevel={4} />
		</div>
	</section>

	<div class="grid gap-4 @3xl/settings:grid-cols-2">
		<section aria-labelledby="cld-sharing" class={RECIPES.section}>
			<header class={RECIPES.sectionHeader}>
				<div class="min-w-0 flex-1">
					<h3 id="cld-sharing" class="m-0 text-sm font-semibold text-fg-main">Usage data</h3>
					<p class="m-0 text-xs leading-5 text-fg-light">Helps us find what to fix first.</p>
				</div>
			</header>
			<div class="px-4 py-3">
				<ConsequenceList groups={sharing} columns={1} size="sm" headingLevel={4} />
			</div>
		</section>

		<section aria-labelledby="cld-archive" class={RECIPES.section}>
			<header class={RECIPES.sectionHeader}>
				<div class="min-w-0 flex-1">
					<h3 id="cld-archive" class="m-0 text-sm font-semibold text-fg-main">Archive this project</h3>
					<p class="m-0 text-xs leading-5 text-fg-light">Before you archive “Spring launch”.</p>
				</div>
			</header>
			<div class="px-4 py-3">
				<ConsequenceList items={archive} heading="What happens" headingLevel={4} size="sm" />
			</div>
		</section>
	</div>
</div>
