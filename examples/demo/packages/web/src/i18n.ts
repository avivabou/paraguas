import { createLocaleProxy, type GetNestedValue, type LocaleKeys, type NestedPaths, type SupportedLocale } from '@demo/i18n';
import i18next from 'i18next';
import ICU from 'i18next-icu';
import { initReactI18next } from 'react-i18next';
import { createUseLocaleKeys, transRenderKey } from 'paraguas/react-i18next';
import webEn from '../../i18n/dist/web/en.json';
import webEs from '../../i18n/dist/web/es.json';
import webFr from '../../i18n/dist/web/fr.json';

export type WebLocaleKeys = LocaleKeys<'web'>;
export type WebLocalePaths = NestedPaths<WebLocaleKeys>;
export type LocaleKeyTexts<P extends WebLocalePaths> = GetNestedValue<WebLocaleKeys, P>;

void i18next
    .use(ICU)
    .use(initReactI18next)
    .init({
        lng: 'en',
        fallbackLng: 'en',
        resources: {
            en: { translation: webEn },
            fr: { translation: webFr },
            es: { translation: webEs },
        },
        interpolation: { escapeValue: false },
    });

export const i18n = i18next;

export const useWebTexts = createUseLocaleKeys<WebLocaleKeys>();

export async function loadWebTexts(lang: SupportedLocale): Promise<WebLocaleKeys> {
    await i18next.changeLanguage(lang);
    return createLocaleProxy<WebLocaleKeys>((key, values) => i18next.t(key, values), {
        renderKey: transRenderKey,
    });
}
