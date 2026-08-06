import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    LocaleMergeConflictError,
    mergeLocaleTrees,
    parseConflictMarkers,
    runMergeDriverCli,
} from '../src/merge-driver';

describe('mergeLocaleTrees', () => {
    it('takes a key only one side added', () => {
        const merged = mergeLocaleTrees({}, { a: 'A' }, { b: 'B' });
        expect(merged).toEqual({ a: 'A', b: 'B' });
    });

    it('keeps identical changes from both sides', () => {
        const merged = mergeLocaleTrees({ a: 'old' }, { a: 'new' }, { a: 'new' });
        expect(merged).toEqual({ a: 'new' });
    });

    it('takes the incoming change when only incoming modified', () => {
        const merged = mergeLocaleTrees({ a: 'old' }, { a: 'old' }, { a: 'new' });
        expect(merged).toEqual({ a: 'new' });
    });

    it('takes the current change when only current modified', () => {
        const merged = mergeLocaleTrees({ a: 'old' }, { a: 'new' }, { a: 'old' });
        expect(merged).toEqual({ a: 'new' });
    });

    it('recurses into shared branches', () => {
        const merged = mergeLocaleTrees(
            { common: { a: 'A' } },
            { common: { a: 'A', mine: 'M' } },
            { common: { a: 'A', theirs: 'T' } },
        );
        expect(merged).toEqual({ common: { a: 'A', mine: 'M', theirs: 'T' } });
    });

    it('throws when both sides changed the same key differently', () => {
        expect(() => mergeLocaleTrees({ a: 'old' }, { a: 'mine' }, { a: 'theirs' })).toThrow(LocaleMergeConflictError);
        expect(() => mergeLocaleTrees({ a: 'old' }, { a: 'mine' }, { a: 'theirs' })).toThrow(/Conflict at "a"/);
    });
});

describe('parseConflictMarkers', () => {
    it('parses the diff3 format with a base section', () => {
        const content = [
            '<<<<<<< HEAD',
            '{ "a": "mine" }',
            '||||||| base',
            '{ "a": "old" }',
            '=======',
            '{ "a": "old", "b": "B" }',
            '>>>>>>> other',
        ].join('\n');

        expect(parseConflictMarkers(content)).toEqual({
            base: { a: 'old' },
            current: { a: 'mine' },
            incoming: { a: 'old', b: 'B' },
        });
    });

    it('parses the simple format with an empty base', () => {
        const content = ['<<<<<<< HEAD', '{ "a": "mine" }', '=======', '{ "b": "B" }', '>>>>>>> other'].join('\n');
        expect(parseConflictMarkers(content)).toEqual({ base: {}, current: { a: 'mine' }, incoming: { b: 'B' } });
    });

    it('throws when no markers exist', () => {
        expect(() => parseConflictMarkers('{ "a": 1 }')).toThrow(/No conflict markers/);
    });
});

describe('runMergeDriverCli --driver', () => {
    it('merges three files and writes the sorted result to the current path', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paraguas-merge-'));
        const write = (name: string, tree: object): string => {
            const filePath = path.join(dir, name);
            fs.writeFileSync(filePath, JSON.stringify(tree));
            return filePath;
        };
        const basePath = write('base.json', { zebra: 'Z' });
        const currentPath = write('current.json', { zebra: 'Z', mine: 'M' });
        const incomingPath = write('incoming.json', { zebra: 'Z', alpha: 'A' });

        const code = runMergeDriverCli(['--driver', basePath, currentPath, incomingPath]);

        expect(code).toBe(0);
        const written = fs.readFileSync(currentPath, 'utf8');
        expect(JSON.parse(written)).toEqual({ alpha: 'A', mine: 'M', zebra: 'Z' });
        expect(written.indexOf('alpha')).toBeLessThan(written.indexOf('mine'));
    });

    it('returns 1 on a real conflict', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paraguas-merge-'));
        const write = (name: string, tree: object): string => {
            const filePath = path.join(dir, name);
            fs.writeFileSync(filePath, JSON.stringify(tree));
            return filePath;
        };
        const code = runMergeDriverCli([
            '--driver',
            write('base.json', { a: 'old' }),
            write('current.json', { a: 'mine' }),
            write('incoming.json', { a: 'theirs' }),
        ]);
        expect(code).toBe(1);
    });
});
