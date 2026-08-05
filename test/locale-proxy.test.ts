import { describe, expect, it } from 'vitest';
import { createLocaleProxy, MissingTokenRendererError } from '../src/runtime/locale-proxy';
import { stringTokenRenderer } from '../src/runtime/tokens';

interface FakeKeys {
    errors: {
        plain: () => string;
        withData: (data: Record<'name', unknown>) => string;
        tagged: (data: Record<'name', unknown>, embeds: Record<'undo', (label: string) => string>) => string;
        taggedOnly: (embeds: Record<'undo', (label: string) => string>) => string;
        nested: { $value: () => string };
    };
}

describe('createLocaleProxy', () => {
    it('resolves plain keys through t', () => {
        const proxy = createLocaleProxy<FakeKeys>((key) => `resolved:${key}`);
        expect(proxy.errors.plain()).toBe('resolved:errors.plain');
    });

    it('forwards data values to t and never forwards wrappers', () => {
        const calls: unknown[][] = [];
        const proxy = createLocaleProxy<FakeKeys>(
            (...args) => {
                calls.push(args);
                return 'Undo [undo]here[/undo]';
            },
            { renderTokens: stringTokenRenderer },
        );

        proxy.errors.tagged({ name: 'x' }, { undo: (label) => `<${label}>` });
        expect(calls).toEqual([['errors.tagged', { name: 'x' }]]);
    });

    it('renders through the injected renderer when wrappers are passed', () => {
        const proxy = createLocaleProxy<FakeKeys>(() => 'Click [undo]Undo[/undo] now', {
            renderTokens: stringTokenRenderer,
        });
        expect(proxy.errors.tagged({ name: 'x' }, { undo: (label) => `<${label}>` })).toBe('Click <Undo> now');
    });

    it('supports wrappers as the only argument', () => {
        const calls: unknown[][] = [];
        const proxy = createLocaleProxy<FakeKeys>(
            (...args) => {
                calls.push(args);
                return '[undo]Undo[/undo]';
            },
            { renderTokens: stringTokenRenderer },
        );
        expect(proxy.errors.taggedOnly({ undo: (label) => label.toUpperCase() })).toBe('UNDO');
        expect(calls).toEqual([['errors.taggedOnly']]);
    });

    it('throws a descriptive error when wrappers are passed without a renderer', () => {
        const proxy = createLocaleProxy<FakeKeys>(() => '[undo]Undo[/undo]');
        expect(() => proxy.errors.taggedOnly({ undo: (label) => label })).toThrow(MissingTokenRendererError);
        expect(() => proxy.errors.taggedOnly({ undo: (label) => label })).toThrow('errors.taggedOnly');
    });

    it('returns the plain string when no wrappers are passed', () => {
        const proxy = createLocaleProxy<FakeKeys>(() => 'Hello', { renderTokens: stringTokenRenderer });
        expect(proxy.errors.withData({ name: 'x' })).toBe('Hello');
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
