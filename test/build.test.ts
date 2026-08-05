import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { build, validateAndMerge, ValidationError, type GenerateRequest } from '../src/builder/build';
import { bracketTagStructure } from '../src/runtime/tokens';

let rootDir: string;
let localesDir: string;
let distDir: string;

function writeNamespace(lang: string, ns: string, data: Record<string, unknown>): void {
    const dir = path.join(localesDir, lang);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${ns}.json`), JSON.stringify(data));
}

function baseConfig(recipes: Record<string, readonly string[]>) {
    return {
        localesDir,
        distDir,
        languages: ['en', 'es'] as const,
        recipes,
        structures: [bracketTagStructure],
    };
}

beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paraguas-build-'));
    localesDir = path.join(rootDir, 'locales');
    distDir = path.join(rootDir, 'dist');
});

afterEach(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
});

describe('validateAndMerge', () => {
    it('throws when a namespace file is missing for a language', () => {
        writeNamespace('en', 'ns1', { a: 'A' });
        expect(() => validateAndMerge(baseConfig({ app: ['ns1'] }))).toThrow(ValidationError);
        expect(() => validateAndMerge(baseConfig({ app: ['ns1'] }))).toThrow(/ns1/);
    });

    it('throws on leaf path collisions across namespaces', () => {
        writeNamespace('en', 'ns1', { shared: { key: 'A' } });
        writeNamespace('es', 'ns1', { shared: { key: 'A-es' } });
        writeNamespace('en', 'ns2', { shared: { key: 'B' } });
        writeNamespace('es', 'ns2', { shared: { key: 'B-es' } });
        expect(() => validateAndMerge(baseConfig({ app: ['ns1', 'ns2'] }))).toThrow(/Leaf path collision/);
    });

    it('throws on key parity mismatch listing missing and extra keys', () => {
        writeNamespace('en', 'ns1', { a: 'A', b: 'B' });
        writeNamespace('es', 'ns1', { a: 'A-es', c: 'C-es' });
        expect(() => validateAndMerge(baseConfig({ app: ['ns1'] }))).toThrow(/Missing in es: b/);
        expect(() => validateAndMerge(baseConfig({ app: ['ns1'] }))).toThrow(/Extra in es: c/);
    });

    it('throws when a token tag differs between languages', () => {
        writeNamespace('en', 'ns1', { msg: 'Click [contactSupport]here[/contactSupport]' });
        writeNamespace('es', 'ns1', { msg: 'Haz clic [contactSuport]aquí[/contactSuport]' });
        expect(() => validateAndMerge(baseConfig({ app: ['ns1'] }))).toThrow(/contactSupport/);
    });

    it('throws when a token is missing from a translation', () => {
        writeNamespace('en', 'ns1', { msg: 'See [readMore]more[/readMore]' });
        writeNamespace('es', 'ns1', { msg: 'Ver más' });
        expect(() => validateAndMerge(baseConfig({ app: ['ns1'] }))).toThrow(/readMore/);
    });

    it('throws on unpaired tokens', () => {
        writeNamespace('en', 'ns1', { msg: 'See [readMore]more[/readMor]' });
        writeNamespace('es', 'ns1', { msg: 'Ver [readMore]más[/readMore]' });
        expect(() => validateAndMerge(baseConfig({ app: ['ns1'] }))).toThrow(/unpaired/);
    });

    it('accepts matching tokens in different sentence positions', () => {
        writeNamespace('en', 'ns1', { msg: '[readMore]Read more[/readMore] about {name}' });
        writeNamespace('es', 'ns1', { msg: 'Sobre {name}, [readMore]leer más[/readMore]' });
        expect(() => validateAndMerge(baseConfig({ app: ['ns1'] }))).not.toThrow();
    });

    it('merges recipe namespaces into sorted deterministic dist JSON', () => {
        writeNamespace('en', 'ns1', { zebra: 'Z', alpha: { b: 'B', a: 'A' } });
        writeNamespace('es', 'ns1', { zebra: 'Z-es', alpha: { b: 'B-es', a: 'A-es' } });
        writeNamespace('en', 'ns2', { middle: 'M' });
        writeNamespace('es', 'ns2', { middle: 'M-es' });

        validateAndMerge(baseConfig({ app: ['ns1', 'ns2'] }));

        const merged = fs.readFileSync(path.join(distDir, 'app', 'en.json'), 'utf-8');
        expect(JSON.parse(merged)).toEqual({ alpha: { a: 'A', b: 'B' }, middle: 'M', zebra: 'Z' });
        expect(merged.indexOf('"alpha"')).toBeLessThan(merged.indexOf('"middle"'));
        expect(merged.indexOf('"middle"')).toBeLessThan(merged.indexOf('"zebra"'));
        expect(fs.existsSync(path.join(distDir, 'app', 'es.json'))).toBe(true);
    });

    it('writes one dist file per recipe containing only its namespaces', () => {
        writeNamespace('en', 'ns1', { one: '1' });
        writeNamespace('es', 'ns1', { one: '1-es' });
        writeNamespace('en', 'ns2', { two: '2' });
        writeNamespace('es', 'ns2', { two: '2-es' });

        validateAndMerge(baseConfig({ full: ['ns1', 'ns2'], slim: ['ns2'] }));

        expect(JSON.parse(fs.readFileSync(path.join(distDir, 'slim', 'en.json'), 'utf-8'))).toEqual({ two: '2' });
        expect(JSON.parse(fs.readFileSync(path.join(distDir, 'full', 'en.json'), 'utf-8'))).toEqual({
            one: '1',
            two: '2',
        });
    });
});

describe('build', () => {
    it('invokes the injected generator once per namespace with PascalCase names', async () => {
        writeNamespace('en', 'my-namespace', { a: 'A' });
        writeNamespace('es', 'my-namespace', { a: 'A-es' });
        writeNamespace('en', 'other', { b: 'B' });
        writeNamespace('es', 'other', { b: 'B-es' });

        const requests: GenerateRequest[] = [];
        await build({
            ...baseConfig({ app: ['my-namespace', 'other'] }),
            generatedDir: path.join(rootDir, 'generated'),
            generate: (request) => {
                requests.push(request);
            },
        });

        expect(requests.map((request) => request.functionName)).toEqual(['MyNamespaceKeys', 'OtherKeys']);
        expect(requests[0]?.source).toBe(path.join(localesDir, 'en', 'my-namespace.json'));
    });

    it('emits a namespace type map with generic params when requested', async () => {
        writeNamespace('en', 'pages', { a: 'A' });
        writeNamespace('es', 'pages', { a: 'A-es' });

        const generatedDir = path.join(rootDir, 'generated');
        await build(
            { ...baseConfig({ app: ['pages'] }), generatedDir, generate: () => undefined },
            { typeMapTypeParams: ['TEmbed'] },
        );

        const typeMap = fs.readFileSync(path.join(generatedDir, 'namespace-type-map.ts'), 'utf-8');
        expect(typeMap).toContain("import type { IPagesKeys } from './PagesKeys';");
        expect(typeMap).toContain('export type NamespaceTypeMap<TEmbed = string> = {');
        expect(typeMap).toContain('    pages: IPagesKeys<TEmbed>;');
    });

    it('emits a plain namespace type map without type params', async () => {
        writeNamespace('en', 'pages', { a: 'A' });
        writeNamespace('es', 'pages', { a: 'A-es' });

        const generatedDir = path.join(rootDir, 'generated');
        await build({ ...baseConfig({ app: ['pages'] }), generatedDir, generate: () => undefined });

        const typeMap = fs.readFileSync(path.join(generatedDir, 'namespace-type-map.ts'), 'utf-8');
        expect(typeMap).toContain('export type NamespaceTypeMap = {');
        expect(typeMap).toContain('    pages: IPagesKeys;');
    });
});

describe('orphan pruning', () => {
    it('removes generated entries whose namespace no longer exists', async () => {
        writeNamespace('en', 'pages', { a: 'A' });
        writeNamespace('es', 'pages', { a: 'A-es' });

        const generatedDir = path.join(rootDir, 'generated');
        fs.mkdirSync(path.join(generatedDir, 'RemovedNsKeys'), { recursive: true });
        fs.writeFileSync(path.join(generatedDir, 'OrphanKeys.ts'), 'export type IOrphanKeys = {};');
        fs.writeFileSync(path.join(generatedDir, 'RemovedNsKeys', 'index.ts'), 'export type IRemovedNsKeys = {};');

        await build({
            ...baseConfig({ app: ['pages'] }),
            generatedDir,
            generate: ({ output, functionName }) => {
                fs.writeFileSync(path.join(output, `${functionName}.ts`), `export type I${functionName} = {};`);
            },
        });

        expect(fs.existsSync(path.join(generatedDir, 'OrphanKeys.ts'))).toBe(false);
        expect(fs.existsSync(path.join(generatedDir, 'RemovedNsKeys'))).toBe(false);
        expect(fs.existsSync(path.join(generatedDir, 'PagesKeys.ts'))).toBe(true);
        expect(fs.existsSync(path.join(generatedDir, 'namespace-type-map.ts'))).toBe(true);
    });
});
