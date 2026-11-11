<script lang="ts">
	import { FilePlus, GitBranch, Moon, Play, Search, Settings, Square, Users } from '@lucide/svelte';
	import { CommandPalette, type PaletteCommand } from '$lib/primitives/menus';
	import { KBD } from '$lib/primitives/menus/classes';
	import { pillClass } from '$lib/ui/styles';

	let open = $state(false);
	let ran = $state('nothing yet');
	let recent = $state<string[]>(['run-start']);

	const commands: PaletteCommand[] = [
		{ id: 'run-start', label: 'Start a run', description: 'Pick a card and start the agent', icon: Play, group: 'Runs', shortcut: 'R' },
		{ id: 'run-stop', label: 'Stop the current run', icon: Square, group: 'Runs', keywords: ['cancel', 'halt'] },
		{ id: 'card-new', label: 'New card', icon: FilePlus, group: 'Board', shortcut: 'C' },
		{ id: 'branch', label: 'Switch branch', description: 'main', icon: GitBranch, group: 'Board' },
		{ id: 'people', label: 'Invite people', icon: Users, group: 'Workspace', disabled: true },
		{ id: 'settings', label: 'Open settings', icon: Settings, group: 'Workspace', shortcut: ',' },
		{ id: 'theme', label: 'Toggle dark mode', icon: Moon, group: 'Workspace', keywords: ['theme', 'light'] }
	];

	function onRun(command: PaletteCommand): void {
		ran = command.label;
		recent = [command.id, ...recent.filter((id) => id !== command.id)].slice(0, 3);
	}
</script>

<div class="mx-auto flex max-w-xl flex-col items-start gap-3">
	<CommandPalette {commands} {recent} {onRun} bind:open>
		{#snippet trigger(part, hint)}
			<button {...part} class={pillClass('secondary', 'md', 'w-full max-w-72 justify-start gap-2 text-fg-light')}>
				<Search aria-hidden="true" />
				<span class="flex-1 text-left">Search commands…</span>
				<kbd class={KBD}>{hint}</kbd>
			</button>
		{/snippet}
	</CommandPalette>
	<p class="text-xs text-fg-light">
		Or press the shortcut anywhere on the page outside a text field. Last run:
		<span class="text-fg-main" data-testid="palette-ran">{ran}</span>
	</p>
</div>
