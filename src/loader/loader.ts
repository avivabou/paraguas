import * as fs from 'node:fs';
import * as path from 'node:path';
import { createLocaleProxy, type LocaleProxyOptions } from '../runtime/locale-proxy';
import { createTranslationResolver, type TranslationResolver } from '../runtime/resolver';
import { UnsupportedLocaleError } from '../runtime/locales';

export interface LoadOptions {
    distDir: string;
    languages: readonly string[];
    fallbackLanguage?: string;
    proxy?: LocaleProxyOptions;
}

function readLocaleJson(distDir: string, recipe: string, lang: string): Record<string, unknown> {
    const filePath = path.join(distDir, recipe, `${lang}.json`);
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
}

export function loadLocale(recipe: string, lang: string, options: LoadOptions): TranslationResolver {
    const { distDir, languages, fallbackLanguage = languages[0] } = options;
    if (!languages.includes(lang)) {
        throw new UnsupportedLocaleError(lang);
    }
    const primary = readLocaleJson(distDir, recipe, lang);
    const fallback =
        fallbackLanguage != null && lang !== fallbackLanguage
            ? readLocaleJson(distDir, recipe, fallbackLanguage)
            : undefined;
    return createTranslationResolver({ primary, fallback, locale: lang });
}

export function preloadLocales(recipe: string, options: LoadOptions): Map<string, TranslationResolver> {
    const resolvers = new Map<string, TranslationResolver>();
    for (const locale of options.languages) {
        resolvers.set(locale, loadLocale(recipe, locale, options));
    }
    return resolvers;
}

export function loadTypedLocale<T>(recipe: string, lang: string, options: LoadOptions): T {
    const resolver = loadLocale(recipe, lang, options);
    return createLocaleProxy<T>((key, values) => resolver.t(key, values), options.proxy);
}

export function preloadTypedLocales<T>(recipe: string, options: LoadOptions): Map<string, T> {
    const proxies = new Map<string, T>();
    for (const locale of options.languages) {
        proxies.set(locale, loadTypedLocale<T>(recipe, locale, options));
    }
    return proxies;
}
