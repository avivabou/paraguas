import { describe, expect, it } from 'vitest';
import { createTranslationResolver, TranslationKeyError } from '../src/runtime/resolver';

describe('createTranslationResolver', () => {
    it('resolves nested keys', () => {
        const resolver = createTranslationResolver({ primary: { a: { b: 'value' } } });
        expect(resolver.t('a.b')).toBe('value');
    });

    it('falls back to the fallback catalog', () => {
        const resolver = createTranslationResolver({ primary: { a: 'primario' }, fallback: { b: 'fallback' } });
        expect(resolver.t('b')).toBe('fallback');
    });

    it('prefers the primary catalog', () => {
        const resolver = createTranslationResolver({ primary: { a: 'primario' }, fallback: { a: 'fallback' } });
        expect(resolver.t('a')).toBe('primario');
    });

    it('throws TranslationKeyError for missing keys', () => {
        const resolver = createTranslationResolver({ primary: {} });
        expect(() => resolver.t('missing.key')).toThrow(TranslationKeyError);
    });

    it('throws when the key resolves to a non-string node', () => {
        const resolver = createTranslationResolver({ primary: { a: { b: 'x' } } });
        expect(() => resolver.t('a')).toThrow(TranslationKeyError);
    });

    it('returns the raw template when no values are given', () => {
        const resolver = createTranslationResolver({ primary: { a: 'Hi {name}' } });
        expect(resolver.t('a')).toBe('Hi {name}');
    });

    it('formats ICU params', () => {
        const resolver = createTranslationResolver({ primary: { a: 'Hi {name}!' } });
        expect(resolver.t('a', { name: 'Ada' })).toBe('Hi Ada!');
    });

    it('formats plurals', () => {
        const resolver = createTranslationResolver({
            primary: { a: '{count, plural, one {# item} other {# items}}' },
        });
        expect(resolver.t('a', { count: 1 })).toBe('1 item');
        expect(resolver.t('a', { count: 3 })).toBe('3 items');
    });

    it('uses the configured locale for plural rules', () => {
        const resolver = createTranslationResolver({
            locale: 'es',
            primary: { a: '{count, plural, one {# día} many {# días (many)} other {# días}}' },
        });
        expect(resolver.t('a', { count: 1 })).toBe('1 día');
        expect(resolver.t('a', { count: 1000000 })).toBe('1.000.000 días (many)');
    });
});
