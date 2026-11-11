<script lang="ts" module>
	import type { AuthProvider, AuthSubmitHandler } from '../shared';
	import type { AlternativeLabels, PasswordLabels } from './look';

	/** Every word the card shows, including the words of its provider, passkey and password parts. */
	export interface SignInCardLabels extends AlternativeLabels, PasswordLabels {
		title: string;
		email: string;
		password: string;
		/** The "Forgot password?" link. */
		forgot: string;
		remember: string;
		/** Divider between the provider buttons and the form. */
		or: string;
		/** Submit button in password mode. */
		submit: string;
		/** Submit button in magic-link mode. */
		submitMagicLink: string;
		/** Text before the sign-up link in the default footer. */
		noAccount: string;
		signUp: string;
		/** Shown when the submit handler throws or rejects. */
		genericError: string;
	}

	/** What `onSubmit` receives. `password` is absent in magic-link mode. */
	export interface SignInValues {
		email: string;
		password?: string;
		remember: boolean;
	}

	/** Field names an error can be keyed by. */
	export type SignInField = 'email' | 'password';
</script>

<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLFormAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { Button } from '../../primitives/actions';
	import { Alert, Separator } from '../../primitives/display';
	import { Checkbox, Field, Input } from '../../primitives/form';
	import { AuthCard, PasskeyButton, PasswordInput, ProviderButton } from '../fields';
	import { AuthSubmit, readCheck, readText } from '../shared';
	import { LINK_CLASS } from './look';

	export interface Props extends Omit<HTMLFormAttributes, 'class' | 'children' | 'title' | 'action' | 'method' | 'hidden' | 'onsubmit' | 'oninput'> {
		/** Heading of the card. */
		title?: string;
		/** One line under the title. */
		description?: string;
		/** Heading level of the title (1 by default: an auth screen is usually the page's main heading). */
		headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
		/** Your logo or mark, above the title. */
		logo?: Snippet;
		/** Replaces the default "No account? Sign up" footer. */
		footer?: Snippet;
		/** How the person signs in: with a password, or with an emailed link. */
		method?: 'password' | 'magic-link';
		/** OAuth or SSO buttons, shown above the form. */
		providers?: AuthProvider[];
		/** Draws a provider's logo as a snippet (it gets the provider); wins over `provider.icon`. Decorative. */
		providerIcon?: Snippet<[AuthProvider]>;
		/** Called with a provider's `id` when its button is pressed. */
		onProvider?: (id: string) => void | Promise<unknown>;
		/** The `id` of the provider the person used last: its button gets a badge. */
		lastUsedProvider?: string;
		/** Shows a passkey button and sets the email's autocomplete to `username webauthn`. Run your own WebAuthn here. */
		onPasskey?: () => void | Promise<unknown>;
		/** Address of your forgot-password page; shows the link in password mode. */
		forgotHref?: string;
		/** Shows a "Remember me" checkbox (field `remember`). */
		showRemember?: boolean;
		/** Address of your sign-up page; shows the default footer. */
		signUpHref?: string;
		/** Receives typed values. With it the native post is cancelled; return an `AuthResult` to show errors. */
		onSubmit?: AuthSubmitHandler<SignInValues, SignInField>;
		/** Where the form posts without `onSubmit`. */
		action?: string;
		/** Controlled pending state (e.g. from SvelteKit `enhance`). */
		pending?: boolean;
		/** Form-level error, e.g. from a server action. */
		error?: string;
		/** Per-field errors, keyed by field name. */
		errors?: Partial<Record<SignInField, string>>;
		/** Hidden inputs the server needs (a CSRF token, a return address). */
		hidden?: Record<string, string>;
		/** Starting value of the email field. */
		email?: string;
		/** Words, merged over the English defaults. */
		labels?: Partial<SignInCardLabels>;
		/** The `<form>` element. Bindable. */
		ref?: HTMLFormElement | null;
		/** Classes for the card. */
		class?: string;
	}

	let {
		title,
		description,
		headingLevel,
		logo,
		footer,
		method = 'password',
		providers,
		providerIcon,
		onProvider,
		lastUsedProvider,
		onPasskey,
		forgotHref,
		showRemember = false,
		signUpHref,
		onSubmit,
		action,
		pending,
		error,
		errors,
		hidden,
		email,
		labels,
		ref = $bindable(null),
		class: className = '',
		...rest
	}: Props = $props();

	const text = $derived<SignInCardLabels>({
		title: 'Sign in',
		email: 'Email',
		password: 'Password',
		forgot: 'Forgot password?',
		remember: 'Remember me',
		or: 'or',
		submit: 'Sign in',
		submitMagicLink: 'Email me a sign-in link',
		noAccount: 'No account?',
		signUp: 'Sign up',
		genericError: 'Something went wrong. Try again.',
		provider: (label) => `Continue with ${label}`,
		lastUsed: 'Last used',
		passkey: 'Sign in with a passkey',
		showPassword: 'Show password',
		hidePassword: 'Hide password',
		capsLock: 'Caps Lock is on',
		...labels
	});

	const submit = new AuthSubmit<SignInValues, SignInField>({
		handler: () => onSubmit,
		read: (data) => ({
			email: readText(data, 'email'),
			...(method === 'password' ? { password: readText(data, 'password', false) } : {}),
			remember: readCheck(data, 'remember')
		}),
		pending: () => pending,
		error: () => error,
		errors: () => errors,
		genericError: () => text.genericError
	});

	// Another method is another form: errors and a submit in flight belong to the one that was left.
	let shownMethod = untrack(() => method);
	$effect.pre(() => {
		if (method === shownMethod) return;
		shownMethod = method;
		submit.clear();
	});

	const showAlternatives = $derived(Boolean(providers?.length) || Boolean(onPasskey));
