import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
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
        // Redirect root / to /game/index.html in dev server
        if (url === '/' || url === '') {
          res.writeHead(302, { Location: '/game/index.html' });
          res.end();
          return;
        }

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

function htmlPartialsPlugin(): Plugin {
  return {
    name: 'html-partials-plugin',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace(/<!--\s*#include\s+"([^"]+)"\s*-->/g, (_, file) => {
          let filePath = path.resolve(process.cwd(), file);
          if (!fs.existsSync(filePath)) {
            const gameFilePath = path.resolve(process.cwd(), 'game', file);
            if (fs.existsSync(gameFilePath)) {
              filePath = gameFilePath;
            }
          }
          if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf-8');
          }
          console.warn(`[htmlPartialsPlugin] Partial not found: ${filePath}`);
          return '';
        });
      }
    }
  };
}

import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

function webpConverterPlugin(outDir: string): Plugin {
  return {
    name: 'webp-converter-plugin',
    apply: 'build',
    async closeBundle() {
      const targetDir = path.resolve(process.cwd(), outDir);
      if (!fs.existsSync(targetDir)) return;

      const sharpModule = await import('sharp');
      const sharp = sharpModule.default || sharpModule;

      const processDir = async (dir: string) => {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await processDir(fullPath);
          } else if (/\.(png|jpe?g)$/i.test(entry.name)) {
            const webpPath = fullPath.replace(/\.(png|jpe?g)$/i, '.webp');
            try {
              await sharp(fullPath).webp({ quality: 80 }).toFile(webpPath);
            } catch (err) {
              console.warn(`[webp-converter] Failed to convert ${entry.name}:`, err);
            }
          }
        }
      };

      await processDir(targetDir);
    }
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
        : isBuild
        ? './'
        : '/'),
    plugins: [
      react(),
      versionPlugin(isBuild, currentBuildTime, currentBuildId),
      htmlPartialsPlugin(),
      ViteImageOptimizer({
        test: /\.(jpe?g|png|gif|tiff|webp)$/i,
        includePublic: true,
        logStats: false,
        png: {
          quality: 80,
        },
        jpeg: {
          quality: 80,
        },
        webp: {
          quality: 80,
        },
      }),
      webpConverterPlugin('dist'),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __APP_BUILD_TIME__: JSON.stringify(currentBuildTime),
      __APP_BUILD_ID__: JSON.stringify(currentBuildId),
      __APP_MODE__: JSON.stringify(isBuild ? 'production' : 'development'),
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        input: {
          main: path.resolve(process.cwd(), 'index.html'),
          game: path.resolve(process.cwd(), 'game/index.html'),
          characterLab: path.resolve(process.cwd(), 'game/character-lab.html'),
          tripoDownloader: path.resolve(process.cwd(), 'game/tripo-downloader.html')
        },
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('scheduler')) {
                return 'react-vendor';
              }
              if (id.includes('three') || id.includes('@react-three')) {
                return 'three';
              }
              if (id.includes('@supabase')) {
                return 'supabase';
              }
              if (id.includes('peerjs')) {
                return 'peerjs';
              }
              return 'vendor';
            }
          }
        }
      }
    },
    server: {
      port: 5173,
      host: true,
      open: '/game/index.html'
    },
  };
});
