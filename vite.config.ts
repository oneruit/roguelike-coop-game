import { defineConfig, Plugin } from 'vite';
import * as fs from 'fs';
import * as path from 'path';

const pkgPath = path.resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const appVersion = pkg.version || '1.0.0';
const serverStartTime = Date.now();
const serverBuildId = `v${appVersion}-${serverStartTime}`;

function versionPlugin(isBuild: boolean, buildTime: number, buildId: string): Plugin {
  return {
    name: 'version-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        if (url.includes('/version.json')) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          res.end(
            JSON.stringify(
              {
                version: appVersion,
                buildTime: serverStartTime,
                buildTimeIso: new Date(serverStartTime).toISOString(),
                buildId: serverBuildId,
              },
              null,
              2
            )
          );
          return;
        }
        next();
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify(
          {
            version: appVersion,
            buildTime: buildTime,
            buildTimeIso: new Date(buildTime).toISOString(),
            buildId: buildId,
          },
          null,
          2
        ),
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const isBuild = command === 'build';
  const currentBuildTime = isBuild ? Date.now() : serverStartTime;
  const currentBuildId = `v${appVersion}-${currentBuildTime}`;

  return {
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
    plugins: [versionPlugin(isBuild, currentBuildTime, currentBuildId)],
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __APP_BUILD_TIME__: JSON.stringify(currentBuildTime),
      __APP_BUILD_ID__: JSON.stringify(currentBuildId),
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: true,
    },
    server: {
      port: 5173,
      host: true,
    },
  };
});

