import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Isolated from vite.config.ts on purpose: the Remix/Netlify plugins are for the
// app build, not unit tests. We only need the `~/*` path alias here. Tests are
// pure (no DOM), so a node environment is enough.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['app/**/*.test.ts'],
  },
});
