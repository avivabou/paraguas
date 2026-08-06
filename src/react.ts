import { createElement, Fragment, type ReactNode } from 'react';
import { splitWithTokens, type TokenWrappers } from './runtime/tokens';

export const reactTokenRenderer = (text: string, wrappers: TokenWrappers<ReactNode>): JSX.Element =>
    createElement(
        Fragment,
        null,
        ...splitWithTokens(text, wrappers).map((part, index) => createElement(Fragment, { key: index }, part)),
    );
