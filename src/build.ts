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
export { bracketTagStructure, type TokenStructure } from './runtime/tokens';
export { generate, generateSync, icuData, taggedEmbeds } from 'keys-weaver';
export type { GenerateOptions, TokenStructure as CodegenTokenStructure } from 'keys-weaver';
