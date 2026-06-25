import en from '~/locales/en/common.json';
import fr from '~/locales/fr/common.json';

/** Languages the app ships translations for. */
export const supportedLngs = ['en', 'fr'] as const;
export type AppLocale = (typeof supportedLngs)[number];

export const fallbackLng: AppLocale = 'en';
export const defaultNS = 'common';

/**
 * Translations are bundled inline (imported here) rather than loaded from disk
 * at runtime — the Netlify serverless function has no reliable filesystem for an
 * i18next fs-backend, and the resource set is small.
 */
export const resources = {
  en: { common: en },
  fr: { common: fr },
} as const;

/** Shared i18next init options used on both server and client. */
export const i18nConfig = {
  supportedLngs: [...supportedLngs],
  fallbackLng,
  defaultNS,
  ns: [defaultNS],
  resources,
  interpolation: { escapeValue: false },
};
