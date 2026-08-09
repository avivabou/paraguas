export {
    createLocaleProxy,
    MissingRenderKeyError,
    type LocaleProxyOptions,
    type RenderKey,
    type Translate,
    type NestedPaths,
    type GetNestedValue,
} from './runtime/locale-proxy';
export { angleTagStructure, BASIC_HTML_TAGS, type TokenStructure } from './runtime/tokens';
export {
    createTranslationResolver,
    TranslationKeyError,
    type TranslationResolver,
    type CreateTranslationResolverOptions,
} from './runtime/resolver';
export { createLocaleSet, UnsupportedLocaleError, type LocaleSet } from './runtime/locales';
export { resolveLocale, LocaleNotPreloadedError } from './runtime/resolve-locale';
export type { DeepMerge, MapNamespaces, LocaleKeysOf } from './runtime/types';
export { getNestedValue } from './runtime/get-nested-value';
export {
    defineLocalePackage,
    type LocalePackage,
    type LocalePackageConfig,
    type LocaleKeysFor,
} from './runtime/define-locale-package';
