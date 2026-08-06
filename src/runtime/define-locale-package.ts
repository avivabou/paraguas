import { createLocaleSet, type LocaleSet } from './locales';
import { resolveLocale } from './resolve-locale';
import type { LocaleProxyOptions } from './locale-proxy';
import type { LocaleKeysOf } from './types';

export interface LocalePackageConfig<
    Locales extends readonly [string, ...string[]],
    Recipes extends Record<string, readonly string[]>,
> {
    languages: Locales;
    recipes: Recipes;
}

export interface LocaleLoadOptions {
    distDir: string;
    languages: readonly string[];
    fallbackLanguage?: string;
    proxy?: LocaleProxyOptions;
}

export interface LocalePackage<
    Locales extends readonly [string, ...string[]],
    Recipes extends Record<string, readonly string[]>,
> {
    languages: Locales;
    recipes: Recipes;
    localeSet: LocaleSet<Locales>;
    loadOptions(distDir: string, proxy?: LocaleProxyOptions): LocaleLoadOptions;
    resolve<T>(requested: unknown, locales: Map<string, T>): { t: T; lang: Locales[number] };
}

export function defineLocalePackage<
    const Locales extends readonly [string, ...string[]],
    const Recipes extends Record<string, readonly string[]>,
>(config: LocalePackageConfig<Locales, Recipes>): LocalePackage<Locales, Recipes> {
    const localeSet = createLocaleSet(config.languages);
    return {
        languages: config.languages,
        recipes: config.recipes,
        localeSet,
        loadOptions: (distDir, proxy) => ({
            distDir,
            languages: config.languages,
            ...(proxy != null && { proxy }),
        }),
        resolve: (requested, locales) => resolveLocale(requested, locales, localeSet),
    };
}

export type LocaleKeysFor<
    Pkg extends { recipes: Record<string, readonly string[]> },
    TypeMap,
    R extends keyof Pkg['recipes'],
> = LocaleKeysOf<Pkg['recipes'], TypeMap, R>;
