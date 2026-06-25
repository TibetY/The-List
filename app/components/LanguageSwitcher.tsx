import { Form, useLocation } from '@remix-run/react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { supportedLngs } from '~/i18n';

/**
 * EN/FR toggle. Posts the chosen language to /api/locale, which stores it in a
 * cookie and redirects back to the current page so the server re-renders in the
 * new locale. Styled with MUI palette tokens so it adapts to whichever theme
 * (public dark theme or the dashboard list theme) is active.
 */
export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const current = i18n.resolvedLanguage ?? i18n.language;
  const redirectTo = location.pathname + location.search;

  return (
    <Form method="post" action="/api/locale" style={{ display: 'inline-flex' }}>
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <Box
        role="group"
        aria-label={t('language.label')}
        sx={{
          display: 'inline-flex',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '999px',
          overflow: 'hidden',
        }}
      >
        {supportedLngs.map((lng) => {
          const active = current === lng;
          return (
            <Box
              key={lng}
              component="button"
              type="submit"
              name="lng"
              value={lng}
              aria-pressed={active}
              aria-label={t(`language.${lng}`)}
              sx={{
                border: 'none',
                cursor: 'pointer',
                px: 1.25,
                py: 0.5,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'inherit',
                lineHeight: 1.4,
                background: active ? 'primary.main' : 'transparent',
                color: active ? 'primary.contrastText' : 'text.secondary',
                '&:hover': { color: active ? 'primary.contrastText' : 'text.primary' },
              }}
            >
              {lng.toUpperCase()}
            </Box>
          );
        })}
      </Box>
    </Form>
  );
}
