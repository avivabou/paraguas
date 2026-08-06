import { IntlMessageFormat } from 'intl-messageformat';

export class TranslationKeyError extends Error {
    constructor(key: string) {
        super(`Translation key not found: ${key}`);
        this.name = 'TranslationKeyError';
    }
}

export interface TranslationResolver {
    t(key: string, values?: Record<string, unknown>): string;
}

export interface CreateTranslationResolverOptions {
    primary: Record<string, unknown>;
    fallback?: Record<string, unknown>;
    locale?: string;
}

function resolveKey(translations: Record<string, unknown>, key: string): string | undefined {
    const parts = key.split('.');
    let current: unknown = translations;
    for (const part of parts) {
        if (current == null || typeof current !== 'object') {
            return undefined;
        }
        current = (current as Record<string, unknown>)[part];
    }
    return typeof current === 'string' ? current : undefined;
}

export function createTranslationResolver(options: CreateTranslationResolverOptions): TranslationResolver {
    const { primary, fallback, locale = 'en' } = options;

    return {
        t(key: string, values?: Record<string, unknown>): string {
            const template = resolveKey(primary, key) ?? (fallback != null ? resolveKey(fallback, key) : undefined);
            if (template == null) {
                throw new TranslationKeyError(key);
            }
            if (values == null) {
                return template;
            }
            const message = new IntlMessageFormat(template, locale, undefined, { ignoreTag: true });
            return message.format(values) as string;
        },
    };
}
