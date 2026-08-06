import { renderToStaticMarkup } from 'react-dom/server';
import { loadWebTexts, type LocaleKeyTexts, type WebLocaleKeys } from './i18n';

function CartBanner({ texts, itemCount }: { texts: LocaleKeyTexts<'cart'>; itemCount: number }) {
    return (
        <section>
            <h1>{texts.greeting({ gender: 'female', name: 'Ada' })}</h1>
            <p>{texts.summary({ count: itemCount })}</p>
            <p>{texts.removed({ count: 2 }, { undo: (label) => <button data-action="undo">{label}</button> })}</p>
            <p>{texts.cta({ checkout: (label) => <a href="/checkout">{label}</a> })}</p>
        </section>
    );
}

function InboxNudge({ texts, count }: { texts: LocaleKeyTexts<'cart'>; count: number }) {
    return <p>{texts.inboxNudge({ count }, { inbox: (label) => <a href="/inbox">{label}</a> })}</p>;
}

console.log('=== @demo/web — React components embedded inside translations ===');
for (const lang of ['en', 'fr']) {
    const texts = loadWebTexts(lang);
    console.log(`\n[${lang}]`);
    console.log(renderToStaticMarkup(<CartBanner texts={texts.cart} itemCount={3} />));
    console.log('ICU × embeds — the embedded label itself changes with the count:');
    for (const count of [1, 5]) {
        console.log(`  ${renderToStaticMarkup(<InboxNudge texts={texts.cart} count={count} />)}`);
    }
    console.log(`catalog line: ${texts.catalog.itemLine({ name: 'Umbrella', price: 1299, stock: 0 })}`);
    console.log(`deep-merged buttons (cart.json + common.json own one branch):`);
    console.log(`  ${texts.shop.actions.buttons.addToCart()} | ${texts.shop.actions.buttons.viewOrder()}`);
}

const typeSafetyShowcase = (texts: WebLocaleKeys) => {
    // @ts-expect-error tagged key without its wrappers — the compiler refuses
    texts.cart.cta({});
    // @ts-expect-error wrong tag name
    texts.cart.cta({}, { wrongTag: (label: string) => <b>{label}</b> });
    // @ts-expect-error missing ICU params
    texts.cart.summary();
    // @ts-expect-error the web recipe has no "emails" namespace — recipe narrowing
    texts.emails;
};
void typeSafetyShowcase;
