import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { seoPlugin } from './seo/vite-plugin-seo.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Local-development only: serves /api/* by running the SAME handler code that the
 * Vercel serverless function (api/[name].ts) runs in production, so `npm run dev`
 * works without the Vercel CLI. Not part of the production build.
 */
function localApi(): Plugin {
  return {
    name: 'mistera-local-api',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(server.config.mode, __dirname, '');
      for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next();
        try {
          const mod = await server.ssrLoadModule('/server/http.ts');
          await (mod as { default: (req: IncomingMessage, res: ServerResponse) => Promise<void> }).default(req, res);
        } catch (e) {
          console.error('[local-api]', e);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: { code: 'INTERNAL', message: 'Local API crashed — see the terminal.' } }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), seoPlugin(), localApi()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@project/components': path.resolve(__dirname, './src/project-components'),
    },
  },
  build: { target: 'es2020', sourcemap: false, reportCompressedSize: false, minify: 'esbuild' },
  esbuild: { drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [] },
  server: { host: true, port: 8080 },
});
