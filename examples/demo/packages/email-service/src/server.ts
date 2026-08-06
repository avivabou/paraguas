import express from 'express';
import type { Server } from 'http';
import { preloadEmailLocales } from './i18n';
import { renderShippedEmail } from './render-shipped-email';
import { resolveLocale } from './resolve-locale';

export function startServer(port: number): Promise<Server> {
    const app = express();
    const locales = preloadEmailLocales();

    app.get('/', (_req, res) => {
        res.type('text/plain').send('@demo/email-service — the web app runs on port 5173. Try /order-shipped-email/A-1042?lang=es');
    });

    app.get('/order-shipped-email/:orderId', (req, res) => {
        const { t, lang } = resolveLocale(req, locales);
        const email = renderShippedEmail({
            t: t.emails.orderShipped,
            order: { orderId: req.params.orderId, packageCount: 3, shippedAt: new Date('2026-08-01') },
        });
        res.json({ lang, ...email, statusLine: t.shop.actions.status.shipped() });
    });

    return new Promise((resolve) => {
        const server = app.listen(port, () => resolve(server));
    });
}
