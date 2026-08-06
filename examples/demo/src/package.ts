import { defineLocalePackage } from 'paraguas';

export const i18nPackage = defineLocalePackage({
    languages: ['en', 'fr'] as const,
    recipes: { web: ['cart'] } as const,
});
