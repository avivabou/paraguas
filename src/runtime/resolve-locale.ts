import type { LocaleSet } from './locales';

export class LocaleNotPreloadedError extends Error {
    constructor(locale: string) {
        super(`Locale "${locale}" is not in the preloaded locales map`);
        this.name = 'LocaleNotPreloadedError';
    }
}

export function resolveLocale<T, Locales extends readonly string[]>(
    requested: unknown,
    locales: Map<string, T>,
    localeSet: LocaleSet<Locales>,
): { t: T; lang: Locales[number] } {
    const lang =
        typeof requested === 'string' && localeSet.isSupportedLocale(requested)
            ? requested
            : localeSet.DEFAULT_LOCALE;
    const t = locales.get(lang);
    if (t == null) throw new LocaleNotPreloadedError(lang);
    return { t, lang };
}
