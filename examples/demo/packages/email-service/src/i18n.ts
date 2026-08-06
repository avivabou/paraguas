import type { GetNestedValue, LocaleKeys, NestedPaths, SupportedLocale } from '@demo/i18n';
import { demoLoadOptions, loadTypedLocale, preloadTypedLocales } from '@demo/i18n/server';

const RECIPE = 'emails';

export type EmailLocale = LocaleKeys<'emails'>;
export type EmailLocalePaths = NestedPaths<EmailLocale>;
export type EmailLocaleTexts<P extends EmailLocalePaths> = GetNestedValue<EmailLocale, P>;

export function loadEmailLocale(lang: string): EmailLocale {
    return loadTypedLocale<EmailLocale>(RECIPE, lang, demoLoadOptions);
}

export function preloadEmailLocales(): Map<SupportedLocale, EmailLocale> {
    return preloadTypedLocales<EmailLocale>(RECIPE, demoLoadOptions) as Map<SupportedLocale, EmailLocale>;
}
