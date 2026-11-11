import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'utf8-charset-enforcer',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const originalSetHeader = res.setHeader;
            res.setHeader = function (name: string, value: any) {
              if (typeof name === 'string' && name.toLowerCase() === 'content-type') {
                if (typeof value === 'string' && (value.startsWith('text/') || value.includes('json') || value.includes('javascript')) && !value.toLowerCase().includes('charset')) {
                  value = `${value}; charset=utf-8`;
                }
              }
              return originalSetHeader.call(this, name, value);
            };
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
