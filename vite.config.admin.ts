import { defineConfig, Plugin } from 'vite';
import { resolve } from 'path';
import * as fs from 'fs';

function parseEnvFile(filePath: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return result;
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      result[key] = val;
    }
  }
  return result;
}

function adminServerPlugin(): Plugin {
  return {
    name: 'admin-local-server-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Redirect root / to /admin/index.html
        if (req.url === '/' || req.url === '') {
          res.writeHead(302, { Location: '/admin/index.html' });
          res.end();
          return;
        }

        // Endpoint to read local environment configuration securely for the local admin UI
        if (req.url === '/api/admin/env' && req.method === 'GET') {
          const env = {
            ...parseEnvFile('.env'),
            ...parseEnvFile('.env.local'),
            ...process.env
          };
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              url: env.VITE_SUPABASE_URL || '',
              anonKey: env.VITE_SUPABASE_ANON_KEY || '',
              serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || '',
              adminKey: env.ADMIN_SECRET_KEY || env.VITE_ADMIN_SECRET_KEY || ''
            })
          );
          return;
        }

        // Endpoint to save Supabase keys to .env.local (strictly local)
        if (req.url === '/api/admin/save-env' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const envContent = [
                `VITE_SUPABASE_URL=${data.url || ''}`,
                `VITE_SUPABASE_ANON_KEY=${data.anonKey || ''}`,
                `SUPABASE_SERVICE_ROLE_KEY=${data.serviceRoleKey || ''}`,
                `ADMIN_SECRET_KEY=${data.adminKey || ''}`
              ].join('\n') + '\n';

              fs.writeFileSync('.env.local', envContent, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, message: 'Settings saved to .env.local' }));
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: msg }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [adminServerPlugin()],
  server: {
    port: 5174,
    host: '127.0.0.1', // Strictly local binding
    strictPort: true,
    open: '/admin/index.html'
  },
  build: {
    outDir: 'dist-admin',
    rollupOptions: {
      input: {
        admin: resolve(process.cwd(), 'admin/index.html')
      }
    }
  }
});
