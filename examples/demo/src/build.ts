import * as path from 'path';
import { build, bracketTagStructure, icuData, taggedEmbeds } from 'paraguas/build';
import { i18nPackage } from './package';

const rootDir = path.resolve(__dirname, '..');

build({
    localesDir: path.join(rootDir, 'locales'),
    distDir: path.join(rootDir, 'dist'),
    generatedDir: path.join(rootDir, 'src', 'generated'),
    languages: i18nPackage.languages,
    recipes: i18nPackage.recipes,
    structures: [bracketTagStructure],
    codegen: { sortKeys: true, structures: [icuData(), taggedEmbeds({ elementType: 'string' })] },
}).then(() => console.log('built: dist/web/{en,fr}.json + src/generated/CartKeys.ts'));
