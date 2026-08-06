import * as path from 'path';
import { stringTokenRenderer } from 'paraguas';
import { loadTypedLocale } from 'paraguas/server';
import type { ICartKeys } from './generated/CartKeys';
import { i18nPackage } from './package';

const distDir = path.resolve(__dirname, '..', 'dist');
const options = i18nPackage.loadOptions(distDir, { renderTokens: stringTokenRenderer });

for (const lang of i18nPackage.languages) {
    const texts = loadTypedLocale<ICartKeys>('web', lang, options);

    console.log(`\n[${lang}]`);
    console.log(texts.cart.summary({ count: 0 }));
    console.log(texts.cart.summary({ count: 3 }));
    console.log(texts.cart.cta({ checkout: (label) => `<a href="/checkout">${label}</a>` }));
}

const texts = loadTypedLocale<ICartKeys>('web', 'en', options);
void texts;
// Uncomment to see the compiler refuse a tagged key without its wrapper:
// texts.cart.cta();
// Or a wrong tag name:
// texts.cart.cta({ wrongTag: (label) => label });
