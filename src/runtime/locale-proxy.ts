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

export class MissingRenderKeyError extends Error {
    constructor(path: string) {
        super(`Locale key "${path}" was called with component wrappers, but no renderKey was configured on this proxy`);
        this.name = 'MissingRenderKeyError';
    }
}

export type RenderKey = (
    path: string,
    data: Record<string, unknown> | undefined,
    wrappers: Record<string, unknown>,
) => unknown;

export interface LocaleProxyOptions {
    renderKey?: RenderKey;
}

export type Translate = (key: string, values?: Record<string, unknown>) => string;

function isReactElementLike(value: unknown): boolean {
    return typeof value === 'object' && value != null && typeof (value as { $$typeof?: unknown }).$$typeof === 'symbol';
}

function isWrapperRecord(value: unknown): value is Record<string, unknown> {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) return false;
    const entries = Object.values(value);
    if (entries.length === 0) return false;
    return entries.every((entry) => typeof entry === 'function') || entries.every(isReactElementLike);
}

function createProxyNode(t: Translate, options: LocaleProxyOptions, path: string): unknown {
    const target = (() => undefined) as unknown as Record<string | symbol, unknown>;
    return new Proxy(target, {
        get(_ignored, property) {
            if (typeof property !== 'string' || property === 'then') return undefined;
            return createProxyNode(t, options, path === '' ? property : `${path}.${property}`);
        },
        apply(_ignored, _thisArg, args: unknown[]) {
            const finalPath = path.split('.$value')[0] as string;
            const last = args[args.length - 1];
            const wrappers = isWrapperRecord(last) ? last : undefined;
            const dataArgs = wrappers == null ? args : args.slice(0, -1);
            const data = dataArgs[0] as Record<string, unknown> | undefined;
            if (wrappers != null) {
                if (options.renderKey == null) throw new MissingRenderKeyError(finalPath);
                return options.renderKey(finalPath, data, wrappers);
            }
            return data === undefined ? t(finalPath) : t(finalPath, data);
        },
    });
}

export function createLocaleProxy<T>(t: Translate, options: LocaleProxyOptions = {}): T {
    return createProxyNode(t, options, '') as T;
}
