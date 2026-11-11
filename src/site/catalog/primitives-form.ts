import type { CatalogItemMeta } from '../catalog-registry.ts';

const SOURCE = 'Agents Kit Svelte · Primitives';

/** Catalogue entries for the Primitives collection. Form controls: Field, Input, Textarea, Checkbox, Switch, RadioGroup, NativeSelect, Slider. Category: 'Primitives'. */
export const PRIMITIVES_FORM: CatalogItemMeta[] = [
	{
		slug: 'field',
		name: 'Field',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/form/Field.svelte',
		upstreamSource: SOURCE,
		description:
			'Label, hint, error and required or optional mark for one form control. The kit controls inside it pick up its id, description, invalid and required state by themselves; the children snippet hands the same attributes to any other element. The error is announced politely when it appears. With `group`, it renders a fieldset and legend for a RadioGroup or several checkboxes.',
		usageSnippet: `<script lang="ts">
  import { Field, Input } from 'agents-kit-svelte';

  let email = $state('');
  let error = $derived(email && !email.includes('@') ? 'Enter an email address with an @.' : '');
</script>

<Field label="Work email" hint="Sign-in links go here." {error} required>
  <Input type="email" name="email" bind:value={email} />
</Field>

<Field label="Display name" optional>
  {#snippet children(control)}
    <input {...control} name="display" />
  {/snippet}
</Field>`
	},
	{
		slug: 'input',
		name: 'Input',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/form/Input.svelte',
		upstreamSource: SOURCE,
		description:
			'A native text input in the kit look, in three sizes, with optional leading and trailing content (an icon, a prefix, a unit) and a clear button that empties the input and puts focus back in it. Attributes go on the input; `class` styles the box.',
		usageSnippet: `<script lang="ts">
  import { Input } from 'agents-kit-svelte';

  let query = $state('');
</script>

<Input name="q" aria-label="Search runs" placeholder="Search runs" clearable bind:value={query} />

<Input name="budget" type="number" aria-label="Token budget" size="lg" value={40}>
  {#snippet trailing()}<span class="text-xs">k tokens</span>{/snippet}
</Input>`
	},
	{
		slug: 'textarea',
		name: 'Textarea',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/form/Textarea.svelte',
		upstreamSource: SOURCE,
		description:
			'A native textarea that can grow with its content (CSS field-sizing, with a script fallback) and shows a character count when `maxlength` is set. Screen readers hear how many characters are left once the text nears the limit, after a pause in typing, not on every key.',
		usageSnippet: `<script lang="ts">
  import { Field, Textarea } from 'agents-kit-svelte';

  let summary = $state('');
</script>

<Field label="Summary" hint="One or two sentences.">
  <Textarea name="summary" maxlength={280} autoGrow maxRows={8} bind:value={summary} />
</Field>`
	},
	{
		slug: 'checkbox',
		name: 'Checkbox',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/form/Checkbox.svelte',
		upstreamSource: SOURCE,
		description:
			'A native checkbox with the kit mark, a label and an optional description. Supports `indeterminate` for "some selected" parents, `required`, and posts its `name` and `value` with a form like any checkbox.',
		usageSnippet: `<script lang="ts">
  import { Checkbox } from 'agents-kit-svelte';

  let lint = $state(true);
  let tests = $state(false);
</script>

<Checkbox label="Run every check" checked={lint && tests} indeterminate={lint !== tests} onCheckedChange={(next) => (lint = tests = next)} />
<Checkbox name="checks" value="lint" label="Lint" bind:checked={lint} />
<Checkbox name="checks" value="tests" label="Unit tests" bind:checked={tests} />
<Checkbox name="terms" required label="I reviewed the diff" description="Needed before you can submit." />`
	},
	{
		slug: 'switch',
		name: 'Switch',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/form/Switch.svelte',
		upstreamSource: SOURCE,
		description:
			'An on/off setting: a native checkbox with `role="switch"`, so Space toggles it, it is read as a switch, and it posts with a form. Two sizes, an optional description, and `labelFirst` for settings rows.',
		usageSnippet: `<script lang="ts">
  import { Switch } from 'agents-kit-svelte';

  let retry = $state(true);
</script>

<Switch
  name="retry"
  labelFirst
  label="Retry failed runs"
  description="One automatic retry before a run is marked failed."
  bind:checked={retry}
/>`
	},
	{
		slug: 'radio-group',
		name: 'RadioGroup',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/form/RadioGroup.svelte',
		upstreamSource: SOURCE,
		description:
			'One choice from a list, with optional descriptions and disabled options, laid out vertically or horizontally. Built on the headless RadioGroup: arrow keys move and select, Tab enters on the checked option, and a hidden native radio posts the value and makes `required` block a submit. Wrap it in `<Field group>` for a visible label.',
		usageSnippet: `<script lang="ts">
  import { Field, RadioGroup, type RadioOption } from 'agents-kit-svelte';

  const options: RadioOption[] = [
    { value: 'fast', label: 'Fast', description: 'Quick edits and small fixes.' },
    { value: 'careful', label: 'Careful', description: 'Reviews and risky changes.' },
    { value: 'deep', label: 'Deep', disabled: true }
  ];
  let model = $state<string | null>(null);
</script>

<Field label="Model" group required>
  <RadioGroup name="model" {options} bind:value={model} />
</Field>`
	},
	{
		slug: 'native-select',
		name: 'NativeSelect',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/form/NativeSelect.svelte',
		upstreamSource: SOURCE,
		description:
			"The browser's own select in the kit look, with a chevron, an optional placeholder, options or option groups from data, or your own `<option>` children. Keeps native keyboard, typeahead and mobile pickers.",
		usageSnippet: `<script lang="ts">
  import { Field, NativeSelect } from 'agents-kit-svelte';

  let region = $state('');
</script>

<Field label="Region" required>
  <NativeSelect
    name="region"
    placeholder="Choose a region"
    options={[{ value: 'fra', label: 'Frankfurt' }, { value: 'iad', label: 'Virginia' }]}
    bind:value={region}
  />
</Field>`
	},
	{
		slug: 'slider',
		name: 'Slider',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/form/Slider.svelte',
		upstreamSource: SOURCE,
		description:
			'A native range input with a filled track in both themes, `min`, `max` and `step`, and an optional value label. `formatValue` formats the label and what screen readers hear; arrow keys, Page Up/Down, Home and End work natively.',
		usageSnippet: `<script lang="ts">
  import { Field, Slider } from 'agents-kit-svelte';

  let temperature = $state(0.7);
</script>

<Field label="Temperature">
  <Slider name="temperature" min={0} max={1} step={0.1} showValue formatValue={(v) => v.toFixed(1)} bind:value={temperature} />
</Field>`
	}
];
