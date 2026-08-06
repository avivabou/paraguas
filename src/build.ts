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
export { generate, generateSync, icuData, taggedEmbeds } from 'keys-weaver';
export type { GenerateOptions, TokenStructure as CodegenTokenStructure } from 'keys-weaver';
