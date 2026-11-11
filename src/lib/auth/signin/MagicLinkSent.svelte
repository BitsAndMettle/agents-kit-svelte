<script lang="ts" module>
	import type { AuthSubmitHandler } from '../shared';

	/** Every word the screen shows or announces. */
	export interface MagicLinkSentLabels {
		title: string;
		/** The line under the title. Keep it neutral: do not reveal whether the address has an account. */
		description: (email: string) => string;
		/** Label of the code field, when code entry is on. */
		code: string;
		/** Button that submits the code. */
		verify: string;
		resend: string;
		/** Button text while the resend wait runs. */
		resendIn: (seconds: number) => string;
		/** Polite confirmation after a resend. */
		sent: string;
		/** Shown when the resend failed. */
		resendFailed: string;
		/** The "Use a different email" button. */
		back: string;
		/** Shown when the code handler throws or rejects. */
		genericError: string;
	}

	/** What `onSubmit` receives. */
	export interface MagicLinkCodeValues {
		code: string;
	}

	/** Field names an error can be keyed by. */
	export type MagicLinkField = 'code';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { MailCheck } from '@lucide/svelte';
	import { cn } from '../../ui/cn';
	import type { TimeInput } from '../../core/time';
	import { Button } from '../../primitives/actions';
	import { Alert } from '../../primitives/display';
	import { READABLE_TONE_TEXT } from '../../primitives/display/helpers';
	import { Field } from '../../primitives/form';
	import { AuthCard, OtpInput } from '../fields';
	import { AuthSubmit, Cooldown, readText } from '../shared';
	import { LINK_CLASS, isThenable } from './look';

	export interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children' | 'title' | 'hidden' | 'onsubmit' | 'oninput'> {
		/** The address the link or code was sent to. */
		email: string;
		/** Heading of the card. */
		title?: string;
		/** Replaces the line under the title. */
		description?: string;
		/** Heading level of the title (1 by default: an auth screen is usually the page's main heading). */
		headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
		/** Your logo or mark, above the title. A mail icon is used without it. */
		logo?: Snippet;
		/** A line at the bottom of the card. */
		footer?: Snippet;
		/** Choosing "Resend". Return a promise to show loading on the button; a rejection shows a failure message. */
		onResend?: () => unknown;
		/** When the next resend is allowed (from your server's response). The button waits until then. */
		resendAvailableAt?: TimeInput;
		/** Shows a "Use a different email" button that calls this. */
		onBack?: () => void;
		/** Length of the code in the email. Set it when the email holds a code as well as a link: a code form appears. */
		codeLength?: number;
		/** Submits the code form as soon as the code is complete. */
		autoSubmit?: boolean;
		/** Receives `{ code }`. With it the native post is cancelled; return an `AuthResult` to show errors. */
		onSubmit?: AuthSubmitHandler<MagicLinkCodeValues, MagicLinkField>;
		/** Where the code form posts without `onSubmit`. */
		action?: string;
		/** Controlled pending state of the code form. */
		pending?: boolean;
		/** Form-level error of the code form. */
		error?: string;
		/** Per-field errors of the code form. */
		errors?: Partial<Record<MagicLinkField, string>>;
		/** Hidden inputs the code form posts (a challenge id). */
		hidden?: Record<string, string>;
		/** Words, merged over the English defaults. */
		labels?: Partial<MagicLinkSentLabels>;
		/** The `<form>` (with code entry) or `<div>` holding the content. Bindable. */
		ref?: HTMLElement | null;
		/** Classes for the card. */
		class?: string;
	}

	let {
		email,
		title,
		description,
		headingLevel,
		logo,
		footer,
		onResend,
		resendAvailableAt,
		onBack,
		codeLength,
		autoSubmit = false,
		onSubmit,
		action,
		pending,
		error,
		errors,
		hidden,
		labels,
		ref = $bindable(null),
		class: className = '',
		...rest
	}: Props = $props();

	const text = $derived<MagicLinkSentLabels>({
		title: 'Check your email',
		description: (address) => `If an account can use ${address}, we sent a sign-in link there.`,
		code: 'Code from the email',
		verify: 'Verify code',
		resend: 'Resend email',
		resendIn: (seconds) => `Resend in ${seconds}s`,
		sent: 'Sent again',
		resendFailed: 'The email could not be sent. Try again.',
		back: 'Use a different email',
		genericError: 'Something went wrong. Try again.',
		...labels
	});

	const submit = new AuthSubmit<MagicLinkCodeValues, MagicLinkField>({
		handler: () => onSubmit,
		read: (data) => ({ code: readText(data, 'code', false) }),
		pending: () => pending,
		error: () => error,
		errors: () => errors,
		genericError: () => text.genericError
	});

	const cooldown = new Cooldown(() => resendAvailableAt);
	let resending = $state(false);
	let outcome = $state<'sent' | 'failed' | null>(null);

	let resendRef = $state<HTMLElement | null>(null);
	// Button sets its own aria-disabled (for loading) after spreading ours, so a wait is marked here. The button
	// stays enabled so keyboard focus is not dropped; resend() ignores presses while the wait runs.
	$effect(() => {
		const wait = cooldown.active;
		const busy = resending;
		if (!resendRef) return;
		if (wait) resendRef.setAttribute('aria-disabled', 'true');
		else if (!busy) resendRef.removeAttribute('aria-disabled');
	});

	async function resend(): Promise<void> {
		if (resending || cooldown.active) return;
		outcome = null;
		try {
			const result = onResend?.();
			if (isThenable(result)) {
				resending = true;
				await result;
			}
			outcome = 'sent';
		} catch {
			outcome = 'failed';
		} finally {
			resending = false;
		}
	}
