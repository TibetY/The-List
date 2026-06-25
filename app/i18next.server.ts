import { RemixI18Next } from 'remix-i18next/server';
import { i18nConfig, supportedLngs, fallbackLng } from '~/i18n';
import { localeCookie } from '~/cookies.server';

/**
 * Server-side i18next helper. Detects the request's locale (order: ?lng= search
 * param → cookie → Accept-Language header → fallback) and provides a
 * request-scoped translation function for loaders/actions.
 */
const i18next = new RemixI18Next({
  detection: {
    supportedLanguages: [...supportedLngs],
    fallbackLanguage: fallbackLng,
    cookie: localeCookie,
  },
  i18next: i18nConfig,
});

export default i18next;
