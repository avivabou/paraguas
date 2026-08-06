import { useTranslation } from 'react-i18next';
import type { i18n as I18n } from 'i18next';
import { createLocaleProxy, type LocaleProxyOptions } from './runtime/locale-proxy';
import { getNestedValue } from './runtime/get-nested-value';
import type { GetNestedValue, NestedPaths } from './runtime/locale-proxy';

export interface UseLocaleKeysResult<TKeys, P> {
    t: P extends string ? GetNestedValue<TKeys, P> : TKeys;
    i18n: I18n;
    ready: boolean;
}

export function createUseLocaleKeys<TKeys>(options: LocaleProxyOptions = {}) {
    return function useLocaleKeys<P extends NestedPaths<TKeys> | undefined = undefined>(
        path?: P,
    ): UseLocaleKeysResult<TKeys, P> {
        const { i18n, ready } = useTranslation();
        const fullT = createLocaleProxy<TKeys>(i18n.t.bind(i18n), options);
        return {
            t: (path != null ? getNestedValue(fullT, path) : fullT) as UseLocaleKeysResult<TKeys, P>['t'],
            i18n,
            ready,
        };
    };
}
