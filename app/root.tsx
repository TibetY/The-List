import type {
  LinksFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteError,
  isRouteErrorResponse,
  Link as RemixLink,
} from "@remix-run/react";

import { CacheProvider } from "@emotion/react";
import createEmotionCache from "./createEmotionCache";

import { ThemeProvider, CssBaseline, Box, Button, Typography } from "@mui/material";
import theme from "./theme";

import { json } from "@remix-run/node";
import { useTranslation } from "react-i18next";
import { useChangeLanguage } from "remix-i18next/react";
import { createSupabaseServerClient } from "~/supabase.server";
import { getServerSupabaseEnv, type PublicEnv } from "~/supabaseConfig";
import i18nextServer from "~/i18next.server";
import { resources, fallbackLng } from "~/i18n";
import Navbar from "./components/Navbar";
import tailwindHref from "~/tailwind.css?url";

export const handle = { i18n: "common" };

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: tailwindHref },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap",
  },
];

export const meta: MetaFunction = ({ data }) => {
  const locale = (data as { locale?: string } | undefined)?.locale ?? fallbackLng;
  const m = (resources[locale as keyof typeof resources] ?? resources[fallbackLng]).common.meta;
  return [
    { charset: "utf-8" },
    { title: m.title },
    { name: "description", content: m.description },
    { name: "viewport", content: "width=device-width,initial-scale=1" },
    { name: "theme-color", content: "#0a0a0f" },
  ];
};

export const loader: LoaderFunction = async ({ request }) => {
  const { supabase } = createSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ENV = getServerSupabaseEnv();
  const locale = await i18nextServer.getLocale(request);
  return json({ isLoggedIn: !!user, ENV, locale });
};

export default function App() {
  const clientSideEmotionCache = createEmotionCache();
  const { ENV, locale } = useLoaderData<{ ENV: PublicEnv; locale: string }>();
  const { t, i18n } = useTranslation();
  // Keep the i18next client instance in sync with the server-detected locale.
  useChangeLanguage(locale);

  return (
    <html lang={locale} dir={i18n.dir(locale)}>
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <a href="#main-content" className="skip-to-main">
          {t("a11y.skipToMain")}
        </a>
        <CacheProvider value={clientSideEmotionCache}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Navbar />
            <main id="main-content">
              <Outlet />
            </main>
          </ThemeProvider>
        </CacheProvider>
        <ScrollRestoration />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(ENV)};`,
          }}
        />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

/**
 * App-wide error boundary. Replaces the whole document tree when a loader or
 * render throws, so users see a friendly localized page instead of a raw stack
 * trace. Distinguishes 404 from other failures.
 */
export function ErrorBoundary() {
  const error = useRouteError();
  const { t } = useTranslation();

  const isNotFound = isRouteErrorResponse(error) && error.status === 404;
  const title = isNotFound ? t("errors.notFoundTitle") : t("errors.title");
  const body = isNotFound ? t("errors.notFoundBody") : t("errors.genericBody");

  return (
    <html lang="en">
      <head>
        <title>{title}</title>
        <Meta />
        <Links />
      </head>
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Box
            component="main"
            sx={{
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: 2,
              px: 3,
            }}
          >
            <Typography variant="h3" component="h1" sx={{ fontWeight: 800 }}>
              {title}
            </Typography>
            <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 440 }}>
              {body}
            </Typography>
            <Button component={RemixLink} to="/" variant="contained" sx={{ mt: 1 }}>
              {t("errors.backHome")}
            </Button>
          </Box>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
