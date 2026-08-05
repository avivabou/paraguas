import { defineConfig } from 'tsup';

export default defineConfig({
    entry: { index: 'src/index.ts', server: 'src/server.ts', build: 'src/build.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
});
