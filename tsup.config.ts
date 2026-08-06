import { defineConfig } from 'tsup';

export default defineConfig({
    entry: { index: 'src/index.ts', server: 'src/server.ts', build: 'src/build.ts', react: 'src/react.ts', 'merge-driver-cli': 'src/merge-driver-cli.ts' },
    external: ['react'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
});
