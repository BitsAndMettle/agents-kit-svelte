# Auth conventions

The Auth collection draws sign-in, sign-up, recovery, verification and account screens. **It holds no auth logic.** It never calls a server, reads or stores a credential, generates a secret or QR code, calls WebAuthn, or keeps a token. Each component renders native, accessible UI and reports what the person asked for through callbacks (or a native form post). Your app does the rest.

Everything in `docs/primitives/CONVENTIONS.md` applies too. Auth components are built from the Primitives (`Field`, `Input`, `Button`, `Card`, `Alert`, `Avatar`, `DropdownMenu`, `AlertDialog`, ...), never from new hand-rolled controls.

## Forms

- Every component that collects input renders a real `<form method="post">`. `action` passes through, so with no JavaScript (or no `onSubmit`) the form posts natively, which is how a server form action works.
- `...rest` and `ref` go on the `<form>`, so attributes and attachments reach it: in SvelteKit, `{@attach fromAction(enhance)}` (from `svelte/attachments` and `$app/forms`) adds progressive enhancement. `class` goes on the outer card.
- `onSubmit(values, { data, event })` receives typed values. With it, the native submit is cancelled. Return or resolve to `AuthResult` (`{ error?, errors? }`) to show errors; return nothing on success. While a returned promise is pending, the submit button shows `loading` and further submits are ignored. A rejection shows `labels.genericError`, never the thrown message.
- `pending` (controlled) overrides the handler's own pending state, for callers who manage it (SvelteKit `enhance`). While it is true, a submit is stopped before later listeners see it, so `enhance` never posts twice. A plain native post with neither a handler nor `pending` is not guarded.
- A state that follows a successful submit ("we sent a link") hangs off `AuthSubmit`'s `onSuccess` option, plus a prop (`sent`, `done`) for native posts that come back. After `clear()`, a submit still in flight is forgotten when it settles.
- `error` (form-level) and `errors` (per field, keyed by field name) props show server errors. A handler result wins until the next submit. Editing a field clears that field's error.
- All of the above is `AuthSubmit` in `src/lib/auth/shared/submit.svelte.ts`. Use it and never re-implement it. Bind its `onsubmit` and `oninput` on the form. Show `submit.error` in an `Alert` with `tone="danger"`, `live`, and `data-auth-error` plus `tabindex="-1"` on its root, so focus can land on it. Pass `submit.fieldError(name)` to each `Field`'s `error`.
- Validation is native: `required`, `type="email"`, `minlength`, `pattern`. Browsers block the submit and focus the field. No JavaScript validation layer.
- Passwords and codes are read with `readText(data, name, false)` (spaces kept). Other text is trimmed.

## Field names and autocomplete

Fixed names, so server actions and password managers can rely on them:

| Field | `name` | `type` / attributes | `autocomplete` |
|---|---|---|---|
| Email (sign-in) | `email` | `email` | `username` (`username webauthn` when passkeys are offered) |
| Email (sign-up, forgot) | `email` | `email` | `email` |
| Password (sign-in) | `password` | `password` | `current-password` |
| New password (sign-up, reset) | `password` | `password`, `minlength` from props | `new-password` |
| Confirm password | `confirmPassword` | `password` | `new-password` |
| Name | `name` | `text` | `name` |
| One-time code | `code` | `text`, `inputmode="numeric"` (unless alphanumeric) | `one-time-code` |
| Remember me | `remember` | checkbox | — |
| Terms accepted | `terms` | checkbox, `required` | — |

Hidden values the server needs (a reset token, a challenge id) come in through a `hidden` prop (`Record<string, string>`), rendered as hidden inputs.

## Words

Composite components have many strings, so they take one `labels` prop. It is a `Partial<XLabels>` merged over English defaults, and its type is exported as `XLabels`. Strings that need a value are functions (`resendIn: (seconds) => string`). A short component may still use separate `*Label` props like the Primitives. Default wording never reveals whether an account exists. For example, the "forgot password" confirmation says "If an account exists for …".

## Shared types

`AuthProvider` (`id`, `label`, `icon` as a component so provider lists can be plain data, `href`, `disabled`), `AuthUser` (`name`, `email`, `avatarSrc`), `AuthSession` (`id`, `label`, `kind`, `location`, `lastActive`, `current`), `AuthResult` and `AuthSubmitHandler` live in `src/lib/auth/shared/types.ts`. The kit ships **no brand logos**: providers take your `icon` component; `ProviderButton` also takes an `icon` snippet, and cards that list providers take a `providerIcon` snippet (`Snippet<[AuthProvider]>`) that wins over the component.

## Waits

Resend and retry waits are set by the server. Pass when they end (`resendAvailableAt`). Compute it in the browser from the server's wait in seconds (`Date.now() + retryAfter * 1000`), not from a server timestamp, so a skewed client clock cannot shorten or stretch it. `Cooldown` from `src/lib/auth/shared/cooldown.svelte.ts` counts down. The button takes `Button`'s `softDisabled` (focusable, `aria-disabled`; never `disabled`, which would drop keyboard focus to the page), keeps its name (`labels.resend`) so a screen reader is not told a new name every second, and points `aria-describedby` at a separate line showing `labels.resendIn(seconds)`.

## Callback names

`onSubmit` for a form's main submit. `on<Intent>` for everything else: `onProvider(id)`, `onPasskey()`, `onResend()`, `onRevoke(id)`, `onRevokeOthers()`, `onSignOut()`, `onBack()`, `onCopy()`, `onDownload()`, `onRegenerate()`, `onVerify(code)`, `onComplete(code)`. A callback may return a promise, and its button shows `loading` until the promise settles.

## Security hygiene

Never put a secret in a URL, a `data-*` attribute, the console, or storage. Password reveal resets to hidden on submit. One-time codes use `autocomplete="one-time-code"`. Backup codes and setup secrets are shown only as given, with copy and download done locally (clipboard, `Blob`), and never sent anywhere.
