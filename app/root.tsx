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
} from "@remix-run/react";

import { CacheProvider } from "@emotion/react";
import createEmotionCache from "./createEmotionCache";

import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme";

import { json } from "@remix-run/node";
import { getSession } from "~/session.server";
import Navbar from "./components/Navbar";

export const links: LinksFunction = () => [
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
];

export const meta: MetaFunction = () => {
  return [
    { charset: "utf-8" },
    { title: "The List — Your Personal Restaurant Guide" },
    { name: "description", content: "Discover, rate, and remember your favorite restaurants. Your personal dining companion." },
    { name: "viewport", content: "width=device-width,initial-scale=1" },
    { name: "theme-color", content: "#0a0a0f" },
  ];
};

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get("Cookie"));
  const token = session.get("token") || null;
  return json({ token });
};

export default function App() {
  const clientSideEmotionCache = createEmotionCache();

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <a href="#main-content" className="skip-to-main">
          Skip to main content
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
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
