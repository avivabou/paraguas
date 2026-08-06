import type express from 'express';
import { i18nPackage, type SupportedLocale } from '@demo/i18n';

export function resolveLocale<T>(
    req: express.Request,
    locales: Map<SupportedLocale, T>,
): { t: T; lang: SupportedLocale } {
    return i18nPackage.resolve(req.query.lang, locales);
}
