import * as fs from 'node:fs';
import * as path from 'node:path';
import type { TokenStructure } from '../runtime/tokens';

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export interface GenerateRequest {
    source: string;
    output: string;
    functionName: string;
}

export interface ParaguasBuildConfig {
    localesDir: string;
    distDir: string;
    languages: readonly string[];
    recipes: Record<string, readonly string[]>;
    structures?: TokenStructure[];
    generatedDir?: string;
    generate?: (request: GenerateRequest) => Promise<unknown> | unknown;
    functionNameFor?: (namespace: string) => string;
}

export function getLeafPaths(obj: unknown, prefix = ''): string[] {
    if (obj == null || typeof obj !== 'object') return prefix !== '' ? [prefix] : [];
    const paths: string[] = [];
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        const leafPath = prefix !== '' ? `${prefix}.${key}` : key;
        if (value != null && typeof value === 'object' && !Array.isArray(value)) {
            paths.push(...getLeafPaths(value, leafPath));
        } else {
            paths.push(leafPath);
        }
    }
    return paths;
}

function getLeafValue(obj: unknown, leafPath: string): unknown {
    return leafPath.split('.').reduce<unknown>((node, key) => {
        if (node == null || typeof node !== 'object') return undefined;
        return (node as Record<string, unknown>)[key];
    }, obj);
}

function getStructureTags(value: unknown, structure: TokenStructure): string[] {
    if (typeof value !== 'string') return [];
    const pattern = new RegExp(structure.pattern.source, structure.pattern.flags);
    return [...value.matchAll(pattern)].map((match) => match[1] ?? '').sort();
}

function getMalformedTokens(value: unknown, structure: TokenStructure): string[] {
    if (typeof value !== 'string' || structure.malformedPattern == null) return [];
    const pattern = new RegExp(structure.pattern.source, structure.pattern.flags);
    const withoutPairs = value.replace(pattern, '');
    const malformedPattern = new RegExp(structure.malformedPattern.source, structure.malformedPattern.flags);
    return [...withoutPairs.matchAll(malformedPattern)].map((match) => match[0]);
}

function validateTokenParity({
    ns,
    refLang,
    otherLang,
    refData,
    otherData,
    leafPaths,
    structures,
}: {
    ns: string;
    refLang: string;
    otherLang: string;
    refData: Record<string, unknown>;
    otherData: Record<string, unknown>;
    leafPaths: string[];
    structures: TokenStructure[];
}): void {
    const mismatches: string[] = [];
    for (const structure of structures) {
        for (const leafPath of leafPaths) {
            const refValue = getLeafValue(refData, leafPath);
            const otherValue = getLeafValue(otherData, leafPath);
            for (const [lang, value] of [
                [refLang, refValue],
                [otherLang, otherValue],
            ] as const) {
                const malformed = getMalformedTokens(value, structure);
                if (malformed.length > 0) {
                    mismatches.push(
                        `  ${leafPath}: unpaired ${structure.id} token(s) in ${lang}: ${malformed.join(', ')}`,
                    );
                }
            }
            const refTags = getStructureTags(refValue, structure);
            const otherTags = getStructureTags(otherValue, structure);
            if (refTags.join(',') !== otherTags.join(',')) {
                mismatches.push(
                    `  ${leafPath}: ${refLang} has [${refTags.join(', ')}], ${otherLang} has [${otherTags.join(', ')}]`,
                );
            }
        }
    }
    if (mismatches.length > 0) {
        throw new ValidationError(`Token parity mismatch in namespace "${ns}":\n${mismatches.join('\n')}`);
    }
}

export function sortKeysDeep(obj: Record<string, unknown>): Record<string, unknown> {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
        const val = obj[key];
        sorted[key] =
            val != null && typeof val === 'object' && !Array.isArray(val)
                ? sortKeysDeep(val as Record<string, unknown>)
                : val;
    }
    return sorted;
}

export function deepMergeObjects(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
): Record<string, unknown> {
    const result = { ...target };
    for (const [key, val] of Object.entries(source)) {
        if (
            val != null &&
            typeof val === 'object' &&
            !Array.isArray(val) &&
            key in result &&
            typeof result[key] === 'object' &&
            result[key] != null
        ) {
            result[key] = deepMergeObjects(result[key] as Record<string, unknown>, val as Record<string, unknown>);
        } else {
            result[key] = val;
        }
    }
    return result;
}

export function defaultFunctionNameFor(namespace: string): string {
    return (
        namespace
            .split(/[-_]/)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join('') + 'Keys'
    );
}

