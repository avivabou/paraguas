import { defineLocalePackage } from 'paraguas';

export const i18nPackage = defineLocalePackage({
    languages: ['en', 'fr'] as const,
    recipes: {
        web: ['catalog', 'cart', 'common'],
        emails: ['emails', 'common'],
    } as const,
});
