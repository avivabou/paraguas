import { renderToStaticMarkup } from 'react-dom/server';
import { SUPPORTED_LOCALES } from '@demo/i18n';
import { loadWebTexts, type LocaleKeyTexts, type WebLocaleKeys } from './i18n';

function CartBanner({ texts, itemCount }: { texts: LocaleKeyTexts<'cart'>; itemCount: number }) {
    return (
        <section>
            <h1>{texts.greeting({ gender: 'female', name: 'Ada' })}</h1>
            <p>{texts.summary({ count: itemCount })}</p>
            <p>{texts.removed({ count: 2 }, { clear: <button data-action="clear"/> })}</p>
            <p>{texts.cta({ checkout: <a href="/checkout"/> })}</p>
        </section>
    );
}

function InboxNudge({ texts, count }: { texts: LocaleKeyTexts<'cart'>; count: number }) {
    return <p>{texts.inboxNudge({ count }, { inbox: <a href="/inbox"/> })}</p>;
}

async function main() {
    console.log('=== @demo/web — <Trans> components embedded inside translations ===');
    for (const lang of SUPPORTED_LOCALES) {
        const texts = await loadWebTexts(lang);
        console.log(`\n[${lang}]`);
        console.log(renderToStaticMarkup(<CartBanner texts={texts.cart} itemCount={3} />));
        console.log('ICU × embeds — the embedded label itself changes with the count:');
        for (const count of [1, 5]) {
            console.log(`  ${renderToStaticMarkup(<InboxNudge texts={texts.cart} count={count} />)}`);
        }
        console.log(`catalog line: ${texts.catalog.itemLine({ name: texts.catalog.products.umbrella(), price: 1299, stock: 0 })}`);
        console.log(`deep-merged buttons (cart.json + common.json own one branch):`);
        console.log(`  ${texts.shop.actions.buttons.addToCart()} | ${texts.shop.actions.buttons.viewOrder()}`);
    }
}

void main();

const typeSafetyShowcase = (texts: WebLocaleKeys) => {
    // @ts-expect-error tagged key without its wrappers — the compiler refuses
    texts.cart.cta({});
    // @ts-expect-error wrong tag name
    texts.cart.cta({}, { wrongTag: <b/> });
    // @ts-expect-error missing ICU params
    texts.cart.summary();
    // @ts-expect-error the web recipe has no "emails" namespace — recipe narrowing
    texts.emails;
};
void typeSafetyShowcase;
