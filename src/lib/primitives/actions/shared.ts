import { cn } from '../../ui/cn';
import { buttonClass, pillClass, type ButtonSize, type ButtonVariant } from '../../ui/styles';

/** Class list for a button or link: the soft pill recipe when `pill`, the standard one otherwise. */
export function actionClass(variant: ButtonVariant, size: ButtonSize, pill: boolean): string {
	// The accent fill turns light in the dark theme, where the recipe's white label fails contrast, so the
	// label switches to `fg-inverse` (near-black in dark) under .dark, [data-theme=dark] and system dark.
	const extra =
		variant === 'accent'
			? 'relative [:where(.dark,[data-theme=dark])_&]:text-fg-inverse [@media(prefers-color-scheme:dark)]:[:where([data-theme=system])_&]:text-fg-inverse'
			: 'relative';
	return cn((pill ? pillClass : buttonClass)(variant, size, extra));
}
