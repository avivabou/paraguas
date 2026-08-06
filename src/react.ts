import { cloneElement, createElement, Fragment, isValidElement, type ReactNode } from 'react';
import { splitWithTokens, type TokenWrappers } from './runtime/tokens';

function toWrapperFunctions(wrappers: Record<string, ReactNode | ((label: string) => ReactNode)>): TokenWrappers<ReactNode> {
    return Object.fromEntries(
        Object.entries(wrappers).map(([tag, wrapper]) => [
            tag,
            typeof wrapper === 'function'
                ? (wrapper as (label: string) => ReactNode)
                : (label: string): ReactNode => (isValidElement(wrapper) ? cloneElement(wrapper, undefined, label) : label),
        ]),
    );
}

export const reactTokenRenderer = (
    text: string,
    wrappers: Record<string, ReactNode | ((label: string) => ReactNode)>,
): JSX.Element =>
    createElement(
        Fragment,
        null,
        ...splitWithTokens(text, toWrapperFunctions(wrappers)).map((part, index) =>
            createElement(Fragment, { key: index }, part),
        ),
    );
