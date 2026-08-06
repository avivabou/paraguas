import type { SupportedLocale } from '@demo/i18n';
import { createLocaleProxy, createTranslationResolver } from 'paraguas';
import { reactTokenRenderer } from 'paraguas/react';
import webEn from '../../i18n/dist/web/en.json';
import webEs from '../../i18n/dist/web/es.json';
import webFr from '../../i18n/dist/web/fr.json';
import type { WebLocaleKeys } from './i18n';

const bundles: Record<SupportedLocale, Record<string, unknown>> = { en: webEn, fr: webFr, es: webEs };

export function browserWebTexts(lang: SupportedLocale): WebLocaleKeys {
    const resolver = createTranslationResolver({ primary: bundles[lang], fallback: bundles.en, locale: lang });
    return createLocaleProxy<WebLocaleKeys>((key, values) => resolver.t(key, values), {
        renderTokens: reactTokenRenderer,
    });
}
