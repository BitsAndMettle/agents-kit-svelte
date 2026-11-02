<script lang="ts">
	import { buttonClass } from '$lib/ui/styles';
	import { Moon, Sparkle, Sun } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import '../app.css';
	import VersionMenu from './VersionMenu.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	let isDark = $state(false);
	let ready = $state(false);

	const NAV_LINKS = [
		{ href: `${base}/`, match: `${base}/`, label: 'Components' },
		{ href: `${base}/claude-code/`, match: `${base}/claude-code`, label: 'AK-S Chat' },
		{ href: `${base}/github/`, match: `${base}/github`, label: 'GitHub Suite' },
		{ href: `${base}/skills/`, match: `${base}/skills`, label: 'Skills' },
		{ href: `${base}/charts/`, match: `${base}/charts`, label: 'Charts' },
		{ href: `${base}/features/`, match: `${base}/features`, label: 'Features' },
		{ href: `${base}/intelligent-ui/`, match: `${base}/intelligent-ui`, label: 'Playground' },
		{ href: `${base}/install/`, match: `${base}/install`, label: 'Install' }
	];

	$effect(() => {
		ready = true;
		if (typeof document !== 'undefined') {
			document.documentElement.classList.toggle('dark', isDark);
			document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
		}
	});
</script>

<div class="min-h-screen bg-canvas-primary text-fg-main">
	<header class="sticky top-0 z-40 border-b border-canvas-border/70 bg-canvas-primary">
		<div class="mx-auto flex min-h-16 max-w-[1440px] flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2 lg:h-16 lg:flex-nowrap sm:px-6 lg:py-0">
			<div class="flex items-center gap-2.5 sm:gap-3">
				<a
					href="{base}/"
					class="flex items-center gap-2 text-sm font-semibold whitespace-nowrap text-fg-main no-underline"
				>
					<span
						class="inline-flex size-7 items-center justify-center rounded-full bg-accent-primary text-white [&_svg]:size-3.5"
					>
						<Sparkle aria-hidden="true" class="fill-current" />
					</span>
					<span class="font-display text-[17px] font-normal tracking-[-0.01em]">Agents Kit</span>
					<span class="text-xs font-medium text-fg-light">Svelte</span>
				</a>
				<VersionMenu />
			</div>

			<nav
				aria-label="Showcase primary navigation"
				class="order-last flex w-full items-center gap-0.5 overflow-x-auto rounded-full bg-canvas-secondary p-1 text-xs whitespace-nowrap [scrollbar-width:none] max-sm:[mask-image:linear-gradient(to_right,black_82%,transparent)] sm:justify-between sm:text-[13px] lg:order-none lg:ml-auto lg:w-auto lg:justify-start"
			>
				{#each NAV_LINKS as item (item.href)}
					{@const normalizedPath = page.url.pathname.replace(/\/+$/, '') || '/'}
					{@const normalizedMatch = item.match.replace(/\/+$/, '') || '/'}
					{@const active = normalizedPath === normalizedMatch}
					<a
						href={item.href}
						aria-current={active ? 'page' : undefined}
						class="rounded-full px-2.5 py-1 font-medium no-underline transition-colors sm:px-3.5 {active
							? 'bg-card-bg text-fg-main ak-shadow-btn'
							: 'text-fg-light hover:text-fg-main'}"
					>
						{item.label}
					</a>
				{/each}
				<a
					href="{base}/#svelte5-motion-lab"
					class="rounded-full px-2.5 py-1 font-medium text-fg-light no-underline transition-colors hover:text-fg-main sm:px-3.5"
				>
					Motion Lab
				</a>
			</nav>

			<div class="flex items-center gap-2">
				<button
					type="button"
					disabled={!ready}
					aria-label="Toggle global color theme"
					onclick={() => (isDark = !isDark)}
					title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
					class={buttonClass('ghost', 'icon')}
				>
					{#if isDark}<Sun aria-hidden="true" />{:else}<Moon aria-hidden="true" />{/if}
				</button>
			</div>
		</div>
	</header>

	{@render children()}

	<footer class="border-t border-canvas-border/70">
		<div
			class="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 py-6 text-xs leading-5 text-fg-light sm:flex-row sm:items-center sm:justify-between sm:px-6"
		>
			<p>
				Agents Kit Svelte, a Svelte 5 port of
				<a href="https://github.com/agents-ui/agents-kit" class="text-fg-main underline decoration-card-border underline-offset-4 hover:decoration-fg-light">Agents Kit for React</a>
				by Emiliano. Look inspired by Claude Code; not affiliated with Anthropic.
			</p>
			<p class="flex items-center gap-3">
				<a href="{base}/#credits" class="hover:text-fg-main">Credits</a>
				<a href="https://github.com/rsynapse/agents-kit-svelte/blob/main/LICENSE" class="hover:text-fg-main">Apache 2.0</a>
			</p>
		</div>
	</footer>
</div>
