import type { CatalogItemMeta } from '../catalog-registry.ts';

const UPSTREAM = 'Agents Kit Svelte · Auth';

/** Catalogue entries for the Auth collection. Recovery and setup: ForgotPasswordCard, ResetPasswordCard, TwoFactorSetup. Category: 'Auth'. */
export const AUTH_RECOVERY: CatalogItemMeta[] = [
	{
		slug: 'forgot-password-card',
		name: 'ForgotPasswordCard',
		category: 'Auth',
		sveltePath: 'src/lib/auth/recovery/ForgotPasswordCard.svelte',
		upstreamSource: UPSTREAM,
		description:
			'The "forgot password" screen: an email form that reports the address through onSubmit, or posts natively to action. After a successful submit (or when you set sent, for a native post that comes back) it shows a confirmation that never says whether the account exists, with a Resend button that counts down until resendAvailableAt and a Back to sign in link. Focus moves to the confirmation. Your app sends the email and decides the wait.',
		usageSnippet: `<script lang="ts">
  import { ForgotPasswordCard, type AuthResult } from 'agents-kit-svelte/auth';

  let resendAvailableAt = $state<number | undefined>(undefined);

  async function requestLink({ email }: { email: string }): Promise<AuthResult<'email'> | void> {
    const response = await fetch('/api/password/forgot', { method: 'POST', body: JSON.stringify({ email }) });
    // Answer the same way whether or not the account exists.
    if (response.status === 429) return { error: 'Too many requests. Try again in a minute.' };
    resendAvailableAt = Date.now() + 30_000;
  }

  async function resend() {
    await fetch('/api/password/forgot', { method: 'POST' });
    resendAvailableAt = Date.now() + 30_000;
  }
</script>

<ForgotPasswordCard onSubmit={requestLink} onResend={resend} {resendAvailableAt} signInHref="/login" />`
	},
	{
		slug: 'reset-password-card',
		name: 'ResetPasswordCard',
		category: 'Auth',
		sveltePath: 'src/lib/auth/recovery/ResetPasswordCard.svelte',
		upstreamSource: UPSTREAM,
		description:
			'The "choose a new password" screen: a new password (with optional rules and strength) and a confirmation the browser itself blocks when they differ. The reset token comes in through hidden and is never shown; a hidden username field lets password managers update the right entry. It reports the password through onSubmit, then shows a success state with Continue to sign in, or an expired-link state with Request a new link. Your app checks the token and saves the password.',
		usageSnippet: `<script lang="ts">
  import { ResetPasswordCard, type AuthResult } from 'agents-kit-svelte/auth';

  // The token and email come from your reset link.
  const token = 'token-from-the-link';
  const email = 'ada@example.com';
  let expired = $state(false);

  const rules = [
    { label: 'At least 10 characters', test: (v: string) => v.length >= 10 },
    { label: 'A number', test: (v: string) => /[0-9]/.test(v) }
  ];

  async function reset({ password }: { password: string }): Promise<AuthResult<'password'> | void> {
    const response = await fetch('/api/password/reset', { method: 'POST', body: JSON.stringify({ token, password }) });
    if (response.status === 410) {
      expired = true;
      return;
    }
    if (!response.ok) return { errors: { password: 'Choose a stronger password.' } };
  }
</script>

<ResetPasswordCard
  onSubmit={reset}
  hidden={{ token }}
  {email}
  {rules}
  minlength={10}
  {expired}
  signInHref="/login"
  forgotHref="/forgot-password"
/>`
	},
	{
		slug: 'two-factor-setup',
		name: 'TwoFactorSetup',
		category: 'Auth',
		sveltePath: 'src/lib/auth/recovery/TwoFactorSetup.svelte',
		upstreamSource: UPSTREAM,
		description:
			'Enrolling an authenticator app, in steps on one card: scan the QR code you provide (as a snippet or an image; the kit never makes one) with a copyable setup key for people who cannot scan, then enter the six-digit code, then save backup codes you provide. The code goes to onVerify, which may return errors.code. onComplete runs when the last step is done. Your app makes the secret, QR code and backup codes and checks the code.',
		usageSnippet: `<script lang="ts">
  import { TwoFactorSetup, type AuthResult } from 'agents-kit-svelte/auth';

  // Your server makes these when enrolment starts.
  const qrSrc = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>';
  const secret = 'JBSWY3DPEHPK3PXP';
  let step = $state<1 | 2 | 3>(1);
  let backupCodes = $state<string[]>([]);

  async function verify({ code }: { code: string }): Promise<AuthResult<'code'> | void> {
    const response = await fetch('/api/2fa/verify', { method: 'POST', body: JSON.stringify({ code }) });
    if (!response.ok) return { errors: { code: 'That code is not right. Check your app and try again.' } };
    backupCodes = (await response.json()).backupCodes;
  }
</script>

<TwoFactorSetup
  bind:step
  {qrSrc}
  qrAlt="QR code for Example app"
  {secret}
  issuer="Example app"
  account="ada@example.com"
  {backupCodes}
  onVerify={verify}
  onComplete={() => (location.href = '/account')}
  onCancel={() => history.back()}
/>`
	}
];
