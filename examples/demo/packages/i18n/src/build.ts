import * as path from 'path';
import { build, angleTagStructure } from 'paraguas/build';
import { i18nPackage } from './package';

const rootDir = path.resolve(__dirname, '..');

build({
    localesDir: path.join(rootDir, 'locales'),
    distDir: path.join(rootDir, 'dist'),
    generatedDir: path.join(rootDir, 'src', 'generated'),
    languages: i18nPackage.languages,
    recipes: i18nPackage.recipes,
    structures: [angleTagStructure],
    codegen: { sortKeys: true },
}).then(() => console.log('@demo/i18n built: dist/{web,emails}/{en,fr}.json + generated types'));
