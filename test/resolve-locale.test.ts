import { describe, expect, it } from 'vitest';
import { createLocaleSet } from '../src/runtime/locales';
import { resolveLocale } from '../src/runtime/resolve-locale';

const localeSet = createLocaleSet(['en', 'es'] as const);
const locales = new Map([
    ['en', { hello: 'Hello' }],
    ['es', { hello: 'Hola' }],
]);

describe('resolveLocale', () => {
    it('picks the requested locale from the preloaded map', () => {
        const { t, lang } = resolveLocale('es', locales, localeSet);
        expect(lang).toBe('es');
        expect(t.hello).toBe('Hola');
    });

    it('falls back to the default locale for unsupported values', () => {
        const { t, lang } = resolveLocale('fr', locales, localeSet);
        expect(lang).toBe('en');
        expect(t.hello).toBe('Hello');
    });

    it('falls back to the default locale for non-string input', () => {
        expect(resolveLocale(undefined, locales, localeSet).lang).toBe('en');
        expect(resolveLocale(42, locales, localeSet).lang).toBe('en');
        expect(resolveLocale(['es'], locales, localeSet).lang).toBe('en');
    });

    it('throws when the resolved locale is missing from the map', () => {
        const partial = new Map([['es', { hello: 'Hola' }]]);
        expect(() => resolveLocale('fr', partial, localeSet)).toThrow(/en/);
    });
});
