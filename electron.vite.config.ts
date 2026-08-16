import { defineConfig, swcPlugin } from 'electron-vite';
import vue from '@vitejs/plugin-vue';
import 'dotenv/config';

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
        minifyOptions: {
          compress: true,
          mangle: {
            keep_classnames: true,
            keep_fnames: true,
          },
          format: {
            comments: false,
          },
        },
      }),
    ],
    build: {
      externalizeDeps: false,

      minify: true,

      rollupOptions: {
        output: {
          manualChunks(id, _meta): string | void {
            if (id.includes('tomate-launcher-core')) {
              return 'tomate-launcher-core';
            }
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
    plugins: [vue()],
    css: {
      postcss: {
        plugins: [],
      },
    },
  },
});
