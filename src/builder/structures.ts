import type { TokenStructure as CodegenTokenStructure } from 'keys-weaver';
import { BASIC_HTML_TAGS } from '../runtime/tokens';
import { extractIcuParams } from './icu';

export interface IcuDataOptions {
    singleCurlyBraces?: boolean;
    onWarn?: (message: string) => void;
}

export function icuData(options: IcuDataOptions = {}): CodegenTokenStructure {
    return {
        name: 'data',
        detect: (value) => extractIcuParams(value, options),
        tokenType: 'unknown',
        fieldsTypeName: 'DataFields',
    };
}

export const EMBED_TAG_PATTERN = /<(\w+)>(.*?)<\/\1>/g;

export interface TaggedEmbedsOptions {
    name?: string;
    elementType?: string;
    exclude?: string[];
}

export function taggedEmbeds(options: TaggedEmbedsOptions = {}): CodegenTokenStructure {
    const { name = 'embeds', elementType = 'JSX.Element', exclude = BASIC_HTML_TAGS } = options;
    return {
        name,
        detect: EMBED_TAG_PATTERN,
        tokenType: elementType,
        fieldsTypeName: 'EmbedFields',
        exclude,
        returnWhenPresent: elementType,
    };
}
