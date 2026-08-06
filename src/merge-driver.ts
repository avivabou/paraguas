import * as fs from 'node:fs';
import { sortKeysDeep } from './builder/build';

type LocaleTree = Record<string, unknown>;

export class LocaleMergeConflictError extends Error {
    constructor(keyPath: string, current: string, incoming: string) {
        super(
            `Conflict at "${keyPath}":\n` +
                `  Current:  ${current}\n` +
                `  Incoming: ${incoming}\n` +
                `Both branches modified this key with different values.`,
        );
        this.name = 'LocaleMergeConflictError';
    }
}

function isTree(value: unknown): value is LocaleTree {
    return typeof value === 'object' && value != null && !Array.isArray(value);
}

export function mergeLocaleTrees(base: LocaleTree, current: LocaleTree, incoming: LocaleTree, currentPath = ''): LocaleTree {
    const result: LocaleTree = {};
    const allKeys = new Set([...Object.keys(current), ...Object.keys(incoming)]);

    for (const key of allKeys) {
        const keyPath = currentPath !== '' ? `${currentPath}.${key}` : key;
        const baseVal = base[key];
        const currentVal = current[key];
        const incomingVal = incoming[key];

        const currentJson = JSON.stringify(currentVal);
        const incomingJson = JSON.stringify(incomingVal);
        const baseJson = JSON.stringify(baseVal);

        if (currentJson === incomingJson) {
            if (currentVal !== undefined) result[key] = currentVal;
            continue;
        }
        if (incomingVal === undefined) {
            result[key] = currentVal;
            continue;
        }
        if (currentVal === undefined) {
            result[key] = incomingVal;
            continue;
        }
        if (isTree(currentVal) && isTree(incomingVal)) {
            result[key] = mergeLocaleTrees(isTree(baseVal) ? baseVal : {}, currentVal, incomingVal, keyPath);
            continue;
        }

        const currentModified = currentJson !== baseJson;
        const incomingModified = incomingJson !== baseJson;
        if (currentModified && incomingModified) {
            throw new LocaleMergeConflictError(keyPath, currentJson, incomingJson);
        }
        result[key] = incomingModified ? incomingVal : currentVal;
    }

    return result;
}

export function parseConflictMarkers(content: string): { base: LocaleTree; current: LocaleTree; incoming: LocaleTree } {
    if (!content.includes('<<<<<<<') || !content.includes('>>>>>>>')) {
        throw new Error('No conflict markers found in file');
    }

    const diff3Regex = /<<<<<<< [^\n]*\n([\s\S]*?)\|\|\|\|\|\|\| [^\n]*\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> [^\n]*/;
    const simpleRegex = /<<<<<<< [^\n]*\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> [^\n]*/;

    const diff3Match = diff3Regex.exec(content);
    const simpleMatch = diff3Match == null ? simpleRegex.exec(content) : null;
    if (diff3Match == null && simpleMatch == null) {
        throw new Error('Could not parse conflict markers');
    }

    const [currentContent, baseContent, incomingContent] =
        diff3Match != null ? [diff3Match[1], diff3Match[2], diff3Match[3]] : [simpleMatch?.[1], '{}', simpleMatch?.[2]];

    try {
        return {
            base: JSON.parse((baseContent ?? '{}').trim() || '{}') as LocaleTree,
            current: JSON.parse((currentContent ?? '').trim()) as LocaleTree,
            incoming: JSON.parse((incomingContent ?? '').trim()) as LocaleTree,
        };
    } catch (error) {
        throw new Error(`Failed to parse JSON from conflict sections: ${(error as Error).message}`);
    }
}

const HELP = `paraguas-merge-locales — 3-way merge for locale JSON files

Usage:
  As a git merge driver (writes the result to <current>, git's %A):
    paraguas-merge-locales --driver <base> <current> <incoming>

  To resolve a file with conflict markers in place:
    paraguas-merge-locales --resolve <file>

Merge semantics:
  one side changed a key            -> take that change
  both sides made the same change   -> keep it
  both sides changed it differently -> fail (real conflict)
`;

function writeTree(filePath: string, tree: LocaleTree): void {
    fs.writeFileSync(filePath, `${JSON.stringify(sortKeysDeep(tree), null, 4)}\n`);
}

export function runMergeDriverCli(args: string[]): number {
    if (args[0] === '--driver' && args.length === 4) {
        const [, basePath, currentPath, incomingPath] = args;
        try {
            const base = JSON.parse(fs.readFileSync(basePath as string, 'utf8')) as LocaleTree;
            const current = JSON.parse(fs.readFileSync(currentPath as string, 'utf8')) as LocaleTree;
            const incoming = JSON.parse(fs.readFileSync(incomingPath as string, 'utf8')) as LocaleTree;
            writeTree(currentPath as string, mergeLocaleTrees(base, current, incoming));
            console.log('✓ Successfully merged locale JSON');
            return 0;
        } catch (error) {
            console.error('✗ Merge failed:', (error as Error).message);
            return 1;
        }
    }

    if (args[0] === '--resolve' && args[1] != null) {
        const filePath = args[1];
        try {
            const { base, current, incoming } = parseConflictMarkers(fs.readFileSync(filePath, 'utf8'));
            writeTree(filePath, mergeLocaleTrees(base, current, incoming));
            console.log(`✓ Successfully resolved conflicts in ${filePath}`);
            console.log('  Run "git add" to mark as resolved');
            return 0;
        } catch (error) {
            console.error('✗ Resolution failed:', (error as Error).message);
            return 1;
        }
    }

    console.log(HELP);
    return args.length === 0 ? 0 : 1;
}
