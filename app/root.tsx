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
// import Navbar from "./components/Navbar";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800&display=swap",
  },
];

export const meta: MetaFunction = () => {
  return [
    { charset: "utf-8" },
    { title: "The List" },
    { name: "description", content: "Welcome to The List!" },
    { viewport: "width=device-width,initial-scale=1" },
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
        <CacheProvider value={clientSideEmotionCache}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Navbar />
            <Outlet />
          </ThemeProvider>
        </CacheProvider>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
