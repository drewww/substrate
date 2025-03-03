import { defineConfig } from "vite";

import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile()],
  root: '.',
  build: {
    rollupOptions: {
      input: {
        game: 'src/game/index.html',
      }
    },
    outDir: 'dist',
    assetsDir: '.',
  },
  server: {
    open: '/',
    port: 3000
  },

  publicDir: 'public',
  base: './',
  json: {
    stringify: true
  }
});
