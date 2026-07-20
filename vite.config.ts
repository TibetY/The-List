import { vitePlugin as remix } from "@remix-run/dev";
import { netlifyPlugin } from "@netlify/remix-adapter/plugin";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  ssr: {
    // Bundle MUI + Emotion into the server build. Left external, MUI's internal
    // directory imports (e.g. @mui/utils/formatMuiErrorMessage) break under
    // Node's strict ESM resolver in the Netlify function (ERR_UNSUPPORTED_DIR_IMPORT).
    // Other deps (React, Supabase, etc.) ship proper exports maps and are safe
    // to keep external.
    noExternal: [/^@mui\//, /^@emotion\//],
  },
  optimizeDeps: {
    include: [
      '@mui/icons-material',
      '@mui/material',
      '@emotion/react',
      '@emotion/styled',
      // Pre-bundle Leaflet + the markercluster UMD plugin together so the
      // plugin patches the SAME Leaflet instance the app imports.
      'leaflet',
      'leaflet.markercluster',
    ],
  },
  server: {
    hmr: {
      overlay: false,
    },
    watch: {
      // Reduce file watchers to avoid EMFILE on Windows
      usePolling: false,
    },
  },
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_lazyRouteDiscovery: true,
      },
    }),
    netlifyPlugin(),
    tsconfigPaths(),
  ],
});
