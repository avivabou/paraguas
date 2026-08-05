type DeepMergeTwo<A, B> = {
    [K in keyof A | keyof B]: K extends keyof A & keyof B
        ? A[K] extends object
            ? B[K] extends object
                ? DeepMergeTwo<A[K], B[K]>
                : A[K]
            : A[K]
        : K extends keyof A
          ? A[K]
          : K extends keyof B
            ? B[K]
            : never;
};

type DeepMergeAll<T extends readonly unknown[]> = T extends readonly [infer First, ...infer Rest]
    ? Rest extends readonly []
        ? First
        : DeepMergeTwo<First, DeepMergeAll<Rest>>
    : object;

export type DeepMerge<T extends readonly unknown[]> = DeepMergeAll<T>;

export type MapNamespaces<Namespaces extends readonly string[], TypeMap> = {
    [K in keyof Namespaces]: Namespaces[K] extends keyof TypeMap ? TypeMap[Namespaces[K]] : never;
};

export type LocaleKeysOf<
    Recipes extends Record<string, readonly string[]>,
    TypeMap,
    R extends keyof Recipes,
> = MapNamespaces<Recipes[R], TypeMap> extends readonly unknown[] ? DeepMerge<MapNamespaces<Recipes[R], TypeMap>> : never;
