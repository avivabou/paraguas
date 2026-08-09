import {
    parse,
    TYPE,
    type MessageFormatElement,
} from '@formatjs/icu-messageformat-parser';

export interface ExtractIcuParamsOptions {
    singleCurlyBraces?: boolean;
    onWarn?: (message: string) => void;
}

function collectParams(elements: MessageFormatElement[], params: Set<string>): void {
    for (const element of elements) {
        switch (element.type) {
            case TYPE.argument:
            case TYPE.number:
            case TYPE.date:
            case TYPE.time:
                params.add(element.value);
                break;
            case TYPE.select:
            case TYPE.plural:
                params.add(element.value);
                for (const option of Object.values(element.options)) {
                    collectParams(option.value, params);
                }
                break;
            case TYPE.tag:
                collectParams(element.children, params);
                break;
            default:
                break;
        }
    }
}

export function extractIcuParams(value: string, options: ExtractIcuParamsOptions = {}): string[] {
    const { singleCurlyBraces = true, onWarn } = options;
    const normalized = singleCurlyBraces ? value : value.replace(/\{\{(\s*[\w.]+\s*)\}\}/g, '{$1}');
    try {
        const elements = parse(normalized, { ignoreTag: true });
        const params = new Set<string>();
        collectParams(elements, params);
        return [...params];
    } catch (error) {
        onWarn?.(`Failed to parse ICU message "${value}": ${(error as Error).message}`);
        return [];
    }
}
