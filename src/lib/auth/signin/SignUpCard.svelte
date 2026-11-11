<script lang="ts" module>
	import type { AuthProvider, AuthSubmitHandler } from '../shared';
	import type { PasswordRule, PasswordStrength } from '../fields';
	import type { AlternativeLabels, PasswordGuideLabels, PasswordLabels } from './look';

	/** Every word the card shows, including the words of its provider, passkey and password parts. */
	export interface SignUpCardLabels extends AlternativeLabels, PasswordLabels, PasswordGuideLabels {
		title: string;
		name: string;
		email: string;
		password: string;
		confirmPassword: string;
		/** Native validation message on the confirm field while it differs from the password. */
		passwordMismatch: string;
		/** Divider between the provider buttons and the form. */
		or: string;
		submit: string;
		/** Text before the sign-in link in the default footer. */
		haveAccount: string;
		signIn: string;
		/** The mark after an optional field's label (without the parentheses). */
		optional: string;
		/** Shown when the submit handler throws or rejects. */
		genericError: string;
	}

	/** What `onSubmit` receives. `name` is absent when `nameField` is `'hidden'`. */
	export interface SignUpValues {
		name?: string;
		email: string;
		password: string;
		terms: boolean;
	}

	/** Field names an error can be keyed by. */
	export type SignUpField = 'name' | 'email' | 'password' | 'confirmPassword' | 'terms';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
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
		/** Replaces the default "Already have an account? Sign in" footer. */
		footer?: Snippet;
		/** Whether the name field is asked for, offered, or left out. */
		nameField?: 'required' | 'optional' | 'hidden';
		/** Adds a second password field that must match. */
		confirmPassword?: boolean;
		/** Requirements shown as a checklist under the new password. */
		rules?: PasswordRule[];
		/** A password score you work out, 0 to 4, shown as a meter. */
		strength?: PasswordStrength;
		/** Called with the new password on every edit, so your scoring can run. */
		onPasswordChange?: (value: string) => void;
		/** Minimum length of the password (native validation). */
		minlength?: number;
		/** The label of a required "I agree" checkbox (field `terms`). It may hold links. Without it there is no checkbox. */
		terms?: Snippet;
		/** OAuth or SSO buttons, shown above the form. */
		providers?: AuthProvider[];
		/** Draws a provider's logo as a snippet (it gets the provider); wins over `provider.icon`. Decorative. */
		providerIcon?: Snippet<[AuthProvider]>;
		/** Called with a provider's `id` when its button is pressed. */
		onProvider?: (id: string) => void | Promise<unknown>;
		/** The `id` of the provider the person used last: its button gets a badge. */
		lastUsedProvider?: string;
		/** Shows a passkey button above the form (for creating an account with a passkey). */
		onPasskey?: () => void | Promise<unknown>;
		/** Address of your sign-in page; shows the default footer. */
		signInHref?: string;
		/** Receives typed values. With it the native post is cancelled; return an `AuthResult` to show errors. */
		onSubmit?: AuthSubmitHandler<SignUpValues, SignUpField>;
		/** Where the form posts without `onSubmit`. */
		action?: string;
		/** Controlled pending state (e.g. from SvelteKit `enhance`). */
		pending?: boolean;
		/** Form-level error, e.g. from a server action. */
		error?: string;
		/** Per-field errors, keyed by field name. */
		errors?: Partial<Record<SignUpField, string>>;
		/** Hidden inputs the server needs (a CSRF token, an invite code). */
		hidden?: Record<string, string>;
		/** Starting value of the email field. */
		email?: string;
		/** Words, merged over the English defaults. */
		labels?: Partial<SignUpCardLabels>;
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
		nameField = 'optional',
		confirmPassword = false,
		rules,
		strength,
		onPasswordChange,
		minlength,
		terms,
		providers,
		providerIcon,
		onProvider,
		lastUsedProvider,
		onPasskey,
		signInHref,
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

	const text = $derived<SignUpCardLabels>({
		title: 'Create your account',
		name: 'Name',
		email: 'Email',
		password: 'Password',
		confirmPassword: 'Confirm password',
		passwordMismatch: 'The passwords do not match.',
		or: 'or',
		submit: 'Create account',
		haveAccount: 'Already have an account?',
		signIn: 'Sign in',
		optional: 'Optional',
		genericError: 'Something went wrong. Try again.',
		provider: (label) => `Continue with ${label}`,
		lastUsed: 'Last used',
		passkey: 'Sign up with a passkey',
		showPassword: 'Show password',
		hidePassword: 'Hide password',
		capsLock: 'Caps Lock is on',
		ruleMet: 'met',
		ruleUnmet: 'not met',
		rulesSummary: (met, total) => `${met} of ${total} requirements met`,
		strengthTitle: 'Password strength',
		strengthLabels: ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'],
		...labels
	});

	const submit = new AuthSubmit<SignUpValues, SignUpField>({
		handler: () => onSubmit,
		read: (data) => ({
			...(nameField === 'hidden' ? {} : { name: readText(data, 'name') }),
			email: readText(data, 'email'),
			password: readText(data, 'password', false),
			terms: readCheck(data, 'terms')
		}),
		pending: () => pending,
		error: () => error,
		errors: () => errors,
		genericError: () => text.genericError
	});

	let password = $state('');
	let confirm = $state('');
	let confirmRef = $state<HTMLInputElement | null>(null);
	/** Set once the browser has refused a submit because of the mismatch, so the message is also shown in place. */
	let mismatchRefused = $state(false);
	const mismatch = $derived(confirmPassword && confirm !== password);

	// The browser blocks the submit and focuses the field itself: the message rides on the native constraint.
	$effect(() => {
		confirmRef?.setCustomValidity(mismatch ? text.passwordMismatch : '');
	});

	const confirmError = $derived(submit.fieldError('confirmPassword') ?? (mismatch && mismatchRefused ? text.passwordMismatch : undefined));
	const showAlternatives = $derived(Boolean(providers?.length) || Boolean(onPasskey));
