import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

declare module "@remix-run/node" {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig({
  ssr: {
    noExternal: ['@mui/icons-material']
  },
  optimizeDeps: {
    include: [
      '@mui/icons-material',
      '@mui/material',
      '@emotion/react',
      '@emotion/styled',
    ],
    // Force Vite to pre-bundle everything in one pass rather than on-demand
    force: false,
  },
  server: {
    hmr: {
      overlay: false,
    },
    watch: {
      // Ignore node_modules entirely — this is the main cause of EMFILE on Windows
      ignored: ['**/node_modules/**', '**/.git/**'],
      usePolling: false,
    },
  },
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
    }),
    tsconfigPaths(),
  ],
});
