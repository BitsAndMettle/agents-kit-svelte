import type { CatalogItemMeta } from '../catalog-registry.ts';

const UPSTREAM = 'Agents Kit Svelte · Auth';

/** Catalogue entries for the Auth collection. Account: AccountMenu, SessionList, VerifyEmailBanner, BackupCodes. Category: 'Auth'. */
export const AUTH_ACCOUNT: CatalogItemMeta[] = [
	{
		slug: 'account-menu',
		name: 'AccountMenu',
		category: 'Auth',
		sveltePath: 'src/lib/auth/account/AccountMenu.svelte',
		upstreamSource: UPSTREAM,
		description:
			"The signed-in person's menu, built on DropdownMenu: an avatar button (initials without an image, optionally with the name) that opens a header with name and email, your own rows (links, icons, separators and tones all work), and a final Sign out. It reports Sign out through onSignOut; your app ends the session.",
		usageSnippet: `<script lang="ts">
  import { AccountMenu, type AuthUser } from 'agents-kit-svelte/auth';
  import type { MenuEntry } from 'agents-kit-svelte/primitives';

  const user: AuthUser = { name: 'Ada Lovelace', email: 'ada@example.com' };

  const items: MenuEntry[] = [
    { value: 'profile', label: 'Profile', onSelect: () => (location.href = '/profile') },
    { value: 'settings', label: 'Settings', onSelect: () => (location.href = '/settings') }
  ];

  async function signOut() {
    await fetch('/logout', { method: 'POST' });
    location.href = '/login';
  }
</script>

<AccountMenu {user} {items} showName onSignOut={signOut} />`
	},
	{
		slug: 'session-list',
		name: 'SessionList',
		category: 'Auth',
		sveltePath: 'src/lib/auth/account/SessionList.svelte',
		upstreamSource: UPSTREAM,
		description:
			'The signed-in devices as a list: an icon per kind, label, location, "Active 12 min ago" (or "Active now" and a "This device" badge for the current one). Each other row has a Revoke button and there is a "Sign out of all other sessions" button; both confirm first and then call onRevoke(id) or onRevokeOthers(). A returned promise shows loading. Your app removes revoked sessions from the list; focus then moves to the next row or the heading.',
		usageSnippet: `<script lang="ts">
  import { SessionList, type AuthSession } from 'agents-kit-svelte/auth';

  let sessions = $state<AuthSession[]>([
    { id: 'a', label: 'Chrome on macOS', kind: 'desktop', location: 'Berlin', current: true },
    { id: 'b', label: 'Safari on iPhone', kind: 'mobile', location: 'Berlin', lastActive: Date.now() - 12 * 60_000 }
  ]);

  async function revoke(id: string) {
    await fetch('/sessions/' + id, { method: 'DELETE' });
    sessions = sessions.filter((session) => session.id !== id);
  }

  async function revokeOthers() {
    await fetch('/sessions', { method: 'DELETE' });
    sessions = sessions.filter((session) => session.current);
  }
</script>

<SessionList {sessions} onRevoke={revoke} onRevokeOthers={revokeOthers} />`
	},
	{
		slug: 'verify-email-banner',
		name: 'VerifyEmailBanner',
		category: 'Auth',
		sveltePath: 'src/lib/auth/account/VerifyEmailBanner.svelte',
		upstreamSource: UPSTREAM,
		description:
			'A warning banner saying an email address is not verified, with a Resend button. Resend calls onResend() (a promise shows loading), then a polite "Sent" confirmation appears. The button waits until resendAvailableAt (set it from your server), counting down. Optional dismiss and "Change email" buttons only call back.',
		usageSnippet: `<script lang="ts">
  import { VerifyEmailBanner } from 'agents-kit-svelte/auth';

  let resendAvailableAt = $state<number | undefined>(undefined);
  let dismissed = $state(false);

  async function resend() {
    await fetch('/verify-email/resend', { method: 'POST' });
    resendAvailableAt = Date.now() + 60_000;
  }
</script>

{#if !dismissed}
  <VerifyEmailBanner
    email="ada@example.com"
    onResend={resend}
    {resendAvailableAt}
    onChangeEmail={() => (location.href = '/settings/email')}
    onDismiss={() => (dismissed = true)}
  />
{/if}`
	},
	{
		slug: 'backup-codes',
		name: 'BackupCodes',
		category: 'Auth',
		sveltePath: 'src/lib/auth/account/BackupCodes.svelte',
		upstreamSource: UPSTREAM,
		description:
			'Recovery codes your server generated, shown as given in an ordered list (two columns on wide screens); used codes are struck through and read as "used". Copy all (clipboard, with a fallback message) and Download (a local .txt file) work in the browser and never send the codes anywhere. Regenerate confirms first, then calls onRegenerate(); requireAcknowledge adds a checkbox that gates Continue, which calls onConfirm().',
		usageSnippet: `<script lang="ts">
  import { BackupCodes } from 'agents-kit-svelte/auth';

  let codes = $state(['7k2m-9xqp', 'f3ab-81zd', 'q9wl-4tnc', 'x5rj-0vhe']);

  async function regenerate() {
    const response = await fetch('/two-factor/backup-codes', { method: 'POST' });
    codes = await response.json();
  }
</script>

<BackupCodes
  {codes}
  used={['f3ab-81zd']}
  heading="Example app backup codes"
  filename="example-backup-codes.txt"
  onRegenerate={regenerate}
  requireAcknowledge
  onConfirm={() => (location.href = '/account')}
/>`
	}
];
