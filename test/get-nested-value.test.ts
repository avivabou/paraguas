import { describe, expect, it } from 'vitest';
import { getNestedValue } from '../src/runtime/get-nested-value';

describe('getNestedValue', () => {
    it('walks a dotted path', () => {
        expect(getNestedValue({ a: { b: { c: 'deep' } } }, 'a.b.c')).toBe('deep');
    });

    it('returns an intermediate node for a partial path', () => {
        expect(getNestedValue({ a: { b: 'B' } }, 'a')).toEqual({ b: 'B' });
    });

    it('returns undefined for a missing path', () => {
        expect(getNestedValue({ a: {} }, 'a.b.c')).toBeUndefined();
        expect(getNestedValue(null, 'a')).toBeUndefined();
    });
});

describe('getNestedValue over a locale proxy', () => {
    it('slices a callable-proxy tree (proxy targets are functions)', async () => {
        const { createLocaleProxy } = await import('../src/runtime/locale-proxy');
        const proxy = createLocaleProxy<Record<string, never>>((key) => `resolved:${key}`);
        const slice = getNestedValue(proxy, 'pages.dashboard') as Record<string, () => string>;
        expect(slice.title()).toBe('resolved:pages.dashboard.title');
    });
});
