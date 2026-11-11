<script lang="ts">
	import { PasskeyButton } from '$lib/auth/fields';

	let status = $state('');

	async function usePasskey(): Promise<void> {
		status = 'Waiting for your device...';
		await new Promise((resolve) => setTimeout(resolve, 800));
		status = 'Your app would verify the passkey now.';
	}
</script>

<div class="mx-auto grid w-full max-w-sm gap-2">
	<PasskeyButton onPasskey={usePasskey} />
	<PasskeyButton onPasskey={usePasskey} hideWhenUnsupported={false} label="Use a passkey (stays visible)" />
	<p class="m-0 text-center text-xs text-fg-light" aria-live="polite">{status}</p>
</div>
