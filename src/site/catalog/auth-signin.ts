import type { CatalogItemMeta } from '../catalog-registry.ts';

const UPSTREAM = 'Agents Kit Svelte · Auth';

/** Catalogue entries for the Auth collection. Sign-in flows: SignInCard, SignUpCard, MagicLinkSent, TwoFactorCard. Category: 'Auth'. */
export const AUTH_SIGNIN: CatalogItemMeta[] = [
	{
		slug: 'sign-in-card',
		name: 'SignInCard',
		category: 'Auth',
		sveltePath: 'src/lib/auth/signin/SignInCard.svelte',
		upstreamSource: UPSTREAM,
		description:
			'A full sign-in screen: optional provider and passkey buttons, an "or" divider, then a real form with email and password (or email only, in magic-link mode), a forgot-password link and a remember checkbox. It reports { email, password, remember } to onSubmit, or posts natively to action. It checks nothing: your app signs the person in, and returns errors for the card to show. Pending, field errors and a generic failure message are built in.',
		usageSnippet: `<script lang="ts">
  import { SignInCard, type SignInValues } from 'agents-kit-svelte/auth';

  const providers = [{ id: 'github', label: 'GitHub', href: '/auth/github' }];

  // Your server call. Return errors to show them; return nothing on success.
  async function signIn(values: SignInValues) {
    const response = await fetch('/api/sign-in', { method: 'POST', body: JSON.stringify(values) });
    if (!response.ok) return { error: 'The email or password is not right.' };
    window.location.assign('/dashboard');
  }
</script>

<SignInCard {providers} forgotHref="/forgot" signUpHref="/sign-up" showRemember onSubmit={signIn} />`
	},
	{
		slug: 'sign-up-card',
		name: 'SignUpCard',
		category: 'Auth',
		sveltePath: 'src/lib/auth/signin/SignUpCard.svelte',
		upstreamSource: UPSTREAM,
		description:
			'A full sign-up screen: optional name, email, a new password with an optional rule checklist and strength meter, an optional confirm field that the browser itself refuses to submit while it differs, and an optional required terms checkbox whose label can hold links. It reports { name, email, password, terms } to onSubmit, or posts natively. Your app creates the account and decides what a strong password is.',
		usageSnippet: `<script lang="ts">
  import { SignUpCard, type SignUpValues } from 'agents-kit-svelte/auth';

  const rules = [{ label: 'At least 10 characters', test: (v: string) => v.length >= 10 }];

  // Your server call. Return errors to show them; return nothing on success.
  async function signUp(values: SignUpValues) {
    const response = await fetch('/api/sign-up', { method: 'POST', body: JSON.stringify(values) });
    if (!response.ok) return { errors: { email: 'Use a different email address.' } };
    window.location.assign('/welcome');
  }
</script>

<SignUpCard nameField="required" confirmPassword minlength={10} {rules} signInHref="/sign-in" onSubmit={signUp}>
  {#snippet terms()}I agree to the <a href="/terms">Terms</a>{/snippet}
</SignUpCard>`
	},
	{
		slug: 'magic-link-sent',
		name: 'MagicLinkSent',
		category: 'Auth',
		sveltePath: 'src/lib/auth/signin/MagicLinkSent.svelte',
		upstreamSource: UPSTREAM,
		description:
			'The "Check your email" screen shown after a sign-in link or code was emailed. It shows the address, a Resend button that waits until your server says it may be used again (and confirms politely when it was sent), and a "Use a different email" button. Set codeLength when the email also holds a code: a code form appears and reports { code } to onSubmit. Your app sends the email and checks the code.',
		usageSnippet: `<script lang="ts">
  import { MagicLinkSent } from 'agents-kit-svelte/auth';

  let resendAvailableAt = $state<number | undefined>(undefined);

  // Your server call. Pass back when the next resend is allowed.
  async function resend() {
    const response = await fetch('/api/magic-link/resend', { method: 'POST' });
    const { retryAfterSeconds } = await response.json();
    resendAvailableAt = Date.now() + retryAfterSeconds * 1000;
  }
</script>

<MagicLinkSent
  email="ada@example.com"
  onResend={resend}
  {resendAvailableAt}
  onBack={() => window.location.assign('/sign-in')}
/>`
	},
	{
		slug: 'two-factor-card',
		name: 'TwoFactorCard',
		category: 'Auth',
		sveltePath: 'src/lib/auth/signin/TwoFactorCard.svelte',
		upstreamSource: UPSTREAM,
		description:
			'The second step of sign-in: a one-time code form that can switch to a backup code and back (focus follows), an optional "Trust this device" checkbox, an optional passkey button and a "Sign in another way" button. It reports { code, method, trustDevice } to onSubmit, where method says whether an authentication or a backup code was used; a native post carries the same in a hidden method field. Your app checks the code.',
		usageSnippet: `<script lang="ts">
  import { TwoFactorCard, type TwoFactorValues } from 'agents-kit-svelte/auth';

  // Your server call. Return errors to show them; return nothing on success.
  async function verify(values: TwoFactorValues) {
    const response = await fetch('/api/two-factor', { method: 'POST', body: JSON.stringify(values) });
    if (!response.ok) return { errors: { code: 'That code is not right.' } };
    window.location.assign('/dashboard');
  }
</script>

<TwoFactorCard
  showTrustDevice
  onSubmit={verify}
  onBack={() => window.location.assign('/sign-in')}
/>`
	}
];
