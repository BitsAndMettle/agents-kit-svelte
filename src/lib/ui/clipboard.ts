/**
 * Copies text with the async clipboard, falling back to a hidden textarea and `execCommand` where
 * the clipboard is blocked (an insecure page, an old browser). Runs in the browser only.
 *
 * @returns Whether the text was copied.
 */
export async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		// Fall through to the older way.
	}
	const area = document.createElement('textarea');
	area.value = text;
	area.setAttribute('readonly', '');
	area.setAttribute('aria-hidden', 'true');
	area.style.position = 'fixed';
	area.style.opacity = '0';
	const active = document.activeElement as HTMLElement | null;
	document.body.append(area);
	area.select();
	let copied = false;
	try {
		copied = document.execCommand('copy');
	} catch {
		copied = false;
	}
	area.remove();
	active?.focus();
	return copied;
}
