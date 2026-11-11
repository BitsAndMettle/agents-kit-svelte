<script lang="ts">
	import { untrack } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { READABLE_TONE_TEXT } from '../../primitives/display/helpers';
	import { Check, Circle, Eye, EyeOff, TriangleAlert } from '@lucide/svelte';
	import { cn } from '../../ui/cn';
	import { INPUT_CLASS, TONE_FILL_CLASS, type UiTone } from '../../ui/styles';
	import { IconButton } from '../../primitives/actions';
	import { fieldControlAttrs, getFieldContext, type FormControlSize } from '../../primitives/form';
	import { joinIds } from '../../primitives/form/field';
	import { defaultRulesSummary, evaluateRules, type PasswordRule } from './password';

	export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

	export interface Props extends Omit<HTMLInputAttributes, 'class' | 'children' | 'size' | 'value' | 'defaultValue' | 'type' | 'minlength'> {
		/** The password. Bindable. */
		value?: string;
		/** Starting value when `value` is not given, and what a form reset restores. */
		defaultValue?: string;
		/** Field name in the form post. */
		name?: string;
		minlength?: number;
		size?: FormControlSize;
		/** Marks the input invalid (a surrounding Field with an error does too). */
		invalid?: boolean;
		/** Called with the new text on every edit. */
		onValueChange?: (value: string) => void;
		/** Accessible name of the reveal button while the password is hidden. */
		showLabel?: string;
		/** Accessible name of the reveal button while the password is shown. */
		hideLabel?: string;
		/** Warning shown, and announced politely, while Caps Lock is on and the input has focus. */
		capsLockLabel?: string;
		/** Requirements shown as a checklist under the input. `test` gets the current value. */
		rules?: PasswordRule[];
		/** Screen-reader text for a met rule. */
		metLabel?: string;
		/** Screen-reader text for an unmet rule. */
		unmetLabel?: string;
		/** The quiet progress line announced a moment after typing stops, and only when the count changed. */
		rulesSummary?: (met: number, total: number) => string;
		/** A score you work out (the kit does not judge passwords): 0 (very weak) to 4 (strong). */
		strength?: PasswordStrength;
		/** Words for the five levels, from 0 to 4. */
		strengthLabels?: [string, string, string, string, string];
		/** Name of the strength meter, read before the level. */
		strengthTitle?: string;
		/** The `<input>` element. Bindable. */
		ref?: HTMLInputElement | null;
		class?: string;
	}

	let {
		defaultValue,
		value = $bindable(defaultValue ?? ''),
		name = 'password',
		autocomplete = 'current-password',
		minlength,
		size = 'md',
		invalid = false,
		onValueChange,
		showLabel = 'Show password',
		hideLabel = 'Hide password',
		capsLockLabel = 'Caps Lock is on',
		rules,
		metLabel = 'met',
		unmetLabel = 'not met',
		rulesSummary = defaultRulesSummary,
		strength,
		strengthLabels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'],
		strengthTitle = 'Password strength',
		ref = $bindable(null),
		id,
		required,
		disabled,
		'aria-describedby': describedBy,
		class: className = '',
		...rest
	}: Props = $props();

	const uid = $props.id();
	const field = getFieldContext();
	const initialValue = untrack(() => value);
	const rulesId = `${uid}-rules`;
	const strengthId = `${uid}-strength`;
	const control = $derived(
		fieldControlAttrs(field, {
			id,
			describedBy: joinIds(describedBy, rules?.length ? rulesId : undefined, strength !== undefined ? strengthId : undefined),
			invalid,
			required: Boolean(required),
			disabled: Boolean(disabled)
		})
	);

	let revealed = $state(false);
	let focused = $state(false);
	let capsOn = $state(false);

	const results = $derived(rules ? evaluateRules(rules, value) : []);
	const metCount = $derived(results.filter(Boolean).length);

	// The checklist is not a live region: a screen reader reads it as the input's description. This quiet
	// line is announced once typing pauses, and only when the number of met rules changed.
	let summary = $state('');
	$effect(() => {
		if (!rules?.length) return;
		const text = rulesSummary(metCount, rules.length);
		const timer = setTimeout(() => {
			summary = text;
		}, 900);
		return () => clearTimeout(timer);
	});

	// Reveal goes back to hidden when the owning form submits or resets.
	$effect(() => {
		const form = ref?.form;
		if (!form) return;
		const hide = () => {
			revealed = false;
		};
		form.addEventListener('submit', hide);
		form.addEventListener('reset', hide);
		return () => {
			form.removeEventListener('submit', hide);
			form.removeEventListener('reset', hide);
		};
	});

	const SIZES: Record<FormControlSize, string> = {
		sm: 'h-7 px-2.5 text-xs gap-1.5',
		md: 'h-8 px-3 text-[13px] gap-2',
		lg: 'h-10 px-3.5 text-sm gap-2'
	};
	const BOX = INPUT_CLASS.replaceAll('focus:', 'focus-within:');

	const strengthTone = $derived<UiTone>(strength === undefined || strength <= 1 ? 'danger' : strength === 2 ? 'warning' : 'success');

	function sync(event: KeyboardEvent): void {
		capsOn = event.getModifierState?.('CapsLock') ?? false;
	}
