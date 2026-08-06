export function getNestedValue(source: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((node, key) => {
        if (node == null || (typeof node !== 'object' && typeof node !== 'function')) return undefined;
        return (node as Record<string, unknown>)[key];
    }, source);
}
