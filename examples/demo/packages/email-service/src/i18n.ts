import { demoLoadOptions, type LocaleKeys, type GetNestedValue, type NestedPaths, type SupportedLocale } from '@demo/i18n';
import { loadTypedLocale, preloadTypedLocales } from 'paraguas/server';

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
