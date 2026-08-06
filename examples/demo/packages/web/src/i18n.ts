import {
    createLocaleProxy,
    demoLoadOptions,
    type GetNestedValue,
    type LocaleKeys,
    type NestedPaths,
} from '@demo/i18n';
import { reactTokenRenderer } from 'paraguas/react';
import { loadLocale } from 'paraguas/server';

export type WebLocaleKeys = LocaleKeys<'web'>;
export type WebLocalePaths = NestedPaths<WebLocaleKeys>;
export type LocaleKeyTexts<P extends WebLocalePaths> = GetNestedValue<WebLocaleKeys, P>;

export function loadWebTexts(lang: string): WebLocaleKeys {
    const resolver = loadLocale('web', lang, demoLoadOptions);
    return createLocaleProxy<WebLocaleKeys>((key, values) => resolver.t(key, values), {
        renderTokens: reactTokenRenderer,
    });
}