</script>

{#snippet mark()}
	<MailCheck aria-hidden="true" />
{/snippet}

{#snippet content()}
	{#if codeLength}
		{#each Object.entries(hidden ?? {}) as [name, value] (name)}
			<input type="hidden" {name} {value} />
		{/each}
		{#if submit.error}
			<Alert tone="danger" live description={submit.error} data-auth-error tabindex={-1} />
		{/if}
		<Field label={text.code} error={submit.fieldError('code')} required>
			<OtpInput length={codeLength} groupSize={codeLength % 3 === 0 ? 3 : codeLength % 4 === 0 ? 4 : 0} {autoSubmit} />
		</Field>
		<Button type="submit" variant="primary" size="lg" loading={submit.pending} class="w-full">{text.verify}</Button>
	{/if}
	<div class="grid justify-items-center gap-2">
		<Button variant="secondary" loading={resending} bind:ref={resendRef} class={cooldown.active ? 'cursor-not-allowed opacity-50' : ''} onclick={resend}>
			{cooldown.active ? text.resendIn(cooldown.remaining) : text.resend}
		</Button>
		<span role="status" class="text-xs font-medium text-fg-main">{outcome === 'sent' ? text.sent : ''}</span>
		{#if outcome === 'failed'}<span role="alert" class={cn('text-xs font-medium', READABLE_TONE_TEXT.danger)}>{text.resendFailed}</span>{/if}
		{#if onBack}
			<button type="button" onclick={() => onBack?.()} class={cn(LINK_CLASS, 'text-[13px]')}>{text.back}</button>
		{/if}
	</div>
{/snippet}

<AuthCard class={cn('w-full', className)} title={title ?? text.title} description={description ?? text.description(email)} {headingLevel} logo={logo ?? mark} {footer}>
	{#if codeLength}
		<form {...rest} bind:this={ref} {action} method="post" onsubmit={submit.onsubmit} oninput={submit.oninput} class="grid gap-4">
			{@render content()}
		</form>
	{:else}
		<div {...rest} bind:this={ref} class="grid gap-4">
			{@render content()}
		</div>
	{/if}
</AuthCard>
