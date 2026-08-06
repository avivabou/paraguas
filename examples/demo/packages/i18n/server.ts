import * as path from 'path';
import { fileURLToPath } from 'url';
import { i18nPackage } from './src/package';

const moduleDir = typeof __dirname === 'undefined' ? path.dirname(fileURLToPath(import.meta.url)) : __dirname;

export { loadLocale, loadTypedLocale, preloadLocales, preloadTypedLocales } from 'paraguas/server';
export const demoLoadOptions = i18nPackage.loadOptions(path.resolve(moduleDir, 'dist'));
