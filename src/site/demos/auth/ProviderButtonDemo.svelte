<script lang="ts">
	import { Globe, Sparkles } from '@lucide/svelte';
	import { ProviderButton } from '$lib/auth/fields';
	import type { AuthProvider } from '$lib/auth/shared';

	let last = $state('');

	const github: AuthProvider = { id: 'github', label: 'GitHub', icon: Sparkles };
	const google: AuthProvider = { id: 'google', label: 'Google' };
	const sso: AuthProvider = { id: 'sso', label: 'single sign-on', href: '#provider-button' };
	const gitlab: AuthProvider = { id: 'gitlab', label: 'GitLab', disabled: true };

	async function choose(id: string): Promise<void> {
		last = `Starting ${id}...`;
		await new Promise((resolve) => setTimeout(resolve, 800));
		last = `${id} finished`;
	}
</script>

{#snippet googleIcon()}
	<Globe data-provider-icon="snippet" />
{/snippet}

<div class="mx-auto grid w-full max-w-sm gap-2">
	<ProviderButton provider={github} onProvider={choose} lastUsed />
	<ProviderButton provider={google} onProvider={choose} icon={googleIcon} />
	<ProviderButton provider={sso} />
	<ProviderButton provider={gitlab} onProvider={choose} />
	<p class="m-0 text-center text-xs text-fg-light" aria-live="polite">{last}</p>
</div>
