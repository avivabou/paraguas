import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadLocale, loadTypedLocale, preloadTypedLocales, type LoadOptions } from '../src/loader/loader';
import { UnsupportedLocaleError } from '../src/runtime/locales';
import { stringTokenRenderer } from '../src/runtime/tokens';

interface AppKeys {
    greeting: (data: Record<'name', unknown>) => string;
    cta: (embeds: Record<'go', (label: string) => string>) => string;
    plain: () => string;
}

let distDir: string;

const options = (): LoadOptions => ({ distDir, languages: ['en', 'es'] });

beforeEach(() => {
    distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paraguas-loader-'));
    fs.mkdirSync(path.join(distDir, 'app'), { recursive: true });
    fs.writeFileSync(
        path.join(distDir, 'app', 'en.json'),
        JSON.stringify({ greeting: 'Hi {name}!', cta: 'Now <go>Go</go>!', plain: 'Plain', onlyEn: 'EN' }),
    );
    fs.writeFileSync(
        path.join(distDir, 'app', 'es.json'),
        JSON.stringify({ greeting: '¡Hola {name}!', cta: '¡Ahora <go>Ve</go>!', plain: 'Simple' }),
    );
});

afterEach(() => {
    fs.rmSync(distDir, { recursive: true, force: true });
});

describe('loadLocale', () => {
    it('loads the requested language', () => {
        expect(loadLocale('app', 'es', options()).t('plain')).toBe('Simple');
    });

    it('falls back to the reference language for missing keys', () => {
        expect(loadLocale('app', 'es', options()).t('onlyEn')).toBe('EN');
    });

    it('rejects unsupported locales', () => {
        expect(() => loadLocale('app', 'fr', options())).toThrow(UnsupportedLocaleError);
    });
});

describe('loadTypedLocale', () => {
    it('returns a typed proxy that resolves and formats', () => {
        const texts = loadTypedLocale<AppKeys>('app', 'en', options());
        expect(texts.greeting({ name: 'Ada' })).toBe('Hi Ada!');
        expect(texts.plain()).toBe('Plain');
    });

    it('renders embeds through the configured proxy renderer', () => {
        const texts = loadTypedLocale<AppKeys>('app', 'es', {
            ...options(),
            proxy: { renderTokens: stringTokenRenderer },
        });
        expect(texts.cta({ go: (label) => `<${label}>` })).toBe('¡Ahora <Ve>!');
    });
});

describe('preloadTypedLocales', () => {
    it('returns one proxy per language', () => {
        const proxies = preloadTypedLocales<AppKeys>('app', options());
        expect([...proxies.keys()]).toEqual(['en', 'es']);
        expect(proxies.get('es')?.greeting({ name: 'Ada' })).toBe('¡Hola Ada!');
    });
});
