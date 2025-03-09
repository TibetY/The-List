/**
 * Updated entry.server.tsx
 *
 * This version wraps the <RemixServer> in Emotion's CacheProvider,
 * extracts the critical CSS, and injects it into the HTML.
 * It uses renderToString (i.e. non-streaming) for simplicity.
 */

import { renderToString } from "react-dom/server";
import type { AppLoadContext, EntryContext } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import { CacheProvider } from "@emotion/react";
import createEmotionCache from "~/createEmotionCache";
import createEmotionServer from "@emotion/server/create-instance";

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  loadContext: AppLoadContext
) {
  // Create an instance of Emotion cache
  const cache = createEmotionCache();
  const { extractCriticalToChunks, constructStyleTagsFromChunks } =
    createEmotionServer(cache);

  // Wrap your RemixServer with CacheProvider so Emotion can collect styles
  const jsx = (
    <CacheProvider value={cache}>
      <RemixServer context={remixContext} url={request.url} />
    </CacheProvider>
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