export function validateAndMerge(config: ParaguasBuildConfig): void {
    const { localesDir, distDir, recipes, languages, structures = [] } = config;
    const allNamespaces = new Set<string>();
    for (const namespaces of Object.values(recipes)) {
        for (const ns of namespaces) {
            allNamespaces.add(ns);
        }
    }

    const leafOwner = new Map<string, string>();
    const namespaceData: Record<string, Record<string, Record<string, unknown>>> = {};

    for (const ns of allNamespaces) {
        const perLanguage: Record<string, Record<string, unknown>> = {};
        namespaceData[ns] = perLanguage;

        for (const lang of languages) {
            const filePath = path.join(localesDir, lang, `${ns}.json`);
            if (!fs.existsSync(filePath)) {
                throw new ValidationError(`Namespace file not found: ${filePath} (namespace: ${ns})`);
            }
            perLanguage[lang] = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
        }

        const refLang = languages[0];
        if (refLang == null) throw new ValidationError('At least one language is required');
        const refData = perLanguage[refLang];
        if (refData == null) throw new ValidationError(`Missing reference language data for "${ns}"`);
        const refPaths = getLeafPaths(refData);

        for (const leafPath of refPaths) {
            const existing = leafOwner.get(leafPath);
            if (existing != null) {
                throw new ValidationError(`Leaf path collision: "${leafPath}" exists in both "${existing}" and "${ns}"`);
            }
            leafOwner.set(leafPath, ns);
        }

        for (const otherLang of languages.slice(1)) {
            const otherData = perLanguage[otherLang];
            if (otherData == null) continue;
            const otherPaths = new Set(getLeafPaths(otherData));
            const refPathSet = new Set(refPaths);

            const missingInOther = refPaths.filter((p) => !otherPaths.has(p));
            const extraInOther = [...otherPaths].filter((p) => !refPathSet.has(p));

            if (missingInOther.length > 0 || extraInOther.length > 0) {
                const details = [
                    ...missingInOther.map((p) => `  Missing in ${otherLang}: ${p}`),
                    ...extraInOther.map((p) => `  Extra in ${otherLang}: ${p}`),
                ];
                throw new ValidationError(`Key parity mismatch in namespace "${ns}":\n${details.join('\n')}`);
            }

            validateTokenParity({ ns, refLang, otherLang, refData, otherData, leafPaths: refPaths, structures });
        }
    }

    for (const [recipeName, namespaces] of Object.entries(recipes)) {
        const recipeDir = path.join(distDir, recipeName);
        fs.mkdirSync(recipeDir, { recursive: true });

        for (const lang of languages) {
            let merged: Record<string, unknown> = {};
            for (const ns of namespaces) {
                const data = namespaceData[ns]?.[lang];
                if (data != null) merged = deepMergeObjects(merged, data);
            }
            merged = sortKeysDeep(merged);
            fs.writeFileSync(path.join(recipeDir, `${lang}.json`), JSON.stringify(merged, null, 2) + '\n');
        }
    }
}

function listNamespaces(localesDir: string, refLang: string): string[] {
    const refDir = path.join(localesDir, refLang);
    if (!fs.existsSync(refDir)) return [];
    return fs
        .readdirSync(refDir)
        .filter((file) => file.endsWith('.json'))
        .map((file) => file.replace(/\.json$/, ''))
        .sort();
}

async function generateNamespaceTypes(config: ParaguasBuildConfig): Promise<void> {
    const { localesDir, languages, generatedDir, generate } = config;
    if (generatedDir == null || generate == null) return;
    const refLang = languages[0];
    if (refLang == null) return;

    fs.mkdirSync(generatedDir, { recursive: true });
    const functionNameFor = config.functionNameFor ?? defaultFunctionNameFor;

    for (const ns of listNamespaces(localesDir, refLang)) {
        await generate({
            source: path.join(localesDir, refLang, `${ns}.json`),
            output: generatedDir,
            functionName: functionNameFor(ns),
        });
    }
}

function generateNamespaceTypeMap(config: ParaguasBuildConfig, typeParams: string[]): void {
    const { localesDir, languages, generatedDir } = config;
    if (generatedDir == null) return;
    const refLang = languages[0];
    if (refLang == null) return;

    const functionNameFor = config.functionNameFor ?? defaultFunctionNameFor;
    const namespaces = listNamespaces(localesDir, refLang);

    const declaration = typeParams.length > 0 ? `<${typeParams.map((p) => `${p} = string`).join(', ')}>` : '';
    const reference = typeParams.length > 0 ? `<${typeParams.join(', ')}>` : '';

    const imports = namespaces.map((ns) => {
        const functionName = functionNameFor(ns);
        return `import type { I${functionName} } from './${functionName}';`;
    });
    const entries = namespaces.map((ns) => `    ${ns}: I${functionNameFor(ns)}${reference};`);

    const content = [
        '/* eslint-disable */',
        '/* Auto-generated by paraguas build — do not edit */',
        ...imports,
        '',
        `export type NamespaceTypeMap${declaration} = {`,
        ...entries,
        '};',
        '',
    ].join('\n');

    fs.writeFileSync(path.join(generatedDir, 'namespace-type-map.ts'), content);
}

export interface BuildExtras {
    typeMapTypeParams?: string[];
}

export async function build(config: ParaguasBuildConfig, extras: BuildExtras = {}): Promise<void> {
    validateAndMerge(config);
    await generateNamespaceTypes(config);
    generateNamespaceTypeMap(config, extras.typeMapTypeParams ?? []);
}
