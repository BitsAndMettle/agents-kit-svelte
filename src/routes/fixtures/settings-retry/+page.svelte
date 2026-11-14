<!--
	Browser-test fixture (tests/browser/keyboard/settings-rows.spec.ts). Not part of the catalogue.
	Instant toggles whose save always fails with a failure shorter than Saving: one with the default
	words, one with longer (translated) Saving and Retry words. The fake server answers after 600 ms.
-->
<script lang="ts">
	import { SettingsSection, SettingsToggle, type SettingsResult } from '$lib/settings';

	async function fail(): Promise<SettingsResult> {
		await new Promise<void>((resolve) => setTimeout(resolve, 600));
		return { error: 'Offline' };
	}
</script>

<main class="mx-auto max-w-3xl p-4 text-fg-main">
	<h1 class="mb-4 text-lg font-semibold">Retry fixture</h1>
	<SettingsSection title="Short failures">
		<SettingsToggle label="Short fail" defaultChecked={false} onCommit={fail} data-testid="short-fail" />
		<SettingsToggle label="Kurzer Fehler" defaultChecked={false} onCommit={fail} labels={{ saving: 'Wird gespeichert…', retry: 'Erneut versuchen' }} data-testid="short-fail-long" />
	</SettingsSection>
</main>