</script>

{#snippet defaultFooter()}
	{text.haveAccount} <a href={signInHref} class={LINK_CLASS}>{text.signIn}</a>
{/snippet}

<AuthCard class={cn('w-full', className)} title={title ?? text.title} {description} {headingLevel} {logo} footer={footer ?? (signInHref ? defaultFooter : undefined)}>
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
		{#if nameField !== 'hidden'}
			<Field label={text.name} error={submit.fieldError('name')} required={nameField === 'required'} optional={nameField === 'optional'} optionalLabel={text.optional}>
				<Input name="name" autocomplete="name" />
			</Field>
		{/if}
		<Field label={text.email} error={submit.fieldError('email')} required>
			<Input name="email" type="email" autocomplete="email" defaultValue={email} />
		</Field>
		<Field label={text.password} error={submit.fieldError('password')} required>
			<PasswordInput
				autocomplete="new-password"
				{minlength}
				{rules}
				{strength}
				showLabel={text.showPassword}
				hideLabel={text.hidePassword}
				capsLockLabel={text.capsLock}
				metLabel={text.ruleMet}
				unmetLabel={text.ruleUnmet}
				rulesSummary={text.rulesSummary}
				strengthTitle={text.strengthTitle}
				strengthLabels={text.strengthLabels}
				bind:value={password} onValueChange={(value) => onPasswordChange?.(value)}
			/>
		</Field>
		{#if confirmPassword}
			<Field label={text.confirmPassword} error={confirmError} required>
				<PasswordInput name="confirmPassword" autocomplete="new-password" showLabel={text.showPassword} hideLabel={text.hidePassword} capsLockLabel={text.capsLock} bind:value={confirm} bind:ref={confirmRef} oninvalid={() => (mismatchRefused = true)} />
			</Field>
		{/if}
		{#if terms}
			<Field error={submit.fieldError('terms')} required>
				<Checkbox name="terms" required>{@render terms()}</Checkbox>
			</Field>
		{/if}
		<Button type="submit" variant="primary" size="lg" loading={submit.pending} class="w-full">{text.submit}</Button>
	</form>
</AuthCard>
