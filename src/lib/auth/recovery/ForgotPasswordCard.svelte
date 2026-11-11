<script lang="ts" module>
	/** Every word the forgot-password screen shows or announces. */
	export interface ForgotPasswordCardLabels {
		title: string;
		description: string;
		email: string;
		submit: string;
		/** Shown when the submit handler throws or rejects. */
		genericError: string;
		sentTitle: string;
		/** The confirmation. It must not reveal whether the account exists. `email` is empty when unknown. */
		sent: (email: string) => string;
		resend: string;
		/** The resend button's text while the server's wait runs. */
		resendIn: (seconds: number) => string;
		/** Polite note after a resend went out. */
		resent: string;
		backToSignIn: string;
	}
</script>

<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import type { HTMLFormAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { SURFACE } from '../../ui/styles';
	import { Alert } from '../../primitives/display';
	import { Button } from '../../primitives/actions';
	import { Field, Input } from '../../primitives/form';
	import { AuthCard } from '../fields';
	import { AuthSubmit, Cooldown, readText, type AuthSubmitHandler } from '../shared';
	import type { TimeInput } from '../../core/time';
	import { afterSuccess } from './result';

	export interface Props extends Omit<HTMLFormAttributes, 'class' | 'children' | 'title' | 'hidden' | 'onsubmit' | 'oninput' | 'method'> {
		/** Called with the email. Without it the form posts natively to `action`. Return an `AuthResult` to show errors. */
		onSubmit?: AuthSubmitHandler<{ email: string }, 'email'>;
		/** Where a native post goes. */
		action?: string;
		/** Controlled pending state (wins over the handler's own). */
		pending?: boolean;
		/** Form-level error, e.g. from a server form action. */
		error?: string;
		/** Field errors, keyed by field name. */
		errors?: { email?: string };
		/** Extra values for the post, rendered as hidden inputs. */
		hidden?: Record<string, string>;
		/** Starting value of the email field. */
		email?: string;
		/** Shows the confirmation. Set it when a native post comes back. A successful `onSubmit` shows it on its own. */
		sent?: boolean;
		/** Resends the link (shows a Resend button on the confirmation). A returned promise shows loading; a rejection shows `labels.genericError`. */
		onResend?: () => unknown;
		/** When the server's resend wait ends. The button counts down until then. */
		resendAvailableAt?: TimeInput;
		/** Where "Back to sign in" goes (a link). */
		signInHref?: string;
		/** Runs when "Back to sign in" is chosen (also with a `signInHref`). */
		onBack?: () => void;
		/** Heading text. Defaults to `labels.title`. */
		title?: string;
		/** Line under the heading. Defaults to `labels.description`. */
		description?: string;
		/** Heading level of the title. Default 1. */
		headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
		logo?: Snippet;
		footer?: Snippet;
		/** Words, merged over the English defaults. */
		labels?: Partial<ForgotPasswordCardLabels>;
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
		email = '',
		sent = false,
		onResend,
		resendAvailableAt,
		signInHref,
		onBack,
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

	const text = $derived<ForgotPasswordCardLabels>({
		title: 'Forgot your password?',
		description: 'Enter your email and we will send you a link to reset it.',
		email: 'Email',
		submit: 'Send reset link',
		genericError: 'Something went wrong. Please try again.',
		sentTitle: 'Check your email',
		sent: (address) => `If an account exists for ${address || 'that address'}, we sent a link to reset the password.`,
		resend: 'Resend email',
		resendIn: (seconds) => `Resend in ${seconds}s`,
		resent: 'We sent the link again.',
		backToSignIn: 'Back to sign in',
		...labels
	});

	let submitted = $state(false);
	let sentTo = $state('');
	let resending = $state(false);
	let resendError = $state(false);
	let resent = $state(false);
	let heading = $state<HTMLElement | null>(null);

	const submit = new AuthSubmit<{ email: string }, 'email'>({
		handler: () => {
			const handler = onSubmit;
			if (!handler) return undefined;
			return (values, context) =>
				afterSuccess(handler(values, context), () => {
					sentTo = values.email;
					submitted = true;
				});
		},
		read: (data) => ({ email: readText(data, 'email') }),
		pending: () => pending,
		error: () => error,
		errors: () => errors,
		genericError: () => text.genericError
	});

	const cooldown = new Cooldown(() => resendAvailableAt);
	const messageId = $props.id();

	const showSent = $derived(sent || submitted);
	const address = $derived(sentTo || email);

	// The confirmation replaces the form, so focus would be lost with it: move it to the new heading.
	$effect(() => {
		const target = heading;
		if (target) void tick().then(() => target.focus());
	});

	async function resend(): Promise<void> {
		if (resending || cooldown.active) return;
		resendError = false;
		resent = false;
		resending = true;
		try {
			await onResend?.();
			resent = true;
		} catch {
			resendError = true;
		} finally {
			resending = false;
		}
	}
</script>

<AuthCard class={cn('', className)} title={showSent ? undefined : (title ?? text.title)} description={showSent ? undefined : (description ?? text.description)} {headingLevel} {logo} {footer}>
	{#if showSent}
		<div class="grid gap-5">
			<div class="grid justify-items-center gap-2 text-center">
				<svelte:element this={`h${headingLevel}`} bind:this={heading} tabindex={-1} class={cn(SURFACE.heading, 'm-0 text-lg focus:outline-none')}>{text.sentTitle}</svelte:element>
				<p id={messageId} class={cn(SURFACE.description, 'm-0 text-[13px]')}>{text.sent(address)}</p>
			</div>
			{#if resendError}
				<Alert tone="danger" live description={text.genericError} />
			{/if}
			<p role="status" class="m-0 text-center text-xs font-medium text-fg-main empty:hidden">{resent ? text.resent : ''}</p>
			<div class="grid gap-2">
				{#if onResend}
					<Button variant="secondary" size="lg" loading={resending} disabled={cooldown.active} onclick={resend}>
						{cooldown.active ? text.resendIn(cooldown.remaining) : text.resend}
					</Button>
				{/if}
				{#if signInHref !== undefined}
					<Button variant="ghost" size="lg" href={signInHref} onclick={() => onBack?.()}>{text.backToSignIn}</Button>
				{:else if onBack}
					<Button variant="ghost" size="lg" onclick={() => onBack()}>{text.backToSignIn}</Button>
				{/if}
			</div>
		</div>
	{:else}
		<form {...rest} bind:this={ref} method="post" {action} onsubmit={submit.onsubmit} oninput={submit.oninput} class="grid gap-4">
			{#each Object.entries(hidden ?? {}) as [name, value] (name)}
				<input type="hidden" {name} {value} />
			{/each}
			{#if submit.error}
				<Alert tone="danger" live data-auth-error tabindex={-1} description={submit.error} />
			{/if}
			<Field label={text.email} error={submit.fieldError('email')} required>
				<Input type="email" name="email" autocomplete="email" defaultValue={email} />
			</Field>
			<Button type="submit" variant="primary" size="lg" loading={submit.pending}>{text.submit}</Button>
		</form>
	{/if}
</AuthCard>
