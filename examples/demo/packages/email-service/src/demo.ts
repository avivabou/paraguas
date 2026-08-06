import { demoLoadOptions, i18nPackage, type EmailKeys, type EmailTexts } from '@demo/i18n';
import { preloadTypedLocales } from 'paraguas/server';

const locales = preloadTypedLocales<EmailKeys>('emails', demoLoadOptions);

function renderShippedEmail({ t, orderId }: { t: EmailTexts<'emails.orderShipped'>; orderId: string }): string {
    const subject = t.subject({ orderId });
    const body = t.body({ count: 3, shippedAt: new Date('2026-08-01') });
    return `${subject}\n${body}`;
}

console.log('=== @demo/email-service — no React anywhere ===');
for (const requestedLang of ['en', 'fr', 'de', undefined]) {
    const { t, lang } = i18nPackage.resolve(requestedLang, locales);
    console.log(`\n[requested: ${String(requestedLang)} → served: ${lang}]`);
    console.log(renderShippedEmail({ t: t.emails.orderShipped, orderId: 'A-1042' }));
    console.log(`status line (shared "common" namespace): ${t.shop.actions.status.shipped()}`);
}
