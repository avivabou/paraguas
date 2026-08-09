import { describe, expect, it } from 'vitest';
import { createLocaleProxy, MissingRenderKeyError } from '../src/runtime/locale-proxy';
import { createTranslationResolver } from '../src/runtime/resolver';

interface FakeKeys {
    errors: {
        plain: () => string;
        withData: (data: Record<'name', unknown>) => string;
        tagged: (data: Record<'name', unknown>, embeds: Record<'undo', unknown>) => unknown;
        taggedOnly: (embeds: Record<'undo', unknown>) => unknown;
        nested: { $value: () => string };
    };
}

const element = { $$typeof: Symbol.for('react.element'), type: 'a', props: {} };

describe('createLocaleProxy', () => {
    it('resolves plain keys through t', () => {
        const proxy = createLocaleProxy<FakeKeys>((key) => `resolved:${key}`);
        expect(proxy.errors.plain()).toBe('resolved:errors.plain');
    });

    it('forwards data values to t', () => {
        const calls: unknown[][] = [];
        const proxy = createLocaleProxy<FakeKeys>((...args) => {
            calls.push(args);
            return 'Hi x';
        });
        expect(proxy.errors.withData({ name: 'x' })).toBe('Hi x');
        expect(calls).toEqual([['errors.withData', { name: 'x' }]]);
    });

    it('throws a descriptive error when wrappers are passed without renderKey', () => {
        const proxy = createLocaleProxy<FakeKeys>(() => '<undo>Undo</undo>');
        expect(() => proxy.errors.taggedOnly({ undo: element })).toThrow(MissingRenderKeyError);
        expect(() => proxy.errors.taggedOnly({ undo: element })).toThrow('errors.taggedOnly');
    });

    it('is not a thenable — awaiting a promise resolved with the proxy settles immediately', async () => {
        const proxy = createLocaleProxy<FakeKeys>((key) => key);
        const resolved = await Promise.resolve(proxy);
        expect(resolved.errors.plain()).toBe('errors.plain');
    });

    it('strips the $value sentinel from paths', () => {
        const paths: string[] = [];
        const proxy = createLocaleProxy<FakeKeys>((key) => {
            paths.push(key);
            return '';
        });
        proxy.errors.nested.$value();
        expect(paths).toEqual(['errors.nested']);
    });
});

describe('renderKey routing', () => {
    it('delegates the whole call to renderKey without touching t', () => {
        const tCalls: string[] = [];
        const renderCalls: unknown[][] = [];
        const proxy = createLocaleProxy<FakeKeys>(
            (key) => {
                tCalls.push(key);
                return '';
            },
            {
                renderKey: (path, data, wrappers) => {
                    renderCalls.push([path, data, wrappers]);
                    return 'rendered';
                },
            },
        );

        const result = proxy.errors.tagged({ name: 'x' }, { undo: element });
        expect(result).toBe('rendered');
        expect(tCalls).toEqual([]);
        expect(renderCalls).toEqual([['errors.tagged', { name: 'x' }, { undo: element }]]);
    });

    it('detects element-map wrappers (react 18 and 19 symbols)', () => {
        const paths: unknown[] = [];
        const proxy = createLocaleProxy<FakeKeys>(() => '', {
            renderKey: (path, data, wrappers) => {
                paths.push([path, data, Object.keys(wrappers)]);
                return null;
            },
        });
        const modern = { $$typeof: Symbol.for('react.transitional.element'), type: 'a', props: {} };
        proxy.errors.taggedOnly({ undo: modern });
        expect(paths).toEqual([['errors.taggedOnly', undefined, ['undo']]]);
    });

    it('detects function-map wrappers', () => {
        const wrapperKeys: unknown[] = [];
        const proxy = createLocaleProxy<FakeKeys>(() => '', {
            renderKey: (_path, _data, wrappers) => {
                wrapperKeys.push(Object.keys(wrappers));
                return null;
            },
        });
        proxy.errors.taggedOnly({ undo: (label: string) => label });
        expect(wrapperKeys).toEqual([['undo']]);
    });

    it('still resolves plain keys through t when renderKey is set', () => {
        const proxy = createLocaleProxy<FakeKeys>((key) => `resolved:${key}`, { renderKey: () => 'nope' });
        expect(proxy.errors.plain()).toBe('resolved:errors.plain');
    });

    it('renderKey can resolve ICU plurals through a captured resolver', () => {
        interface PluralKeys {
            items: (data: Record<'count', unknown>, embeds: Record<'undo', unknown>) => unknown;
        }
        const resolver = createTranslationResolver({
            primary: {
                items: '{count, plural, one {<undo>Undo # item</undo>} other {# items — <undo>undo all</undo>}}',
            },
        });
        const proxy = createLocaleProxy<PluralKeys>((key, values) => resolver.t(key, values), {
            renderKey: (path, data) => resolver.t(path, data),
        });

        expect(proxy.items({ count: 1 }, { undo: element })).toBe('<undo>Undo 1 item</undo>');
        expect(proxy.items({ count: 3 }, { undo: element })).toBe('3 items — <undo>undo all</undo>');
    });
});
