<script lang="ts">
	import { FileText } from '@lucide/svelte';
	import { ContextMenu, type MenuEntry } from '$lib/primitives/menus';

	const files = ['plan.md', 'session.log', 'diff.patch'];
	let target = $state(files[0]);
	let last = $state('nothing yet');

	const run = (what: string) => () => (last = `${what} ${target}`);

	const items: MenuEntry[] = $derived([
		{ value: 'open', label: `Open ${target}`, shortcut: '↵', onSelect: run('Open') },
		{ value: 'rename', label: 'Rename', shortcut: 'F2', onSelect: run('Rename') },
		{
			kind: 'submenu',
			value: 'move',
			label: 'Move to',
			items: [
				{ value: 'archive', label: 'Archive', onSelect: run('Archive') },
				{ value: 'shared', label: 'Shared', onSelect: run('Share') }
			]
		},
		{ kind: 'separator' },
		{ value: 'delete', label: 'Delete', tone: 'danger', onSelect: run('Delete') }
	]);
</script>

<div class="mx-auto flex max-w-xl flex-col gap-3">
	<ContextMenu
		{items}
		label="File actions"
		class="rounded-card border border-dashed border-card-border bg-canvas-primary p-3"
		data-testid="context-region"
	>
		<p class="mb-2 text-xs text-fg-light">Right-click a file, or focus one and press Shift+F10.</p>
		<ul class="grid gap-1">
			{#each files as file (file)}
				<li>
					<button
						type="button"
						onfocus={() => (target = file)}
						oncontextmenu={() => (target = file)}
						class="flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left text-[13px] text-fg-main hover:bg-canvas-secondary"
					>
						<FileText aria-hidden="true" class="size-4 text-fg-light" />
						{file}
					</button>
				</li>
			{/each}
		</ul>
	</ContextMenu>
	<p class="text-xs text-fg-light">Last action: <span class="text-fg-main" data-testid="context-last">{last}</span></p>
</div>