</script>

{#snippet defaultFooter()}
	{text.noAccount} <a href={signUpHref} class={LINK_CLASS}>{text.signUp}</a>
{/snippet}

<AuthCard class={cn('w-full', className)} title={title ?? text.title} {description} {headingLevel} {logo} footer={footer ?? (signUpHref ? defaultFooter : undefined)}>
	{#if showAlternatives}
		<div class="grid min-w-0 grid-cols-1 gap-2">
			{#each providers ?? [] as provider (provider.id)}
				{#if providerIcon}
					<ProviderButton {provider} {onProvider} formatLabel={(p) => text.provider(p.label)} lastUsedLabel={text.lastUsed} lastUsed={provider.id === lastUsedProvider}>
						{#snippet icon()}{@render providerIcon(provider)}{/snippet}
					</ProviderButton>
				{:else}
					<ProviderButton {provider} {onProvider} formatLabel={(p) => text.provider(p.label)} lastUsedLabel={text.lastUsed} lastUsed={provider.id === lastUsedProvider} />
				{/if}
			{/each}
			{#if onPasskey}
				<PasskeyButton {onPasskey} label={text.passkey} />
			{/if}
		</div>
		<Separator label={text.or} />
	{/if}
	<form {...rest} bind:this={ref} {action} method="post" onsubmit={submit.onsubmit} oninput={submit.oninput} class="grid gap-4">
		{#each Object.entries(hidden ?? {}) as [name, value] (name)}
			<input type="hidden" {name} {value} />
		{/each}
		{#if submit.error}
			<Alert tone="danger" live description={submit.error} data-auth-error tabindex={-1} />
		{/if}
		<Field label={text.email} error={submit.fieldError('email')} required>
			<Input name="email" type="email" autocomplete={onPasskey ? 'username webauthn' : 'username'} defaultValue={email} />
		</Field>
		{#if method === 'password'}
			<Field label={text.password} error={submit.fieldError('password')} required>
				<PasswordInput autocomplete="current-password" showLabel={text.showPassword} hideLabel={text.hidePassword} capsLockLabel={text.capsLock} />
			</Field>
			{#if showRemember || forgotHref}
				<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[13px]">
					{#if showRemember}
						<Checkbox name="remember" label={text.remember} />
					{/if}
					{#if forgotHref}
						<a href={forgotHref} class={cn(LINK_CLASS, 'ml-auto')}>{text.forgot}</a>
					{/if}
				</div>
			{/if}
		{/if}
		<Button type="submit" variant="primary" size="lg" loading={submit.pending} class="w-full">
			{method === 'password' ? text.submit : text.submitMagicLink}
		</Button>
	</form>
</AuthCard>
