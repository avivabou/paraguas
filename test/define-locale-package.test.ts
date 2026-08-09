import { describe, expect, it } from 'vitest';
import { defineLocalePackage } from '../src/runtime/define-locale-package';

const pkg = defineLocalePackage({
    languages: ['en', 'fr'] as const,
    recipes: { web: ['catalog', 'common'], emails: ['emails', 'common'] } as const,
});

describe('defineLocalePackage', () => {
    it('exposes a locale set with the first language as default', () => {
        expect(pkg.localeSet.DEFAULT_LOCALE).toBe('en');
        expect(pkg.localeSet.SUPPORTED_LOCALES).toEqual(['en', 'fr']);
        expect(pkg.localeSet.isSupportedLocale('fr')).toBe(true);
        expect(pkg.localeSet.isSupportedLocale('de')).toBe(false);
    });

    it('builds load options bound to the package languages', () => {
        expect(pkg.loadOptions('/some/dist')).toEqual({ distDir: '/some/dist', languages: ['en', 'fr'] });
    });

    it('threads proxy options into load options only when given', () => {
        const renderKey = (path: string): string => path;
        expect(pkg.loadOptions('/d', { renderKey })).toEqual({
            distDir: '/d',
            languages: ['en', 'fr'],
            proxy: { renderKey },
        });
    });

    it('resolves a requested locale against the package set', () => {
        const locales = new Map([
            ['en', { hello: 'Hello' }],
            ['fr', { hello: 'Bonjour' }],
        ]);
        expect(pkg.resolve('fr', locales)).toEqual({ t: { hello: 'Bonjour' }, lang: 'fr' });
        expect(pkg.resolve('de', locales).lang).toBe('en');
        expect(pkg.resolve(undefined, locales).lang).toBe('en');
    });

    it('passes recipes through for the build config', () => {
        expect(pkg.recipes.web).toEqual(['catalog', 'common']);
    });
});
