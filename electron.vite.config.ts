import { defineConfig, swcPlugin } from 'electron-vite';
import vue from '@vitejs/plugin-vue';
import autoprefixer from 'autoprefixer';
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
      }),
    ],
    build: {
      externalizeDeps: true,
    },
  },
  preload: {
    build: {
      externalizeDeps: true,
    },
  },
  renderer: {
    plugins: [vue()],
    css: {
      postcss: {
        plugins: [autoprefixer()],
      },
    },
  },
});
