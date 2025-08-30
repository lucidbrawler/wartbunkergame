// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import netlify from '@astrojs/netlify';


export default defineConfig({
  output: 'server',
  integrations: [react(), tailwind(), mdx()],
  adapter: netlify({
    functionPerRoute: false,
    cacheOnDemandPages: true,
    imageCDN: false,
  }),
  experimental: {
    csp: {
      directives: [
        "default-src 'self' https://api.coingecko.com",
        "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com",
        "img-src 'self' data: https://pbs.twimg.com",
        "object-src 'self'",
        "frame-src 'self' https://docs.google.com https://*.googleusercontent.com https://drive.google.com"
      ],
      styleDirective: {
        resources: ["'self'", "https://fonts.googleapis.com"]
      }
    }
  },
  vite: {
    resolve: {
      alias: {
        crypto: 'crypto-browserify',
        stream: 'stream-browserify',
      },
    },
    ssr: {
      noExternal: ['crypto-browserify', 'stream-browserify'],
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  },
});