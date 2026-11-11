<script lang="ts">
	import { Field, Textarea } from '$lib/primitives/form';
	import DemoForm from './DemoForm.svelte';

	let summary = $state('Retry the flaky checkout test before merging.');
</script>

<DemoForm label="Hand-off note" class="mx-auto w-full max-w-xl">
	<Field label="Summary" hint="Grows as you type. Screen readers hear the count near the limit." required>
		<Textarea name="summary" maxlength={120} autoGrow maxRows={8} rows={2} bind:value={summary} />
	</Field>
	<Textarea name="notes" aria-label="Private notes" placeholder="Private notes (a fixed-size textarea)" rows={3} />
</DemoForm>
