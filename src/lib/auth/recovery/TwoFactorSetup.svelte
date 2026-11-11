<script lang="ts" module>
	/** The three steps of the setup: scan, verify, save backup codes. */
	export type TwoFactorStep = 1 | 2 | 3;

	/** Every word the two-factor setup shows or announces. */
	export interface TwoFactorSetupLabels {
		title: string;
		description: string;
		/** The step indicator, e.g. "Step 1 of 3". */
		step: (step: number, total: number) => string;
		scanTitle: string;
		scanDescription: string;
		/** Alternative text of the QR image given as `qrSrc`, when `qrAlt` is not set. */
		qrAlt: string;
		/** The disclosure that reveals the setup key. */
		manualEntry: string;
		manualDescription: string;
		/** Name of the setup key, read before it. */
		secret: string;
		issuer: string;
		account: string;
		copy: string;
		copied: string;
		copyFailed: string;
		next: string;
		verifyTitle: string;
		verifyDescription: string;
		code: string;
		verify: string;
		/** Shown when the verify handler throws or rejects. */
		genericError: string;
		back: string;
		cancel: string;
		backupTitle: string;
		/** The backup codes' own heading. */
		backupCodesTitle: string;
	}
</script>

<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import type { HTMLFormAttributes } from 'svelte/elements';
	import { Copy } from '@lucide/svelte';
	import { cn } from '../../ui/cn';
	import { SURFACE } from '../../ui/styles';
	import { Alert } from '../../primitives/display';
	import { Button } from '../../primitives/actions';
	import { Field } from '../../primitives/form';
	import { AuthCard, OtpInput } from '../fields';
	import { BackupCodes, type BackupCodesProps } from '../account';
	import { AuthSubmit, readText, type AuthSubmitHandler } from '../shared';
	import { afterSuccess } from './result';
	import { groupSecret, plainSecret } from './secret';
	import { copyText } from './clipboard';

	export interface Props extends Omit<HTMLFormAttributes, 'class' | 'children' | 'title' | 'hidden' | 'onsubmit' | 'oninput' | 'method'> {
		/** The current step. Bindable, so your app can set it (for example after a native post comes back). */
		step?: TwoFactorStep;
		/** The QR code your server made, as your own markup (an `<svg>`, an `<img>`). The kit never makes one. */
		qr?: Snippet;
		/** The QR code as an image address (a `data:` URL or a path), shown as an `<img>`. */
		qrSrc?: string;
		/** Alternative text of the QR image. Defaults to `labels.qrAlt`. */
		qrAlt?: string;
		/** The setup key your server made, for people who cannot scan. Shown in groups of four. */
		secret?: string;
		/** Who issues the code, shown with the key, e.g. your app's name. */
		issuer?: string;
		/** The account the code is for, shown with the key, e.g. an email. */
		account?: string;
		/** Called with the six-digit code. Without it the form posts natively to `action`. Return an `AuthResult` (`errors.code`) to show errors. */
		onVerify?: AuthSubmitHandler<{ code: string }, 'code'>;
		/** Where a native post goes. */
		action?: string;
		/** Controlled pending state (wins over the handler's own). */
		pending?: boolean;
		/** Form-level error, e.g. from a server form action. */
		error?: string;
		/** Field errors, keyed by field name. */
		errors?: { code?: string };
		/** Extra values for the post, rendered as hidden inputs. */
		hidden?: Record<string, string>;
		/** Backup codes your server made. With them, a successful verify goes on to a save step; without, it finishes. Bindable. */
		backupCodes?: string[];
		/** Extra props for the backup codes box (`filename`, `heading`, `onRegenerate`, ...). */
		backupCodesProps?: Partial<Omit<BackupCodesProps, 'codes'>>;
		/** Setup is finished: after a verify with no backup codes, or after the backup codes are confirmed. */
		onComplete?: () => void;
		/** Shows a Cancel button on the first two steps. */
		onCancel?: () => void;
		/** Heading text. Defaults to `labels.title`. */
		title?: string;
		/** Line under the heading. Defaults to `labels.description`. */
		description?: string;
		/** Heading level of the title. Default 1. */
		headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
		logo?: Snippet;
		footer?: Snippet;
		/** Words, merged over the English defaults. */
		labels?: Partial<TwoFactorSetupLabels>;
		/** The verify step's `<form>` element. Bindable. */
		ref?: HTMLFormElement | null;
		/** Classes for the card. */
		class?: string;
	}

	let {
		step = $bindable(1),
		qr,
		qrSrc,
		qrAlt,
		secret,
		issuer,
		account,
		onVerify,
		action,
		pending,
		error,
		errors,
		hidden,
		backupCodes = $bindable(),
		backupCodesProps,
		onComplete,
		onCancel,
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

	const text = $derived<TwoFactorSetupLabels>({
		title: 'Set up two-factor authentication',
		description: 'Add a second step to signing in, with an authenticator app.',
		step: (n, total) => `Step ${n} of ${total}`,
		scanTitle: 'Scan the QR code',
		scanDescription: 'Open your authenticator app and scan this code to add the account.',
		qrAlt: 'QR code to add this account to your authenticator app',
		manualEntry: "Can't scan? Enter this key",
		manualDescription: 'In your authenticator app, choose to enter a setup key, then type this one.',
		secret: 'Setup key',
		issuer: 'Issuer',
		account: 'Account',
		copy: 'Copy key',
		copied: 'Copied',
		copyFailed: 'The key could not be copied. Select it and copy by hand.',
		next: 'Next',
		verifyTitle: 'Enter the code',
		verifyDescription: 'Type the six-digit code your authenticator app shows now.',
		code: 'Verification code',
		verify: 'Verify',
		genericError: 'Something went wrong. Please try again.',
		back: 'Back',
		cancel: 'Cancel',
		backupTitle: 'Save your backup codes',
		backupCodesTitle: 'Backup codes',
		...labels
	});

	let heading = $state<HTMLElement | null>(null);
	let copyNote = $state('');
	let copyFailed = $state(false);
	let shown = step;

	const total = $derived(backupCodes?.length ? 3 : 2);
	const subLevel = $derived(Math.min(6, headingLevel + 1) as 2 | 3 | 4 | 5 | 6);
	const submit = new AuthSubmit<{ code: string }, 'code'>({
		handler: () => {
			const handler = onVerify;
			if (!handler) return undefined;
			return (values, context) =>
				afterSuccess(handler(values, context), () => {
					if (backupCodes?.length) step = 3;
					else onComplete?.();
				});
		},
		read: (data) => ({ code: readText(data, 'code', false) }),
		pending: () => pending,
		error: () => error,
		errors: () => errors,
		genericError: () => text.genericError
	});

	// A new step replaces the old one, so focus would be lost with it: move it to the new step's heading.
	$effect(() => {
		const current = step;
		if (current === shown) return;
		shown = current;
		void tick().then(() => heading?.focus());
	});

	async function copySecret(): Promise<void> {
		copyNote = '';
		copyFailed = false;
		if (await copyText(plainSecret(secret ?? ''))) copyNote = text.copied;
		else copyFailed = true;
	}

	const STEP_HEADING = cn(SURFACE.title, 'm-0 focus:outline-none');
	const STEP_TEXT = cn(SURFACE.description, 'm-0 text-[13px]');
</script>

<AuthCard class={cn('', className)} title={title ?? text.title} description={description ?? text.description} {headingLevel} {logo} {footer}>
	<div class="grid gap-4">
		<div class="grid gap-1">
			<p class="m-0 text-xs font-medium text-fg-light">{text.step(step, total)}</p>
			{#if step === 1}
				<svelte:element this={`h${subLevel}`} bind:this={heading} tabindex={-1} class={STEP_HEADING}>{text.scanTitle}</svelte:element>
				<p class={STEP_TEXT}>{text.scanDescription}</p>
			{:else if step === 2}
				<svelte:element this={`h${subLevel}`} bind:this={heading} tabindex={-1} class={STEP_HEADING}>{text.verifyTitle}</svelte:element>
				<p class={STEP_TEXT}>{text.verifyDescription}</p>
			{:else}
				<svelte:element this={`h${subLevel}`} bind:this={heading} tabindex={-1} class={STEP_HEADING}>{text.backupTitle}</svelte:element>
			{/if}
		</div>

		{#if step === 1}
			{#if qr || qrSrc}
				<div class="mx-auto flex size-44 items-center justify-center rounded-control border border-card-border bg-white p-2 text-black [&_img]:size-full [&_svg]:size-full">
					{#if qr}
						{@render qr()}
					{:else}
						<img src={qrSrc} alt={qrAlt ?? text.qrAlt} width="160" height="160" />
					{/if}
				</div>
			{/if}
			{#if secret}
				<details class="rounded-control border border-card-border bg-canvas-secondary/50 px-3 py-2 text-[13px]">
					<summary class="cursor-pointer list-none font-medium text-fg-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary [&::-webkit-details-marker]:hidden">{text.manualEntry}</summary>
					<div class="mt-2 grid gap-2">
						<p class={STEP_TEXT}>{text.manualDescription}</p>
						<div class="flex flex-wrap items-center gap-2">
							<code aria-label={text.secret} class="min-w-52 flex-1 break-words rounded-control bg-card-bg px-2.5 py-1.5 font-mono text-[13px] tracking-wider text-fg-main select-all">{groupSecret(secret)}</code>
							<Button size="sm" variant="secondary" onclick={copySecret}>
								{#snippet leading()}<Copy aria-hidden="true" />{/snippet}
								{text.copy}
							</Button>
						</div>
						<p role="status" class="m-0 min-h-4 text-xs font-medium text-fg-main">{copyNote}</p>
						{#if copyFailed}<Alert tone="danger" live description={text.copyFailed} />{/if}
						{#if issuer || account}
							<dl class="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
								{#if issuer}
									<dt class="text-fg-light">{text.issuer}</dt>
									<dd class="m-0 min-w-0 break-words text-fg-main">{issuer}</dd>
								{/if}
								{#if account}
									<dt class="text-fg-light">{text.account}</dt>
									<dd class="m-0 min-w-0 break-words text-fg-main">{account}</dd>
								{/if}
							</dl>
						{/if}
					</div>
				</details>
			{/if}
			<div class="grid gap-2">
				<Button variant="primary" size="lg" onclick={() => (step = 2)}>{text.next}</Button>
				{#if onCancel}<Button variant="ghost" size="lg" onclick={() => onCancel()}>{text.cancel}</Button>{/if}
			</div>
		{:else if step === 2}
			<form {...rest} bind:this={ref} method="post" {action} onsubmit={submit.onsubmit} oninput={submit.oninput} class="grid gap-4">
				{#each Object.entries(hidden ?? {}) as [name, value] (name)}
					<input type="hidden" {name} {value} />
				{/each}
				{#if submit.error}
					<Alert tone="danger" live data-auth-error tabindex={-1} description={submit.error} />
				{/if}
				<Field label={text.code} error={submit.fieldError('code')} required>
					<OtpInput name="code" groupSize={3} />
				</Field>
				<div class="grid gap-2">
					<Button type="submit" variant="primary" size="lg" loading={submit.pending}>{text.verify}</Button>
					<div class={cn('grid gap-2', onCancel ? 'grid-cols-2' : 'grid-cols-1')}>
						<Button variant="ghost" size="lg" onclick={() => (step = 1)}>{text.back}</Button>
						{#if onCancel}<Button variant="ghost" size="lg" onclick={() => onCancel()}>{text.cancel}</Button>{/if}
					</div>
				</div>
			</form>
		{:else}
			<BackupCodes
				requireAcknowledge
				headingLevel={Math.min(6, subLevel + 1) as 3 | 4 | 5 | 6}
				labels={{ title: text.backupCodesTitle }}
				{...backupCodesProps}
				codes={backupCodes ?? []}
				onConfirm={() => onComplete?.()}
			/>
		{/if}
	</div>
</AuthCard>
