import { useMemo, useState } from 'react';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@demo/i18n';
import { browserWebTexts } from './browser-i18n';

export function App() {
    const [lang, setLang] = useState<SupportedLocale>('en');
    const [count, setCount] = useState(1);
    const texts = useMemo(() => browserWebTexts(lang), [lang]);

    return (
        <main>
            <div className="controls">
                {SUPPORTED_LOCALES.map((locale) => (
                    <button key={locale} disabled={locale === lang} onClick={() => setLang(locale)}>
                        {locale.toUpperCase()}
                    </button>
                ))}
                <label>
                    count: {count}
                    <input type="range" min={0} max={9} value={count} onChange={(e) => setCount(Number(e.target.value))} />
                </label>
            </div>

            <section>
                <h1>{texts.cart.greeting({ gender: 'female', name: 'Ada' })}</h1>
                <p>{texts.cart.summary({ count })}</p>
                <p>{texts.cart.inboxNudge({ count }, { inbox: (label) => <a href="#inbox">{label}</a> })}</p>
                <p>
                    {texts.cart.removed(
                        { count },
                        { undo: (label) => <button onClick={() => setCount(count + 1)}>{label}</button> },
                    )}
                </p>
                <p>{texts.cart.cta({ checkout: (label) => <a href="#checkout">{label}</a> })}</p>
            </section>

            <section>
                <h2>{texts.catalog.title()}</h2>
                <p>{texts.catalog.itemLine({ name: 'Umbrella', price: 1299, stock: count })}</p>
                <p>
                    {texts.shop.actions.buttons.addToCart()} · {texts.shop.actions.buttons.viewOrder()} ·{' '}
                    {texts.shop.actions.status.shipped()}
                </p>
            </section>
        </main>
    );
}
