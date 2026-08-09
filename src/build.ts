export {
    build,
    validateAndMerge,
    ValidationError,
    defaultFunctionNameFor,
    getLeafPaths,
    sortKeysDeep,
    deepMergeObjects,
    type ParaguasBuildConfig,
    type GenerateRequest,
    type BuildExtras,
} from './builder/build';
export { angleTagStructure, BASIC_HTML_TAGS, type TokenStructure } from './runtime/tokens';
export {
    icuData,
    taggedEmbeds,
    EMBED_TAG_PATTERN,
    type IcuDataOptions,
    type TaggedEmbedsOptions,
} from './builder/structures';
export { extractIcuParams, type ExtractIcuParamsOptions } from './builder/icu';
export { generate, generateSync } from 'keys-weaver';
export type { GenerateOptions, TokenStructure as CodegenTokenStructure } from 'keys-weaver';
