import * as path from 'path';
import type { GetNestedValue, LocaleKeysFor, NestedPaths } from 'paraguas';
import type { NamespaceTypeMap } from './generated/namespace-type-map';
import { i18nPackage } from './package';

export type LocaleKeys<R extends keyof typeof i18nPackage.recipes> = LocaleKeysFor<
    typeof i18nPackage,
    NamespaceTypeMap,
    R
>;

export type WebKeys = LocaleKeys<'web'>;
export type WebTexts<P extends NestedPaths<WebKeys>> = GetNestedValue<WebKeys, P>;
export type EmailKeys = LocaleKeys<'emails'>;
export type EmailTexts<P extends NestedPaths<EmailKeys>> = GetNestedValue<EmailKeys, P>;

export const demoLoadOptions = i18nPackage.loadOptions(path.resolve(__dirname, '..', 'dist'));

export { i18nPackage };
