import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import type { NextHandleFunction } from 'connect';

const serverModulePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../email-service/src/server.ts',
);

function emailServicePlugin(): Plugin {
    return {
        name: 'demo-email-service',
        configureServer(server) {
            const appPromise = server
                .ssrLoadModule(`/@fs/${serverModulePath}`)
                .then((module) => (module as { createApp(): NextHandleFunction }).createApp());
            server.middlewares.use('/api', (req, res, next) => {
                appPromise.then((app) => app(req, res, next)).catch(next);
            });
        },
    };
}

export default defineConfig({
    plugins: [react(), emailServicePlugin()],
});
