import { vitePlugin as remix } from "@remix-run/dev";
import { netlifyPlugin } from "@netlify/remix-adapter/plugin";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { fileURLToPath } from "node:url";

const emotionEsm = (pkg: string) =>
  fileURLToPath(
    new URL(`./node_modules/@emotion/${pkg}/dist/emotion-${pkg}.esm.js`, import.meta.url)
  );

// Every Emotion micro-package below ships a dual CJS/ESM setup: a real `main`
// CJS build, but the `exports` map's `import`/`development` conditions resolve
// (sometimes several levels deep) to a `.cjs.mjs` re-export wrapper — or, for
// packages with dev/prod or browser/edge-light splits, to a `development.cjs.js`
// file picked up via nested conditions. Either way, when Vite's SSR pipeline
// bundles one of these (because it's `noExternal`, or reached from inside
// another `noExternal` package like @mui/material -> @emotion/react -> @emotion/cache
// -> @emotion/sheet), it evaluates the resolved CJS file as if it were ESM,
// missing the `module`/`exports` interop shim: "ReferenceError: module/exports
// is not defined". Each new one only surfaced once something actually reached
// it — memoize, then cache, then sheet — so rather than keep chasing the chain
// package by package, alias ALL of them straight to their single, unambiguous,
// environment-agnostic ESM build (dist/emotion-<pkg>.esm.js — not the
// `.browser.` or `.development.` variants), skipping the exports-map/conditions
// resolution entirely. These stay in `ssr.noExternal` below so Vite (not Node)
// still transforms the real ESM syntax.
const emotionAliases = Object.fromEntries(
  [
    'cache',
    'hash',
    'is-prop-valid',
    'memoize',
    'serialize',
    'sheet',
    'unitless',
    'use-insertion-effect-with-fallbacks',
    'utils',
    'weak-memoize',
  ].map((pkg) => [`@emotion/${pkg}`, emotionEsm(pkg)])
);

export default defineConfig({
  resolve: {
    alias: emotionAliases,
  },
  ssr: {
    // Bundle MUI + Emotion into the server build. Left external, MUI's internal
    // directory imports (e.g. @mui/utils/formatMuiErrorMessage) break under
    // Node's strict ESM resolver in the Netlify function (ERR_UNSUPPORTED_DIR_IMPORT).
    // Emotion's packages are safe to bundle now that the alias above sidesteps
    // their exports-map interop bug.
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
