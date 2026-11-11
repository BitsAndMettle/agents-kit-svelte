<script lang="ts">
	import { Copy, Ellipsis, FilePlus, Pencil, Share2, Trash2 } from '@lucide/svelte';
	import { DropdownMenu, type MenuEntry } from '$lib/primitives/menus';
	import { buttonClass } from '$lib/ui/styles';

	let last = $state('nothing yet');
	let showHidden = $state(false);
	let wrap = $state(true);
	let sort = $state<string | null>('name');
	let open = $state(false);

	const run = (what: string) => () => (last = what);

	const items: MenuEntry[] = $derived([
		{ value: 'new', label: 'New file', icon: FilePlus, shortcut: '⌘N', onSelect: run('New file') },
		{ value: 'copy', label: 'Duplicate', icon: Copy, shortcut: '⌘D', onSelect: run('Duplicate') },
		{
			kind: 'submenu',
			value: 'share',
			label: 'Share',
			icon: Share2,
			items: [
				{ value: 'link', label: 'Copy link', onSelect: run('Copy link') },
				{ value: 'email', label: 'Email', onSelect: run('Email') },
				{ value: 'export', label: 'Export as PDF', disabled: true }
			]
		},
		{ value: 'rename', label: 'Rename', icon: Pencil, shortcut: 'F2', onSelect: run('Rename') },
		{ kind: 'separator' },
		{
			kind: 'group',
			label: 'View',
			items: [
				{ kind: 'checkbox', value: 'hidden', label: 'Show hidden files', checked: showHidden, onCheckedChange: (v) => (showHidden = v) },
				{ kind: 'checkbox', value: 'wrap', label: 'Word wrap', checked: wrap, onCheckedChange: (v) => (wrap = v) }
			]
		},
		{ kind: 'separator' },
		{
			kind: 'radio',
			name: 'sort',
			label: 'Sort by',
			value: sort,
			options: [
				{ value: 'name', label: 'Name' },
				{ value: 'date', label: 'Date modified' },
				{ value: 'size', label: 'Size' }
			],
			onValueChange: (v) => (sort = v)
		},
		{ kind: 'separator' },
		{ value: 'delete', label: 'Delete', icon: Trash2, tone: 'danger', shortcut: '⌘⌫', onSelect: run('Delete') }
	]);

	const rowActions: MenuEntry[] = [
		{ value: 'pin', label: 'Pin to top', onSelect: run('Pin to top') },
		{ value: 'archive', label: 'Archive', onSelect: run('Archive') },
		{ value: 'remove', label: 'Remove', tone: 'danger', onSelect: run('Remove') }
	];
</script>

<div class="mx-auto flex max-w-xl flex-col gap-4">
	<div class="flex flex-wrap items-center gap-3">
		<DropdownMenu triggerLabel="File" {items} bind:open />
		<div class="flex items-center gap-2 rounded-control border border-card-border px-3 py-1.5 text-[13px] text-fg-main">
			<span class="flex-1">release-notes.md</span>
			<DropdownMenu items={rowActions} placement="bottom-end" menuClass="min-w-40">
				{#snippet trigger(part)}
					<button {...part} aria-label="More actions for release-notes.md" class={buttonClass('ghost', 'icon-sm')}>
						<Ellipsis aria-hidden="true" />
					</button>
				{/snippet}
			</DropdownMenu>
		</div>
	</div>
	<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-fg-light">
		<dt>Last action</dt>
		<dd class="text-fg-main" data-testid="dropdown-last">{last}</dd>
		<dt>View</dt>
		<dd class="text-fg-main" data-testid="dropdown-view">hidden {showHidden ? 'shown' : 'off'}, wrap {wrap ? 'on' : 'off'}, sort by {sort}</dd>
		<dt>Menu</dt>
		<dd class="text-fg-main">{open ? 'open' : 'closed'}</dd>
	</dl>
</div>
