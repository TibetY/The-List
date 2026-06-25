/**
 * entry.server.tsx
 *
 * Wraps <RemixServer> in Emotion's CacheProvider (to extract critical CSS) and
 * in i18next's I18nextProvider (so SSR renders in the request's locale). Uses
 * renderToString (non-streaming) for simplicity.
 */

import { renderToString } from "react-dom/server";
import type { AppLoadContext, EntryContext } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import { CacheProvider } from "@emotion/react";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import createEmotionCache from "~/createEmotionCache";
import createEmotionServer from "@emotion/server/create-instance";
import i18nextServer from "~/i18next.server";
import { i18nConfig } from "~/i18n";

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  loadContext: AppLoadContext
) {
  // Create a request-scoped i18next instance in the detected locale.
  const instance = createInstance();
  const lng = await i18nextServer.getLocale(request);
  await instance.use(initReactI18next).init({ ...i18nConfig, lng });

  // Create an instance of Emotion cache
  const cache = createEmotionCache();
  const { extractCriticalToChunks, constructStyleTagsFromChunks } =
    createEmotionServer(cache);

  const jsx = (
    <I18nextProvider i18n={instance}>
      <CacheProvider value={cache}>
        <RemixServer context={remixContext} url={request.url} />
      </CacheProvider>
    </I18nextProvider>
  );

  // Render the app to an HTML string
  const html = renderToString(jsx);

  // Extract Emotion critical CSS chunks from the rendered HTML
  const emotionChunks = extractCriticalToChunks(html);
  const emotionStyleTags = constructStyleTagsFromChunks(emotionChunks);

  // Inject the Emotion style tags into the <head> of your HTML
  const finalHtml = `<!DOCTYPE html>${html.replace(
    "</head>",
    `${emotionStyleTags}</head>`
  )}`;

  responseHeaders.set("Content-Type", "text/html");
  return new Response(finalHtml, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
}
