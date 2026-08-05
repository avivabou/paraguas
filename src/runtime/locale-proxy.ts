import type { TokenRenderer, TokenWrappers } from './tokens';

export type NestedPaths<T, Prefix extends string = ''> = T extends object
    ? {
          [K in keyof T & string]: T[K] extends (...args: never[]) => unknown
              ? never
              : Prefix extends ''
                ? K | NestedPaths<T[K], K>
                : `${Prefix}.${K}` | NestedPaths<T[K], `${Prefix}.${K}`>;
      }[keyof T & string]
    : never;

export type GetNestedValue<T, Path extends string> = Path extends `${infer First}.${infer Rest}`
    ? First extends keyof T
        ? GetNestedValue<T[First], Rest>
        : never
    : Path extends keyof T
      ? T[Path]
      : never;

export class MissingTokenRendererError extends Error {
    constructor(path: string) {
        super(
            `Locale key "${path}" was called with token wrappers, but no renderTokens was configured on this proxy`,
        );
        this.name = 'MissingTokenRendererError';
    }
}

export interface LocaleProxyOptions {
    renderTokens?: TokenRenderer;
}

export type Translate = (key: string, values?: Record<string, unknown>) => string;

function isWrapperRecord(value: unknown): value is TokenWrappers<unknown> {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) return false;
    const entries = Object.values(value);
    return entries.length > 0 && entries.every((entry) => typeof entry === 'function');
}

function createProxyNode(t: Translate, options: LocaleProxyOptions, path: string): unknown {
    const target = (() => undefined) as unknown as Record<string | symbol, unknown>;
    return new Proxy(target, {
        get(_ignored, property) {
            if (typeof property !== 'string') return undefined;
            return createProxyNode(t, options, path === '' ? property : `${path}.${property}`);
        },
        apply(_ignored, _thisArg, args: unknown[]) {
            const finalPath = path.split('.$value')[0] as string;
            const last = args[args.length - 1];
            const wrappers = isWrapperRecord(last) ? last : undefined;
            const dataArgs = wrappers == null ? args : args.slice(0, -1);
            const text = t(finalPath, ...(dataArgs as [Record<string, unknown>?]));
            if (wrappers == null) return text;
            if (options.renderTokens == null) throw new MissingTokenRendererError(finalPath);
            return options.renderTokens(text, wrappers as TokenWrappers<never>);
        },
    });
}

export function createLocaleProxy<T>(t: Translate, options: LocaleProxyOptions = {}): T {
    return createProxyNode(t, options, '') as T;
}
