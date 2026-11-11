import type { CatalogItemMeta } from '../catalog-registry.ts';

const UPSTREAM = 'Agents Kit Svelte · Auth';

/** Catalogue entries for the Auth collection. Building blocks: AuthCard, PasswordInput, OtpInput, ProviderButton, PasskeyButton. Category: 'Auth'. */
export const AUTH_FIELDS: CatalogItemMeta[] = [
	{
		slug: 'auth-card',
		name: 'AuthCard',
		category: 'Auth',
		sveltePath: 'src/lib/auth/fields/AuthCard.svelte',
		upstreamSource: UPSTREAM,
		description:
			'The centred card every auth screen sits in: optional logo, a title (a level 1 heading by default), a description, your content and a footer line such as "No account? Sign up". It holds no logic. Put provider buttons, an "or" Separator and a form inside it.',
		usageSnippet: `<script lang="ts">
  import { AuthCard, PasswordInput, ProviderButton } from 'agents-kit-svelte/auth';
  import { Button, Field, Input, Separator } from 'agents-kit-svelte/primitives';

  const github = { id: 'github', label: 'GitHub', href: '/auth/github' };
</script>

<AuthCard title="Welcome back" description="Sign in to continue.">
  <ProviderButton provider={github} />
  <Separator label="or" />
  <form method="post" action="/signin" class="grid gap-4">
    <Field label="Email"><Input name="email" type="email" autocomplete="username" required /></Field>
    <Field label="Password"><PasswordInput required /></Field>
    <Button type="submit" variant="primary" class="w-full">Sign in</Button>
  </form>
  {#snippet footer()}No account? <a href="/signup">Sign up</a>{/snippet}
</AuthCard>`
	},
	{
		slug: 'password-input',
		name: 'PasswordInput',
		category: 'Auth',
		sveltePath: 'src/lib/auth/fields/PasswordInput.svelte',
		upstreamSource: UPSTREAM,
		description:
			'A password control for use inside a Field. It has a reveal button (hidden again when the form submits or resets), a polite Caps Lock warning, an optional rule checklist that says met or not met in words, and an optional strength meter you score yourself. It never checks or stores a password: your app decides what is valid.',
		usageSnippet: `<script lang="ts">
  import { PasswordInput } from 'agents-kit-svelte/auth';
  import { Field } from 'agents-kit-svelte/primitives';

  let password = $state('');
  const rules = [
    { label: 'At least 10 characters', test: (v: string) => v.length >= 10 },
    { label: 'A number', test: (v: string) => /[0-9]/.test(v) }
  ];
  // Your own scoring, 0 (very weak) to 4 (strong).
  const strength = $derived(Math.min(4, rules.filter((r) => r.test(password)).length) as 0 | 1 | 2 | 3 | 4);
</script>

<form method="post">
  <Field label="New password" required>
    <PasswordInput bind:value={password} autocomplete="new-password" minlength={10} {rules} {strength} />
  </Field>
</form>`
	},
	{
		slug: 'otp-input',
		name: 'OtpInput',
		category: 'Auth',
		sveltePath: 'src/lib/auth/fields/OtpInput.svelte',
		upstreamSource: UPSTREAM,
		description:
			'A one-time-code entry drawn as cells over one real input, so paste, autofill and screen readers work. "123 456", "123-456" and full-width digits are cleaned to the allowed characters, whether typed, pasted, autofilled or passed in as a value. Typing into a full code overwrites at the caret (an IME commit fills only free cells), a selection is replaced by what you type or paste, and pasting a whole code over a full code replaces it. It reports the code through onValueChange and onComplete, and can submit its form when complete. A Field names it; on its own, give it aria-label or aria-labelledby. Your app checks the code.',
		usageSnippet: `<script lang="ts">
  import { OtpInput } from 'agents-kit-svelte/auth';
  import { Field } from 'agents-kit-svelte/primitives';

  let code = $state('');
  let complete = $state('');
</script>

<form method="post">
  <Field label="Verification code" description="The six digits we sent you." required>
    <OtpInput bind:value={code} groupSize={3} onComplete={(c) => (complete = c)} />
  </Field>
  <p>{complete ? 'Entered ' + complete : ''}</p>
  <!-- Outside a Field, name it yourself. -->
  <OtpInput name="backup" length={8} alphanumeric aria-label="Backup code" />
</form>`
	},
	{
		slug: 'provider-button',
		name: 'ProviderButton',
		category: 'Auth',
		sveltePath: 'src/lib/auth/fields/ProviderButton.svelte',
		upstreamSource: UPSTREAM,
		description:
			'One sign-in provider as a full-width button, or as a link when the provider has an href (so it works without JavaScript). It reports the provider id through onProvider and shows loading while the returned promise runs. You pass the icon, since the kit ships no brand logos: a component on the provider, or a snippet on the button.',
		usageSnippet: `<script lang="ts">
  import { ProviderButton, type AuthProvider } from 'agents-kit-svelte/auth';

  import { Globe, Sparkles } from '@lucide/svelte';

  // The icon is a component, so a provider list can be plain data.
  const github: AuthProvider = { id: 'github', label: 'GitHub', icon: Sparkles };
  const google: AuthProvider = { id: 'google', label: 'Google' };
  const sso: AuthProvider = { id: 'sso', label: 'SSO', href: '/auth/sso' };

  async function onProvider(id: string): Promise<void> {
    // Start your own OAuth flow here.
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log('provider', id);
  }
</script>

{#snippet googleIcon()}
  <Globe aria-hidden="true" />
{/snippet}

<ProviderButton provider={github} {onProvider} lastUsed />
<!-- Or pass the logo as a snippet for a one-off; it wins over provider.icon. -->
<ProviderButton provider={google} {onProvider} icon={googleIcon} />
<ProviderButton provider={sso} />`
	},
	{
		slug: 'passkey-button',
		name: 'PasskeyButton',
		category: 'Auth',
		sveltePath: 'src/lib/auth/fields/PasskeyButton.svelte',
		upstreamSource: UPSTREAM,
		description:
			'A "Sign in with a passkey" button. It only reports the press through onPasskey and shows loading while your promise runs; your app does the WebAuthn. Passkey support is only known in the browser, so the server render always shows the button (inert until the page hydrates), and in a browser without support it then hides itself, which shifts what follows it by one row. Set hideWhenUnsupported to false to keep the button in place, disabled, with no shift.',
		usageSnippet: `<script lang="ts">
  import { PasskeyButton } from 'agents-kit-svelte/auth';

  async function onPasskey(): Promise<void> {
    // Call your own WebAuthn flow here.
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log('passkey requested');
  }
</script>

<PasskeyButton {onPasskey} />
<PasskeyButton {onPasskey} hideWhenUnsupported={false} label="Use a passkey" />`
	}
];