</script>

<div class={cn('grid gap-2', className)}>
	<div
		data-invalid={control['aria-invalid'] ? '' : undefined}
		data-disabled={control.disabled ? '' : undefined}
		class={cn('relative flex items-center', BOX, SIZES[size], 'data-invalid:border-status-danger/70 data-disabled:opacity-50 data-disabled:cursor-not-allowed')}
	>
		<input {...rest}
			{...control}
			bind:this={ref}
			bind:value
			defaultValue={defaultValue ?? initialValue}
			{name}
			{autocomplete}
			{minlength}
			type={revealed ? 'text' : 'password'}
			autocapitalize="off"
			autocorrect="off"
			spellcheck="false"
			oninput={(event) => {
				onValueChange?.(event.currentTarget.value);
				rest.oninput?.(event);
			}}
			onkeydown={(event) => {
				sync(event);
				rest.onkeydown?.(event);
			}}
			onkeyup={(event) => {
				sync(event);
				rest.onkeyup?.(event);
			}}
			onfocus={(event) => {
				focused = true;
				rest.onfocus?.(event);
			}}
			onblur={(event) => {
				focused = false;
				capsOn = false;
				rest.onblur?.(event);
			}}
			class="h-full w-full min-w-0 flex-1 bg-transparent text-fg-main placeholder:text-fg-light focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed"
		/>
		<IconButton
			aria-label={revealed ? hideLabel : showLabel}
			aria-pressed={revealed}
			size="icon-xs"
			disabled={control.disabled}
			onclick={() => (revealed = !revealed)}
			class="-mr-1.5"
		>
			{#if revealed}<EyeOff aria-hidden="true" />{:else}<Eye aria-hidden="true" />{/if}
		</IconButton>
	</div>

	<p aria-live="polite" class={cn('m-0 flex items-center gap-1.5 text-xs', READABLE_TONE_TEXT.warning, !(capsOn && focused) && '-mt-2')}>
		{#if capsOn && focused}<TriangleAlert aria-hidden="true" class="size-3.5 shrink-0" /><span>{capsLockLabel}</span>{/if}
	</p>

	{#if rules?.length}
		<ul id={rulesId} class="m-0 grid list-none gap-1 p-0 text-xs text-fg-light">
			{#each rules as rule, i (i)}
				{@const met = results[i]}
				<li data-met={met ? '' : undefined} class={cn('flex items-center gap-1.5', met && 'text-fg-main')}>
					{#if met}
						<Check aria-hidden="true" class="size-3.5 shrink-0 text-status-success" />
					{:else}
						<Circle aria-hidden="true" class="size-3.5 shrink-0" />
					{/if}
					<span>{rule.label}<span class="sr-only">: {met ? metLabel : unmetLabel}</span></span>
				</li>
			{/each}
		</ul>
		<span role="status" class="sr-only">{summary}</span>
	{/if}

	{#if strength !== undefined}
		<div class="flex items-center gap-2 text-xs text-fg-light">
			<span aria-hidden="true" class="grid flex-1 grid-cols-4 gap-1">
				{#each [1, 2, 3, 4] as step (step)}
					<span class={cn('h-1.5 rounded-full bg-canvas-secondary', step <= strength && TONE_FILL_CLASS[strengthTone])}></span>
				{/each}
			</span>
			<span id={strengthId}>{strengthTitle}: {strengthLabels[strength]}</span>
		</div>
	{/if}
</div>
