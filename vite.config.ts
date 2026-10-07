import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  /**
   * Set base URL for GitHub Pages deployment.
   * If BASE_PATH is provided (e.g. from GitHub Actions Pages step), use it.
   * If running in GitHub Actions, derive from GITHUB_REPOSITORY (e.g. /roguelike-coop-game/).
   * Otherwise default to './' for portable relative asset paths.
   */
  base:
    process.env.BASE_PATH ||
    (process.env.GITHUB_ACTIONS && process.env.GITHUB_REPOSITORY
      ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
      : './'),
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
  server: {
    port: 5173,
    host: true,
  },
});
