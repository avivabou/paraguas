import { describe, expect, it } from 'vitest';
import { splitWithTokens, stringTokenRenderer } from '../src/runtime/tokens';

describe('splitWithTokens', () => {
    it('splits text around a tag and applies the wrapper', () => {
        expect(splitWithTokens('Go [x]here[/x] now', { x: (label) => `<${label}>` })).toEqual([
            'Go ',
            '<here>',
            ' now',
        ]);
    });

    it('supports multiple distinct tags', () => {
        expect(
            splitWithTokens('[a]Start[/a] mid [b]End[/b]', { a: (l) => `A:${l}`, b: (l) => `B:${l}` }),
        ).toEqual(['', 'A:Start', ' mid ', 'B:End', '']);
    });

    it('falls back to the plain label when a wrapper is missing', () => {
        expect(splitWithTokens('See [x]docs[/x]', {})).toEqual(['See ', 'docs', '']);
    });

    it('wraps repeated tags at every occurrence', () => {
        expect(splitWithTokens('[x]a[/x][x]b[/x]', { x: (l) => `${l}!` })).toEqual(['', 'a!', '', 'b!', '']);
    });

    it('returns the whole text when no tags exist', () => {
        expect(splitWithTokens('plain', { x: (l) => l })).toEqual(['plain']);
    });

    it('supports a custom structure pattern', () => {
        const structure = { id: 'angle', pattern: /<(\w+)>(.*?)<\/\1>/g };
        expect(splitWithTokens('Hi <b>bold</b>!', { b: (l) => l.toUpperCase() }, structure)).toEqual([
            'Hi ',
            'BOLD',
            '!',
        ]);
    });
});

describe('stringTokenRenderer', () => {
    it('joins parts into a single string', () => {
        expect(stringTokenRenderer('Click [undo]Undo[/undo] now', { undo: (label) => `<${label}>` })).toBe(
            'Click <Undo> now',
        );
    });
});
