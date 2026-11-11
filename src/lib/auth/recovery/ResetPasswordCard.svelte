<script lang="ts" module>
	/** Every word the reset-password screen shows or announces. */
	export interface ResetPasswordCardLabels {
		title: string;
		description: string;
		password: string;
		confirmPassword: string;
		/** The browser's own message when the two passwords differ. */
		passwordMismatch: string;
		submit: string;
		/** Shown when the submit handler throws or rejects. */
		genericError: string;
		doneTitle: string;
		doneDescription: string;
		continue: string;
		expiredTitle: string;
		expiredDescription: string;
		requestNew: string;
	}
</script>

<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import type { HTMLFormAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { SURFACE } from '../../ui/styles';
	import { Alert } from '../../primitives/display';
	import { Button } from '../../primitives/actions';
	import { Field } from '../../primitives/form';
	import { AuthCard, PasswordInput, type PasswordRule, type PasswordStrength } from '../fields';
	import { AuthSubmit, readText, type AuthSubmitHandler } from '../shared';
	import { afterSuccess } from './result';

	export interface Props extends Omit<HTMLFormAttributes, 'class' | 'children' | 'title' | 'hidden' | 'onsubmit' | 'oninput' | 'method'> {
		/** Called with the new password. Without it the form posts natively to `action`. Return an `AuthResult` to show errors. */
		onSubmit?: AuthSubmitHandler<{ password: string }, 'password' | 'confirmPassword'>;
		/** Where a native post goes. */
		action?: string;
		/** Controlled pending state (wins over the handler's own). */
		pending?: boolean;
		/** Form-level error, e.g. from a server form action. */
		error?: string;
		/** Field errors, keyed by field name. */
		errors?: { password?: string; confirmPassword?: string };
		/** Values for the post, rendered as hidden inputs. The reset token goes here, e.g. `{ token }`: it is never shown. */
		hidden?: Record<string, string>;
		/** Whose password this is. Adds a hidden username field so a password manager updates the right entry. */
		email?: string;
		/** Requirements shown under the new password. */
		rules?: PasswordRule[];
		/** Your own score for the new password, 0 to 4. */
		strength?: PasswordStrength;
		minlength?: number;
		/** Shows the success state. Set it when a native post comes back. A successful `onSubmit` shows it on its own. */
		done?: boolean;
		/** Shows the expired-link state instead of the form. */
		expired?: boolean;
		/** Where "Continue to sign in" goes (a link). */
		signInHref?: string;
		/** Runs when "Continue to sign in" is chosen (also with a `signInHref`). */
		onContinue?: () => void;
		/** Where "Request a new link" goes, on the expired state. */
		forgotHref?: string;
		/** Heading text of the form. Defaults to `labels.title`. */
		title?: string;
		/** Line under the heading. Defaults to `labels.description`. */
		description?: string;
		/** Heading level of the title. Default 1. */
		headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
		logo?: Snippet;
		footer?: Snippet;
		/** Words, merged over the English defaults. */
		labels?: Partial<ResetPasswordCardLabels>;
		/** The `<form>` element. Bindable. */
		ref?: HTMLFormElement | null;
		/** Classes for the card. */
		class?: string;
	}

	let {
		onSubmit,
		action,
		pending,
		error,
		errors,
		hidden,
		email,
		rules,
		strength,
		minlength,
		done = false,
		expired = false,
		signInHref,
		onContinue,
		forgotHref,
		title,
		description,
		headingLevel = 1,
		logo,
		footer,
		labels,
		ref = $bindable(null),
		class: className = '',
		...rest
	}: Props = $props();

	const text = $derived<ResetPasswordCardLabels>({
		title: 'Choose a new password',
		description: 'Pick something you have not used before.',
		password: 'New password',
		confirmPassword: 'Confirm new password',
		passwordMismatch: 'The passwords do not match.',
		submit: 'Reset password',
		genericError: 'Something went wrong. Please try again.',
		doneTitle: 'Password updated',
		doneDescription: 'You can now sign in with your new password.',
		continue: 'Continue to sign in',
		expiredTitle: 'This link has expired',
		expiredDescription: 'Reset links stop working after a short time, or once used. Request a new one to continue.',
		requestNew: 'Request a new link',
		...labels
	});

	let submitted = $state(false);
	let password = $state('');
	let confirm = $state('');
	let confirmInput = $state<HTMLInputElement | null>(null);
	let doneTarget = $state<HTMLElement | null>(null);
	let doneHeading = $state<HTMLElement | null>(null);

	const submit = new AuthSubmit<{ password: string }, 'password' | 'confirmPassword'>({
		handler: () => {
			const handler = onSubmit;
			if (!handler) return undefined;
			return (values, context) => afterSuccess(handler(values, context), () => (submitted = true));
		},
		read: (data) => ({ password: readText(data, 'password', false) }),
		pending: () => pending,
		error: () => error,
		errors: () => errors,
		genericError: () => text.genericError
	});

	const showDone = $derived(done || submitted);
	const headingId = $props.id();
	const messageId = `${headingId}-message`;

	// The browser owns the mismatch message: while the two differ, the confirm field is invalid and the submit is blocked.
	$effect(() => {
		confirmInput?.setCustomValidity(confirm !== '' && confirm !== password ? text.passwordMismatch : '');
	});

	// The success state replaces the form, so focus would be lost with it: move it to what to do next.
	$effect(() => {
		const target = doneTarget ?? doneHeading;
		if (target) void tick().then(() => target.focus());
	});

	const HEADING = cn(SURFACE.heading, 'm-0 text-lg focus:outline-none');
</script>

<AuthCard
	class={cn('', className)}
	title={showDone || expired ? undefined : (title ?? text.title)}
	description={showDone || expired ? undefined : (description ?? text.description)}
	{headingLevel}
	{logo}
	{footer}
>
	{#if showDone}
		<div class="grid gap-5">
			<div class="grid justify-items-center gap-2 text-center">
				<svelte:element this={`h${headingLevel}`} id={headingId} bind:this={doneHeading} tabindex={-1} class={HEADING}>{text.doneTitle}</svelte:element>
				<p id={messageId} class={cn(SURFACE.description, 'm-0 text-[13px]')}>{text.doneDescription}</p>
			</div>
			{#if signInHref !== undefined}
				<Button bind:ref={doneTarget} variant="primary" size="lg" href={signInHref} aria-describedby="{headingId} {messageId}" onclick={() => onContinue?.()}>{text.continue}</Button>
			{:else if onContinue}
				<Button bind:ref={doneTarget} variant="primary" size="lg" aria-describedby="{headingId} {messageId}" onclick={() => onContinue()}>{text.continue}</Button>
			{/if}
		</div>
	{:else if expired}
		<div class="grid gap-5">
			<div class="grid justify-items-center gap-2 text-center">
				<svelte:element this={`h${headingLevel}`} class={HEADING}>{text.expiredTitle}</svelte:element>
				<p class={cn(SURFACE.description, 'm-0 text-[13px]')}>{text.expiredDescription}</p>
			</div>
			{#if forgotHref !== undefined}
				<Button variant="primary" size="lg" href={forgotHref}>{text.requestNew}</Button>
			{/if}
		</div>
	{:else}
		<form {...rest} bind:this={ref} method="post" {action} onsubmit={submit.onsubmit} oninput={submit.oninput} class="grid gap-4">
			{#each Object.entries(hidden ?? {}) as [name, value] (name)}
				<input type="hidden" {name} {value} />
			{/each}
			{#if email}
				<input type="text" name="email" autocomplete="username" hidden value={email} />
			{/if}
			{#if submit.error}
				<Alert tone="danger" live data-auth-error tabindex={-1} description={submit.error} />
			{/if}
			<Field label={text.password} error={submit.fieldError('password')} required>
				<PasswordInput bind:value={password} name="password" autocomplete="new-password" {minlength} {rules} {strength} />
			</Field>
			<Field label={text.confirmPassword} error={submit.fieldError('confirmPassword')} required>
				<PasswordInput bind:value={confirm} bind:ref={confirmInput} name="confirmPassword" autocomplete="new-password" {minlength} />
			</Field>
			<Button type="submit" variant="primary" size="lg" loading={submit.pending}>{text.submit}</Button>
		</form>
	{/if}
</AuthCard>
