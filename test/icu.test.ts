import { describe, expect, it } from 'vitest';
import { extractIcuParams } from '../src/builder/icu';

describe('extractIcuParams', () => {
    it('extracts a single param', () => {
        expect(extractIcuParams('Hey, {username}!')).toEqual(['username']);
    });

    it('extracts multiple params in appearance order', () => {
        expect(extractIcuParams('{failureType} sync failed in {accountingName}')).toEqual([
            'failureType',
            'accountingName',
        ]);
    });

    it('dedupes repeated params', () => {
        expect(extractIcuParams('Change it in {accountingName}, then retry in {accountingName}')).toEqual([
            'accountingName',
        ]);
    });

    it('returns empty for plain text', () => {
        expect(extractIcuParams('Just a sentence.')).toEqual([]);
    });

    it('flattens nested plural/select params', () => {
        const value =
            '{count, plural, =0 {no {items}} one {# {gender, select, male {his} female {her} other {their}} {item}} other {# {items}}}';
        expect(extractIcuParams(value)).toEqual(['count', 'items', 'gender', 'item']);
    });

    it('ignores the # element inside plural', () => {
        expect(extractIcuParams('{count, plural, one {# item} other {# items}}')).toEqual(['count']);
    });

    it('supports number/date/time argument types', () => {
        expect(extractIcuParams('{amount, number} due {when, date, short}')).toEqual(['amount', 'when']);
    });

    it('returns empty on unparsable ICU instead of throwing', () => {
        expect(extractIcuParams('broken {unclosed')).toEqual([]);
    });

    it('reports parse failures through onWarn', () => {
        const warnings: string[] = [];
        extractIcuParams('broken {unclosed', { onWarn: (message) => warnings.push(message) });
        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toContain('broken {unclosed');
    });

    it('double-brace mode treats {{param}} as a param', () => {
        expect(extractIcuParams('Hey {{username}}, welcome', { singleCurlyBraces: false })).toEqual(['username']);
    });

    it('extracts params from embed-tagged text', () => {
        expect(extractIcuParams('{failureType} failed. <readMore>Read more</readMore>.')).toEqual(['failureType']);
    });
});
