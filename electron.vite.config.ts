import { defineConfig, swcPlugin } from 'electron-vite';
import vue from '@vitejs/plugin-vue';
import 'dotenv/config';
import {
  unstableRolldownAdapter,
  analyzer as bundleAnalyzer,
} from 'vite-bundle-analyzer';

export default defineConfig({
  main: {
    define: {
      __CURSEFORGE_API_KEY__: JSON.stringify(process.env.CURSEFORGE_API_KEY),
      __MODRINTH_CLIENT_ID__: JSON.stringify(process.env.MODRINTH_CLIENT_ID),
      __MODRINTH_CLIENT_SECRET__: JSON.stringify(
        process.env.MODRINTH_CLIENT_SECRET,
      ),
    },
    plugins: [
      swcPlugin({
        transformOptions: {
          decoratorVersion: '2022-03',
          optimizer: { simplify: true },
        },
        minifyOptions:
          process.env.ANALYZE !== 'true'
            ? {
                compress: true,
                mangle: false,
                format: {
                  comments: false,
                },
              }
            : undefined,
      }),
      unstableRolldownAdapter(
        bundleAnalyzer({
          enabled: process.env.ANALYZE === 'true',
        }),
      ),
    ],
    oxc: false,
    build: {
      externalizeDeps: false,

      rollupOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'download-manager',
                test: /launcher-core.*downloads.js/,
              },
              {
                name: 'launcher-core',
                test: /launcher-core/,
              }
            ],
          },
        },
      },
    },
  },
  preload: {
    build: {
      externalizeDeps: false,
    },
  },
  renderer: {
    plugins: [
      vue(),
      unstableRolldownAdapter(
        bundleAnalyzer({
          enabled: process.env.ANALYZE === 'true',
        }),
      ),
    ],
    css: {
      postcss: {
        plugins: [],
      },
    },
  },
});
