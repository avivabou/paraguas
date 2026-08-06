import { defineConfig } from 'tsup';

export default defineConfig({
    entry: { index: 'src/index.ts', server: 'src/server.ts', build: 'src/build.ts', react: 'src/react.ts', 'merge-driver-cli': 'src/merge-driver-cli.ts', 'react-i18next': 'src/react-i18next.ts' },
    external: ['react', 'react-i18next', 'i18next'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
});
