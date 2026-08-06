import { Children, isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { reactTokenRenderer } from '../src/react';

function collectText(node: ReactNode): string {
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(collectText).join('');
    if (isValidElement(node)) return collectText((node.props as { children?: ReactNode }).children);
    return '';
}

describe('reactTokenRenderer', () => {
    it('interleaves text and wrapped elements inside a fragment', () => {
        const result = reactTokenRenderer('Go <x>here</x> now', {
            x: (label) => <strong>{label}</strong>,
        });

        expect(isValidElement(result)).toBe(true);
        expect(collectText(result)).toBe('Go here now');

        const parts = Children.toArray((result.props as { children: ReactNode }).children);
        expect(parts).toHaveLength(3);
    });

    it('keys every part fragment for stable reconciliation', () => {
        const result = reactTokenRenderer('[a]one[/a][b]two[/b]', {
            a: (label) => <em>{label}</em>,
            b: (label) => <em>{label}</em>,
        });

        const parts = Children.toArray((result.props as { children: ReactNode }).children);
        const keys = parts.map((part) => (isValidElement(part) ? part.key : null));
        expect(keys.every((key) => key != null)).toBe(true);
    });

    it('renders plain labels for missing wrappers', () => {
        const result = reactTokenRenderer('Click <missing>here</missing>.', {});
        expect(collectText(result)).toBe('Click here.');
    });
});
