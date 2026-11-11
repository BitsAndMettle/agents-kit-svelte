import type { CatalogItemMeta } from '../catalog-registry.ts';

/** Catalogue entries for the Primitives collection. Menus and pickers: DropdownMenu, ContextMenu, Select, Combobox, CommandPalette. Category: 'Primitives'. */
export const PRIMITIVES_MENUS: CatalogItemMeta[] = [
	{
		slug: 'dropdown-menu',
		name: 'DropdownMenu',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/menus/DropdownMenu.svelte',
		upstreamSource: 'Agents Kit Svelte · Primitives',
		description:
			'A menu button whose rows are data: items with icons and shortcut hints, checkboxes, radio groups, headed groups, separators and nested submenus. Keyboard, typeahead, Escape and focus return come from the headless Menu.',
		usageSnippet: `<script lang="ts">
  import { DropdownMenu, type MenuEntry } from 'agents-kit-svelte/primitives';

  let wrap = $state(true);
  let open = $state(false);

  const items: MenuEntry[] = $derived([
    { value: 'rename', label: 'Rename', shortcut: 'F2', onSelect: () => rename() },
    {
      kind: 'submenu', value: 'share', label: 'Share',
      items: [{ value: 'link', label: 'Copy link', onSelect: copyLink }]
    },
    { kind: 'checkbox', value: 'wrap', label: 'Word wrap', checked: wrap, onCheckedChange: (v) => (wrap = v) },
    { kind: 'separator' },
    { value: 'delete', label: 'Delete', tone: 'danger', onSelect: remove }
  ]);
</script>

<DropdownMenu triggerLabel="File" {items} placement="bottom-start" bind:open />`
	},
	{
		slug: 'context-menu',
		name: 'ContextMenu',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/menus/ContextMenu.svelte',
		upstreamSource: 'Agents Kit Svelte · Primitives',
		description:
			'The DropdownMenu rows on a region instead of a button: right-click opens at the pointer, Shift+F10 or the ContextMenu key opens at the focused element.',
		usageSnippet: `<script lang="ts">
  import { ContextMenu, type MenuEntry } from 'agents-kit-svelte/primitives';

  const items: MenuEntry[] = [
    { value: 'open', label: 'Open', onSelect: open },
    { value: 'rename', label: 'Rename', shortcut: 'F2', onSelect: rename },
    { kind: 'separator' },
    { value: 'delete', label: 'Delete', tone: 'danger', onSelect: remove }
  ];
</script>

<ContextMenu {items} menuLabel="File actions" class="rounded-card border p-3">
  <button type="button">plan.md</button>
</ContextMenu>`
	},
	{
		slug: 'select',
		name: 'Select',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/menus/Select.svelte',
		upstreamSource: 'Agents Kit Svelte · Primitives',
		description:
			'A select-only combobox for one value or several (as chips or "3 selected"), with groups, descriptions and disabled options. Reads a surrounding Field (label, error, required); with `name` it posts hidden inputs, resets to `defaultValue`, and `required` blocks submit with focus on the trigger.',
		usageSnippet: `<script lang="ts">
  import { Field, Select, type PickerOption } from 'agents-kit-svelte/primitives';

  const options: PickerOption[] = [
    { value: 'quick', label: 'Quick', description: 'Small edits', group: 'Everyday' },
    { value: 'deep', label: 'Deep', description: 'Hard bugs', group: 'Heavy' }
  ];
  let model = $state<string | null>('quick');
  let labels = $state<string[]>([]);
</script>

<Select label="Model" {options} bind:value={model} />
<Select label="Labels" options={tags} multiple bind:value={labels} display="count" size="sm" />
<form>
  <Field label="Priority" required error={error}>
    <Select name="priority" options={priorities} defaultValue="p2" />
  </Field>
</form>`
	},
	{
		slug: 'combobox',
		name: 'Combobox',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/menus/Combobox.svelte',
		upstreamSource: 'Agents Kit Svelte · Primitives',
		description:
			'A text input that filters a list of options as you type, with a clear button, an empty state, optional free text, and a busy state for options you load yourself. Reads a surrounding Field; `required` needs a chosen value, not just text. Escape closes the list, then clears the text.',
		usageSnippet: `<script lang="ts">
  import { Combobox, Field, type PickerOption } from 'agents-kit-svelte/primitives';

  let assignee = $state<string | null>(null);
  let query = $state('');
  let results = $state<PickerOption[]>([]);
  let loading = $state(false);
</script>

<Field label="Assignee" required>
  <Combobox options={people} bind:value={assignee} name="assignee" />
</Field>
<Combobox label="Branch" options={branches} allowCustom />
<Combobox label="Repository" options={results} filter={false} {loading} bind:query />`
	},
	{
		slug: 'command-palette',
		name: 'CommandPalette',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/menus/CommandPalette.svelte',
		upstreamSource: 'Agents Kit Svelte · Primitives',
		description:
			'A modal search over grouped commands (icon, label, description, shortcut), opened by a global shortcut (Ctrl+K or ⌘K by default) while it is mounted; with several palettes on one shortcut the most recently mounted answers. Recent section and empty state. Choosing a command closes the palette, then runs it.',
		usageSnippet: `<script lang="ts">
  import { CommandPalette, type PaletteCommand } from 'agents-kit-svelte/primitives';

  let recent = $state<string[]>([]);
  const commands: PaletteCommand[] = [
    { id: 'new', label: 'New card', group: 'Board', shortcut: 'C', onRun: newCard },
    { id: 'settings', label: 'Open settings', description: 'Workspace and account', group: 'Workspace', onRun: openSettings }
  ];
</script>

<CommandPalette
  {commands}
  {recent}
  triggerLabel="Search commands"
  onRun={(c) => (recent = [c.id, ...recent.filter((id) => id !== c.id)])}
/>`
	}
];
