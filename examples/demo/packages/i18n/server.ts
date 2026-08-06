import * as path from 'path';
import { i18nPackage } from './src/package';

export { loadLocale, loadTypedLocale, preloadLocales, preloadTypedLocales } from 'paraguas/server';
export const demoLoadOptions = i18nPackage.loadOptions(path.resolve(__dirname, 'dist'));
