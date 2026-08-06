import { startServer } from './server';

const PORT = 4310;

(async () => {
    const server = await startServer(PORT);
    console.log('=== @demo/email-service — express server, ?lang= per request, no React anywhere ===');

    for (const query of ['?lang=en', '?lang=fr', '?lang=de', '']) {
        const response = await fetch(`http://localhost:${PORT}/order-shipped-email/A-1042${query}`);
        const email = (await response.json()) as Record<string, string>;
        console.log(`\nGET /order-shipped-email/A-1042${query}  →  served: ${email.lang}`);
        console.log(`  subject: ${email.subject}`);
        console.log(`  body:    ${email.body}`);
        console.log(`  status (shared "common" namespace): ${email.statusLine}`);
    }

    server.close();
})();
