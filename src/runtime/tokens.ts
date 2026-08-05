export interface TokenStructure {
    id: string;
    pattern: RegExp;
    malformedPattern?: RegExp;
}

export const bracketTagStructure: TokenStructure = {
    id: 'embed',
    pattern: /\[(\w+)\](.*?)\[\/\1\]/g,
    malformedPattern: /\[\/?\w+\]/g,
};

export type TokenWrappers<T> = Record<string, (label: string) => T>;

export type TokenRenderer<T = never> = (text: string, wrappers: TokenWrappers<T>) => unknown;

export function splitWithTokens<T>(
    text: string,
    wrappers: TokenWrappers<T>,
    structure: TokenStructure = bracketTagStructure,
): Array<string | T> {
    const pattern = new RegExp(structure.pattern.source, structure.pattern.flags);
    const parts: Array<string | T> = [];
    let cursor = 0;
    for (const match of text.matchAll(pattern)) {
        const [taggedLabel, name, label] = match;
        parts.push(text.slice(cursor, match.index));
        const wrap = name != null ? wrappers[name] : undefined;
        parts.push(wrap != null ? wrap(label ?? '') : (label ?? ''));
        cursor = (match.index ?? 0) + taggedLabel.length;
    }
    parts.push(text.slice(cursor));
    return parts;
}

export const stringTokenRenderer: TokenRenderer<string> = (text, wrappers) =>
    splitWithTokens(text, wrappers).join('');
