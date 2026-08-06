import { startServer } from './server';

const PORT = 4310;

startServer(PORT).then(() => console.log(`@demo/email-service listening on :${PORT}`));
