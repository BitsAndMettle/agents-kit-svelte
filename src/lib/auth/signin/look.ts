/** Classes and small helpers shared by the sign-in cards. Pure: nothing here touches the DOM. */

/** A text link or link-styled button inside an auth card. */
export const LINK_CLASS =
	'rounded-sm font-medium text-fg-main underline underline-offset-2 hover:text-accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary/70';

/** Words of the provider and passkey buttons a card draws. Cards extend this, so each keeps one `labels` prop. */
export interface AlternativeLabels {
	/** Accessible name of a provider button, from the provider's label. */
	provider: (label: string) => string;
	/** Badge on the provider used last. */
	lastUsed: string;
	/** The passkey button. */
	passkey: string;
}

/** Words of the password field's reveal button and Caps Lock warning. */
export interface PasswordLabels {
	showPassword: string;
	hidePassword: string;
	/** Warning shown while Caps Lock is on. */
	capsLock: string;
}

/** Words of the password checklist and strength meter (sign-up). */
export interface PasswordGuideLabels {
	/** Screen-reader text for a met requirement. */
	ruleMet: string;
	/** Screen-reader text for an unmet requirement. */
	ruleUnmet: string;
	/** The quiet progress line, e.g. "2 of 3 requirements met". */
	rulesSummary: (met: number, total: number) => string;
	/** Name of the strength meter, read before the level. */
	strengthTitle: string;
	/** Words for the five strength levels, from 0 to 4. */
	strengthLabels: [string, string, string, string, string];
}
