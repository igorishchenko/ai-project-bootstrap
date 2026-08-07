{{#if has.react-native}}import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import es from './locales/es.json';

// Single braces, not i18next's double-brace default — a generated
// project's own double-brace templating already claims that syntax at
// generation time, so these locale files use { } instead. See
// docs/setup.md for the full explanation before "fixing" this back.
const INTERPOLATION = { prefix: '{', suffix: '}', escapeValue: false };

const resources = { en: { translation: en }, es: { translation: es } };

void i18n.use(initReactI18next).init({
  resources,
  lng: Localization.getLocales()[0]?.languageCode ?? 'en',
  fallbackLng: 'en',
  interpolation: INTERPOLATION,
});

export default i18n;
{{else}}import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import es from './locales/es.json';

// Single braces, not i18next's double-brace default — a generated
// project's own double-brace templating already claims that syntax at
// generation time, so these locale files use { } instead. See
// docs/setup.md for the full explanation before "fixing" this back.
const INTERPOLATION = { prefix: '{', suffix: '}', escapeValue: false };

const resources = { en: { translation: en }, es: { translation: es } };

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: INTERPOLATION,
  });

export default i18n;
{{/if}}