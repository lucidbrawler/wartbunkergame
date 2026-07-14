import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import netlify from '@astrojs/netlify';
import path from 'path';
import { fileURLToPath } from 'url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

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
        "connect-src 'self' ws://localhost:8765 wss://localhost:8765 wss://warthog-defitestnet.duckdns.org ws: wss: https://api.coingecko.com",
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
    define: {
      global: 'globalThis',
      'process.env': {},
    },
    resolve: {
      alias: {
        crypto: path.resolve(projectRoot, 'node_modules/crypto-browserify'),
        stream: path.resolve(projectRoot, 'node_modules/stream-browserify'),
        process: path.resolve(projectRoot, 'src/shims/process.js'),
        vm: path.resolve(projectRoot, 'node_modules/vm-browserify'),
        [path.resolve(projectRoot, 'node_modules/ethers/lib.esm/crypto/crypto.js')]: path.resolve(
          projectRoot,
          'node_modules/ethers/lib.esm/crypto/crypto-browser.js',
        ),
      },
    },
    optimizeDeps: {
      include: ['buffer', 'base64-js', 'ieee754', 'warthog-js', 'crypto-browserify', 'elliptic', 'ethers'],
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
    },
    ssr: {
      external: ['warthog-js', 'buffer', 'elliptic', 'crypto-browserify'],
      noExternal: [],
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  },
});