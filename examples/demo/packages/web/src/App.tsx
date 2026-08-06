import { useMemo, useState } from 'react';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@demo/i18n';
import { browserWebTexts } from './browser-i18n';

interface ShippedEmail {
    lang: string;
    subject: string;
    body: string;
}

export function App() {
    const [lang, setLang] = useState<SupportedLocale>('en');
    const [count, setCount] = useState(1);
    const [email, setEmail] = useState<ShippedEmail | null>(null);
    const texts = useMemo(() => browserWebTexts(lang), [lang]);

    const fetchShippedEmail = async () => {
        const response = await fetch(`/api/order-shipped-email/A-1042?lang=${lang}`);
        setEmail((await response.json()) as ShippedEmail);
    };

    return (
        <main>
            <div className="controls">
                {SUPPORTED_LOCALES.map((locale) => (
                    <button key={locale} disabled={locale === lang} onClick={() => setLang(locale)}>
                        {locale.toUpperCase()}
                    </button>
                ))}
                <label>
                    {texts.cart.countLabel()}: {count}
                    <input type="range" min={0} max={9} value={count} onChange={(e) => setCount(Number(e.target.value))} />
                </label>
            </div>

            <section>
                <h1>{texts.cart.greeting({ gender: 'female', name: 'Ada' })}</h1>
                <p>{texts.cart.summary({ count })}</p>
                <p>{texts.cart.inboxNudge({ count }, { inbox: <a href="#inbox"/> })}</p>
                <p>
                    {texts.cart.removed(
                        { count },
                        { clear: <button disabled={count === 0} onClick={() => setCount(0)}/> },
                    )}
                </p>
                <p>{texts.cart.cta({ checkout: <a href="#checkout"/> })}</p>
            </section>

            <section>
                <h2>{texts.catalog.title()}</h2>
                <p>{texts.catalog.itemLine({ name: texts.catalog.products.umbrella(), price: 1299, stock: count })}</p>
                <p>
                    {texts.shop.actions.buttons.addToCart()} · {texts.shop.actions.buttons.viewOrder()} ·{' '}
                    {texts.shop.actions.status.shipped()}
                </p>
            </section>

            <section>
                <button onClick={fetchShippedEmail}>{texts.cart.emailPreviewButton()}</button>
                {email != null && (
                    <blockquote>
                        <strong>{email.subject}</strong>
                        <p>{email.body}</p>
                        <small>served by @demo/email-service in: {email.lang}</small>
                    </blockquote>
                )}
            </section>
        </main>
    );
}
