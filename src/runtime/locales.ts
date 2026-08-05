export class UnsupportedLocaleError extends Error {
    constructor(locale: string) {
        super(`Unsupported locale: ${locale}`);
        this.name = 'UnsupportedLocaleError';
    }
}

export interface LocaleSet<Locales extends readonly string[]> {
    SUPPORTED_LOCALES: Locales;
    DEFAULT_LOCALE: Locales[number];
    isSupportedLocale(lang: string): lang is Locales[number];
}

export function createLocaleSet<const Locales extends readonly [string, ...string[]]>(
    locales: Locales,
): LocaleSet<Locales> {
    return {
        SUPPORTED_LOCALES: locales,
        DEFAULT_LOCALE: locales[0],
        isSupportedLocale(lang: string): lang is Locales[number] {
            return (locales as readonly string[]).includes(lang);
        },
    };
}
