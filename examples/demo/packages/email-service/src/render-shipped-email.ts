import type { EmailLocaleTexts } from './i18n';

export interface ShippedOrder {
    orderId: string;
    packageCount: number;
    shippedAt: Date;
}

export function renderShippedEmail({
    t,
    order,
}: {
    t: EmailLocaleTexts<'emails.orderShipped'>;
    order: ShippedOrder;
}): { subject: string; body: string } {
    return {
        subject: t.subject({ orderId: order.orderId }),
        body: t.body({ count: order.packageCount, shippedAt: order.shippedAt }),
    };
}
