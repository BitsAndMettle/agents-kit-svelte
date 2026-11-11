<script lang="ts" module>
	import type { AuthSubmitHandler } from '../shared';

	/** Every word the card shows. */
	export interface TwoFactorCardLabels {
		title: string;
		/** The line under the title while the authenticator code is asked for. */
		description: string;
		/** The line under the title while a backup code is asked for. */
		backupDescription: string;
		code: string;
		backupCode: string;
		/** Hint under the backup code field. */
		backupHint: string;
		verify: string;
		/** Button that switches to the backup code. */
		useBackup: string;
		/** Button that switches back to the authenticator code. */
		useAuthenticator: string;
		trustDevice: string;
		/** Divider above the passkey button. */
		or: string;
		/** Button that calls `onBack`. */
		back: string;
		/** Shown when the submit handler throws or rejects. */
		genericError: string;
	}

	/** Which kind of code was entered. */
	export type TwoFactorMethod = 'totp' | 'backup';

	/** What `onSubmit` receives. `trustDevice` is false when the checkbox is not shown. */
	export interface TwoFactorValues {
		code: string;
		method: TwoFactorMethod;
		trustDevice: boolean;
	}

	/** Field names an error can be keyed by. */
	export type TwoFactorField = 'code';
</script>

<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import type { HTMLFormAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { Button } from '../../primitives/actions';
	import { Alert, Separator } from '../../primitives/display';
	import { Checkbox, Field, Input } from '../../primitives/form';
	import { AuthCard, OtpInput, PasskeyButton } from '../fields';
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
		/** A line at the bottom of the card. */
		footer?: Snippet;
		/** Length of the authenticator code. */
		codeLength?: number;
		/** Shows a "Trust this device" checkbox (field `trustDevice`). */
		showTrustDevice?: boolean;
		/** Shows a passkey button as another way through this step. Run your own WebAuthn here. */
		onPasskey?: () => void | Promise<unknown>;
		/** Shows a "Sign in another way" button that calls this. */
		onBack?: () => void;
		/** Submits as soon as an authenticator code is complete. */
		autoSubmit?: boolean;
		/** Receives `{ code, method, trustDevice }`. With it the native post is cancelled; return an `AuthResult` to show errors. */
		onSubmit?: AuthSubmitHandler<TwoFactorValues, TwoFactorField>;
		/** Where the form posts without `onSubmit`. The hidden `method` field says which kind of code was used. */
		action?: string;
		/** Controlled pending state (e.g. from SvelteKit `enhance`). */
		pending?: boolean;
		/** Form-level error, e.g. from a server action. */
		error?: string;
		/** Per-field errors, keyed by field name. */
		errors?: Partial<Record<TwoFactorField, string>>;
		/** Hidden inputs the server needs (a challenge id). */
		hidden?: Record<string, string>;
		/** Words, merged over the English defaults. */
		labels?: Partial<TwoFactorCardLabels>;
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
		codeLength = 6,
		showTrustDevice = false,
		onPasskey,
		onBack,
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

	const text = $derived<TwoFactorCardLabels>({
		title: 'Two-step verification',
		description: 'Enter the code from your authenticator app.',
		backupDescription: 'Enter one of your backup codes. Each works once.',
		code: 'Authentication code',
		backupCode: 'Backup code',
		backupHint: 'Letters and numbers, as saved when you set up two-step verification.',
		verify: 'Verify',
		useBackup: 'Use a backup code instead',
		useAuthenticator: 'Use an authentication code instead',
		trustDevice: 'Trust this device',
		or: 'or',
		back: 'Sign in another way',
		genericError: 'Something went wrong. Try again.',
		...labels
	});

	let mode = $state<TwoFactorMethod>('totp');
	let otpRef = $state<HTMLInputElement | null>(null);
	let backupRef = $state<HTMLInputElement | null>(null);

	const submit = new AuthSubmit<TwoFactorValues, TwoFactorField>({
		handler: () => onSubmit,
		read: (data) => {
			const method: TwoFactorMethod = readText(data, 'method') === 'backup' ? 'backup' : 'totp';
			return { code: readText(data, 'code', method === 'totp'), method, trustDevice: readCheck(data, 'trustDevice') };
		},
		pending: () => pending,
		error: () => error,
		errors: () => errors,
		genericError: () => text.genericError
	});

	/** Swaps the code control and moves focus into the new one, so the person can keep typing. */
	async function switchMode(): Promise<void> {
		mode = mode === 'totp' ? 'backup' : 'totp';
		submit.clear();
		await tick();
		(mode === 'backup' ? backupRef : otpRef)?.focus();
	}
</script>

<AuthCard class={cn('w-full', className)} title={title ?? text.title} description={description ?? (mode === 'totp' ? text.description : text.backupDescription)} {headingLevel} {logo} {footer}>
	<form {...rest} bind:this={ref} {action} method="post" onsubmit={submit.onsubmit} oninput={submit.oninput} class="grid gap-4">
		{#each Object.entries(hidden ?? {}) as [name, value] (name)}
			<input type="hidden" {name} {value} />
		{/each}
		<input type="hidden" name="method" value={mode} />
		{#if submit.error}
			<Alert tone="danger" live description={submit.error} data-auth-error tabindex={-1} />
		{/if}
		{#if mode === 'totp'}
			<Field label={text.code} error={submit.fieldError('code')} required>
				<OtpInput bind:ref={otpRef} length={codeLength} groupSize={codeLength % 3 === 0 ? 3 : codeLength % 4 === 0 ? 4 : 0} {autoSubmit} />
			</Field>
		{:else}
			<Field label={text.backupCode} description={text.backupHint} error={submit.fieldError('code')} required>
				<Input bind:ref={backupRef} name="code" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" />
			</Field>
		{/if}
		{#if showTrustDevice}
			<Checkbox name="trustDevice" label={text.trustDevice} />
		{/if}
		<Button type="submit" variant="primary" size="lg" loading={submit.pending} class="w-full">{text.verify}</Button>
		<button type="button" onclick={switchMode} class={cn(LINK_CLASS, 'justify-self-center text-[13px]')}>
			{mode === 'totp' ? text.useBackup : text.useAuthenticator}
		</button>
	</form>
	{#if onPasskey}
		<Separator label={text.or} />
		<PasskeyButton {onPasskey} />
	{/if}
	{#if onBack}
		<button type="button" onclick={() => onBack?.()} class={cn(LINK_CLASS, 'justify-self-center text-[13px]')}>{text.back}</button>
	{/if}
</AuthCard>
