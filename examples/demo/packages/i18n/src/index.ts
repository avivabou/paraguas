import * as path from 'path';
import type { LocaleKeysFor } from 'paraguas';
import type { NamespaceTypeMap } from './generated/namespace-type-map';
import { i18nPackage } from './package';

export type LocaleKeys<R extends keyof typeof i18nPackage.recipes> = LocaleKeysFor<
    typeof i18nPackage,
    NamespaceTypeMap,
    R
>;

export type { GetNestedValue, NestedPaths } from 'paraguas';
export { createLocaleProxy } from 'paraguas';

export const demoLoadOptions = i18nPackage.loadOptions(path.resolve(__dirname, '..', 'dist'));

export const SUPPORTED_LOCALES = i18nPackage.localeSet.SUPPORTED_LOCALES;
export const DEFAULT_LOCALE = i18nPackage.localeSet.DEFAULT_LOCALE;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export { i18nPackage };
