export const BASIC_HTML_TAGS = ['br', 'strong', 'i', 'p'];

export interface TokenStructure {
    id: string;
    pattern: RegExp;
    malformedPattern?: RegExp;
    exclude?: string[];
}

export const angleTagStructure: TokenStructure = {
    id: 'embed',
    pattern: /<(\w+)>(.*?)<\/\1>/g,
    malformedPattern: /<\/?\w+>/g,
    exclude: BASIC_HTML_TAGS,
};
